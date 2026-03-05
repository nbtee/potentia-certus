/**
 * Backfill bullhorn_native_id + re-sync job_orders & placements
 *
 * 1. Fetches Id, IdInDataSrc from SQL Server CorporateUsers
 * 2. Updates each user_profile's bullhorn_native_id where bullhorn_corporate_user_id matches Id
 * 3. Re-syncs job_orders with the fixed OwnerId → consultantsByNativeId lookup
 * 4. Re-syncs placements with the same fix
 *
 * Prerequisites:
 *   - Migration 20260302000000_add_bullhorn_native_id.sql must be applied
 *   - SQL Server firewall must allow this IP
 */

require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');
const { createClient } = require('@supabase/supabase-js');

const SQL_CONFIG = {
  server: process.env.SQL_SERVER_HOST,
  port: 1433,
  database: process.env.SQL_SERVER_DATABASE,
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 120000,
  },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const BATCH_SIZE = 500;

function elapsed(start) {
  return ((Date.now() - start) / 1000).toFixed(1) + 's';
}

async function fetchAll(table, columns) {
  const PAGE_SIZE = 1000;
  const allRows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) { console.error(`  Error fetching ${table}: ${error.message}`); break; }
    allRows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return allRows;
}

// ============================================================================
// Step 1: Backfill bullhorn_native_id
// ============================================================================

async function backfillNativeIds(pool) {
  console.log('\n' + '='.repeat(50));
  console.log('STEP 1: Backfill bullhorn_native_id');
  console.log('='.repeat(50));

  // Fetch Id → IdInDataSrc mapping from SQL Server
  const result = await pool.request().query(
    `SELECT Id, IdInDataSrc FROM TargetJobsDB.CorporateUsers`
  );
  console.log(`Fetched ${result.recordset.length} corporate users from SQL Server`);

  // Build a map: SQL Server Id → IdInDataSrc
  const idToNativeId = new Map();
  for (const row of result.recordset) {
    if (row.IdInDataSrc != null) {
      idToNativeId.set(row.Id, row.IdInDataSrc);
    }
  }
  console.log(`${idToNativeId.size} users have IdInDataSrc values`);

  // Fetch all user_profiles with bullhorn_corporate_user_id
  const profiles = await fetchAll('user_profiles', 'id, bullhorn_corporate_user_id, bullhorn_native_id');
  const needsUpdate = profiles.filter(
    (p) => p.bullhorn_corporate_user_id != null && p.bullhorn_native_id == null
  );
  console.log(`${needsUpdate.length} profiles need bullhorn_native_id backfill`);

  let updated = 0, skipped = 0, errors = 0;

  for (const profile of needsUpdate) {
    const nativeId = idToNativeId.get(profile.bullhorn_corporate_user_id);
    if (nativeId == null) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ bullhorn_native_id: nativeId })
      .eq('id', profile.id);

    if (error) {
      console.error(`  ERROR updating ${profile.id}: ${error.message}`);
      errors++;
    } else {
      updated++;
    }
  }

  console.log(`\nResults: ${updated} updated, ${skipped} skipped (no IdInDataSrc), ${errors} errors`);

  // Verify
  const final = await fetchAll('user_profiles', 'id, bullhorn_native_id');
  const withNativeId = final.filter((p) => p.bullhorn_native_id != null);
  console.log(`Final: ${withNativeId.length}/${final.length} profiles have bullhorn_native_id`);

  return withNativeId.length;
}

// ============================================================================
// Step 2: Re-sync job_orders with fixed OwnerId lookup
// ============================================================================

async function resyncJobOrders(pool) {
  console.log('\n' + '='.repeat(50));
  console.log('STEP 2: Re-sync Job Orders (with native ID lookup)');
  console.log('='.repeat(50));

  const start = Date.now();

  // Build lookups
  const consultantsByNativeId = new Map();
  const users = await fetchAll('user_profiles', 'id, bullhorn_native_id');
  users.filter((u) => u.bullhorn_native_id != null)
    .forEach((u) => consultantsByNativeId.set(u.bullhorn_native_id, u.id));
  console.log(`  ${consultantsByNativeId.size} consultants with native ID`);

  const clientCorps = new Map();
  const ccData = await fetchAll('client_corporations', 'id, bullhorn_id');
  ccData.forEach((r) => clientCorps.set(r.bullhorn_id, r.id));

  // Fetch from SQL Server
  console.log('Fetching JobOrders...');
  const result = await pool.request().query(
    `SELECT Id, Title, DateAdded, DateLastModified, ClientCorporationId, OwnerId, employmentType
     FROM TargetJobsDB.JobOrders`
  );
  console.log(`Fetched ${result.recordset.length} rows`);

  let matchedConsultant = 0;
  const rows = result.recordset.map((r) => {
    let empType = null;
    if (r.employmentType) {
      const lower = r.employmentType.toLowerCase();
      if (lower.includes('perm')) empType = 'Permanent';
      else if (lower.includes('contract') || lower.includes('fixed')) empType = 'Contract';
    }

    const consultantId = consultantsByNativeId.get(r.OwnerId) || null;
    if (consultantId) matchedConsultant++;

    return {
      bullhorn_id: r.Id,
      title: r.Title || 'Untitled',
      consultant_id: consultantId,
      client_corporation_id: clientCorps.get(r.ClientCorporationId) || null,
      employment_type: empType,
      date_added: r.DateAdded ? new Date(r.DateAdded).toISOString() : null,
      date_last_modified: r.DateLastModified ? new Date(r.DateLastModified).toISOString() : null,
      synced_at: new Date().toISOString(),
    };
  });

  console.log(`  Consultant match: ${matchedConsultant}/${rows.length} (${(matchedConsultant / rows.length * 100).toFixed(1)}%)`);

  // Upsert (not delete+insert — preserves UUIDs for FK references)
  let inserted = 0, errors = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('job_orders').upsert(batch, {
      onConflict: 'bullhorn_id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`  ERROR batch: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  Result: ${inserted} upserted, ${errors} errors (${elapsed(start)})`);
  return { inserted, errors };
}

// ============================================================================
// Step 3: Re-sync placements with fixed OwnerId lookup
// ============================================================================

async function resyncPlacements(pool) {
  console.log('\n' + '='.repeat(50));
  console.log('STEP 3: Re-sync Placements (with native ID lookup)');
  console.log('='.repeat(50));

  const start = Date.now();

  // Build lookups
  const consultantsByNativeId = new Map();
  const users = await fetchAll('user_profiles', 'id, bullhorn_native_id');
  users.filter((u) => u.bullhorn_native_id != null)
    .forEach((u) => consultantsByNativeId.set(u.bullhorn_native_id, u.id));

  const candidates = new Map();
  const candData = await fetchAll('candidates', 'id, bullhorn_id');
  candData.forEach((r) => candidates.set(r.bullhorn_id, r.id));

  const jobOrders = new Map();
  const joData = await fetchAll('job_orders', 'id, bullhorn_id');
  joData.forEach((r) => jobOrders.set(r.bullhorn_id, r.id));

  // Fetch from SQL Server
  console.log('Fetching Placements...');
  const result = await pool.request().query(
    `SELECT Id, OwnerId, CandidateId, DateAdded, Status, PlacementPutDate,
            DateBegin, EmploymentType, JobOrderId, Margin, SalaryUnit,
            DateEnd, fee, payRate, salary
     FROM TargetJobsDB.Placements`
  );
  console.log(`Fetched ${result.recordset.length} rows`);

  let matchedConsultant = 0;
  const rows = result.recordset.map((r) => {
    let revenueType = 'contract';
    if (r.EmploymentType) {
      const lower = r.EmploymentType.toLowerCase();
      if (lower.includes('perm') || lower.includes('direct')) revenueType = 'permanent';
    }

    let feeAmount = null, gpPerHour = null;
    if (revenueType === 'permanent') {
      feeAmount = r.fee || r.Margin || r.salary || 0;
    } else {
      gpPerHour = r.Margin
        ? (r.SalaryUnit && r.SalaryUnit.toLowerCase() === 'daily' ? r.Margin / 8 : r.Margin)
        : 0;
    }

    const dateBegin = r.DateBegin && r.DateBegin.getFullYear() > 1900
      ? r.DateBegin.toISOString().split('T')[0] : null;
    const dateEnd = r.DateEnd && r.DateEnd.getFullYear() > 1900
      ? r.DateEnd.toISOString().split('T')[0] : null;
    const placementDate = r.DateAdded
      ? r.DateAdded.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const consultantId = consultantsByNativeId.get(r.OwnerId) || null;
    if (consultantId) matchedConsultant++;

    return {
      bullhorn_id: r.Id,
      consultant_id: consultantId,
      candidate_id: candidates.get(r.CandidateId) || null,
      job_order_id: jobOrders.get(r.JobOrderId) || null,
      revenue_type: revenueType,
      fee_amount: feeAmount,
      gp_per_hour: gpPerHour,
      candidate_salary: r.salary || null,
      start_date: dateBegin,
      end_date: dateEnd,
      placement_date: placementDate,
      metadata: {
        status: r.Status,
        salary_unit: r.SalaryUnit,
        pay_rate: r.payRate,
        employment_type_raw: r.EmploymentType,
      },
      synced_at: new Date().toISOString(),
    };
  });

  console.log(`  Consultant match: ${matchedConsultant}/${rows.length} (${(matchedConsultant / rows.length * 100).toFixed(1)}%)`);

  // Upsert
  let inserted = 0, errors = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('placements').upsert(batch, {
      onConflict: 'bullhorn_id',
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`  ERROR batch: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  Result: ${inserted} upserted, ${errors} errors (${elapsed(start)})`);
  return { inserted, errors };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('BACKFILL bullhorn_native_id + RE-SYNC job_orders & placements');
  console.log('='.repeat(60));

  const totalStart = Date.now();

  console.log('\nConnecting to SQL Server...');
  const pool = await sql.connect(SQL_CONFIG);
  console.log('Connected.');

  // Step 1: Backfill native IDs
  const nativeIdCount = await backfillNativeIds(pool);

  // Step 2: Re-sync job_orders
  const jobResult = await resyncJobOrders(pool);

  // Step 3: Re-sync placements
  const placementResult = await resyncPlacements(pool);

  await pool.close();

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Users with native ID:   ${nativeIdCount}`);
  console.log(`  Job Orders:             ${jobResult.inserted} ok, ${jobResult.errors} err`);
  console.log(`  Placements:             ${placementResult.inserted} ok, ${placementResult.errors} err`);
  console.log(`\n  Total elapsed: ${elapsed(totalStart)}`);
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
