/**
 * Full Sync: SQL Server → Supabase PostgreSQL
 *
 * Reads all data from SQL Server (PAPJobs) and upserts into Supabase.
 * Uses service_role key to bypass RLS.
 *
 * Order of operations (respects FK constraints):
 *   1. client_corporations
 *   2. candidates (from Persons)
 *   3. job_orders (FK → client_corporations)
 *   4. activities (FK → candidates, job_orders) — via consultant bullhorn_id lookup
 *   5. placements (FK → candidates, job_orders)
 *   6. submission_status_log (needs Submissions join for candidate/job mapping)
 */

require('dotenv').config({ path: '.env.local' });

const sql = require('mssql');
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// Configuration
// ============================================================================

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// Helpers
// ============================================================================

const BATCH_SIZE = 500;
const PAGE_SIZE = 1000;

async function fetchAll(table, columns) {
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

async function upsertBatch(table, rows, conflictColumn) {
  if (rows.length === 0) return { inserted: 0, errors: 0 };

  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, {
      onConflict: conflictColumn,
      ignoreDuplicates: false,
    });

    if (error) {
      console.error(`  ERROR in ${table} batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}

async function logIngestionRun(runType, sourceTable, targetTable, stats, status, errorMsg) {
  await supabase.from('ingestion_runs').insert({
    run_type: runType,
    source_table: sourceTable,
    target_table: targetTable,
    records_processed: stats.processed || 0,
    records_inserted: stats.inserted || 0,
    records_updated: 0,
    records_failed: stats.errors || 0,
    status,
    error_message: errorMsg || null,
    completed_at: new Date().toISOString(),
  });
}

function elapsed(start) {
  return ((Date.now() - start) / 1000).toFixed(1) + 's';
}

// ============================================================================
// Lookup maps (built during sync for FK resolution)
// ============================================================================

// Maps bullhorn_id → supabase UUID for FK resolution
const lookups = {
  clientCorporations: new Map(), // bullhorn_id → uuid
  candidates: new Map(),         // bullhorn_id → uuid
  jobOrders: new Map(),          // bullhorn_id → uuid
  consultants: new Map(),        // bullhorn_corporate_user_id → uuid
  consultantsByNativeId: new Map(), // bullhorn_native_id (IdInDataSrc) → uuid
  activities: new Map(),         // bullhorn_id → uuid
};

// ============================================================================
// 0. Build consultant lookup from user_profiles
// ============================================================================

async function buildConsultantLookup() {
  console.log('\n[0] Building consultant lookup from user_profiles...');
  const data = await fetchAll('user_profiles', 'id, bullhorn_corporate_user_id, bullhorn_native_id');

  data
    .filter((u) => u.bullhorn_corporate_user_id != null)
    .forEach((u) => {
      lookups.consultants.set(u.bullhorn_corporate_user_id, u.id);
    });
  data
    .filter((u) => u.bullhorn_native_id != null)
    .forEach((u) => {
      lookups.consultantsByNativeId.set(u.bullhorn_native_id, u.id);
    });
  console.log(`  ${lookups.consultants.size} consultants mapped (${lookups.consultantsByNativeId.size} with native ID)`);
}

// ============================================================================
// 1. Client Corporations
// ============================================================================

async function syncClientCorporations(pool) {
  const start = Date.now();
  console.log('\n[1] Syncing client_corporations...');

  // Merge both sources: ClientCorpReport (primary) and TargetJobsDB (fills gaps)
  const reportResult = await pool.request().query(
    'SELECT Id, Name FROM ClientCorpReport.ClientCorporations'
  );
  const targetResult = await pool.request().query(
    'SELECT id AS Id, name AS Name FROM TargetJobsDB.ClientCorporations'
  );

  // Deduplicate by Id, preferring ClientCorpReport names
  const byId = new Map();
  for (const r of targetResult.recordset) {
    byId.set(r.Id, r.Name || 'Unknown');
  }
  for (const r of reportResult.recordset) {
    byId.set(r.Id, r.Name || 'Unknown');
  }

  const rows = Array.from(byId.entries()).map(([id, name]) => ({
    bullhorn_id: id,
    name,
    synced_at: new Date().toISOString(),
  }));

  console.log(`  Sources: ${reportResult.recordset.length} from ClientCorpReport, ${targetResult.recordset.length} from TargetJobsDB → ${rows.length} merged`);

  const stats = await upsertBatch('client_corporations', rows, 'bullhorn_id');
  console.log(`  ${stats.inserted} upserted, ${stats.errors} errors (${elapsed(start)})`);

  // Build lookup (paginated to handle >1000 rows)
  const ccData = await fetchAll('client_corporations', 'id, bullhorn_id');
  ccData.forEach((r) => lookups.clientCorporations.set(r.bullhorn_id, r.id));

  await logIngestionRun('full_sync', 'ClientCorpReport + TargetJobsDB.ClientCorporations', 'client_corporations',
    { processed: rows.length, inserted: stats.inserted, errors: stats.errors },
    stats.errors === 0 ? 'completed' : 'partial');

  return stats;
}

// ============================================================================
// 2. Candidates (from Persons)
// ============================================================================

async function syncCandidates(pool) {
  const start = Date.now();
  console.log('\n[2] Syncing candidates (from Persons)...');

  const result = await pool.request().query(
    `SELECT id, firstName, lastName, address1, address2, city, state, zip, JobTitle, _subtype
     FROM TargetJobsDB.Persons`
  );

  const rows = result.recordset.map((r) => ({
    bullhorn_id: r.id,
    first_name: r.firstName || null,
    last_name: r.lastName || null,
    address1: r.address1 || null,
    address2: r.address2 || null,
    city: r.city || null,
    state: r.state || null,
    zip: r.zip || null,
    occupation: r.JobTitle || null,
    // company_name: not available in mirror — need ClientContact→ClientCorporation link
    synced_at: new Date().toISOString(),
  }));

  const stats = await upsertBatch('candidates', rows, 'bullhorn_id');
  console.log(`  ${stats.inserted} upserted, ${stats.errors} errors (${elapsed(start)})`);

  // Build lookup (paginated to handle >1000 rows)
  const candData = await fetchAll('candidates', 'id, bullhorn_id');
  candData.forEach((r) => lookups.candidates.set(r.bullhorn_id, r.id));

  await logIngestionRun('full_sync', 'TargetJobsDB.Persons', 'candidates',
    { processed: rows.length, inserted: stats.inserted, errors: stats.errors },
    stats.errors === 0 ? 'completed' : 'partial');

  return stats;
}

// ============================================================================
// 3. Job Orders
// ============================================================================

async function syncJobOrders(pool) {
  const start = Date.now();
  console.log('\n[3] Syncing job_orders...');

  const result = await pool.request().query(
    `SELECT Id, Title, DateAdded, DateLastModified, ClientCorporationId, OwnerId, employmentType
     FROM TargetJobsDB.JobOrders`
  );

  const rows = result.recordset.map((r) => {
    // Map employment type to our enum
    let empType = null;
    if (r.employmentType) {
      const lower = r.employmentType.toLowerCase();
      if (lower.includes('perm')) empType = 'Permanent';
      else if (lower.includes('contract') || lower.includes('fixed')) empType = 'Contract';
    }

    return {
      bullhorn_id: r.Id,
      title: r.Title || 'Untitled',
      consultant_id: lookups.consultants.get(r.OwnerId) || null,
      client_corporation_id: lookups.clientCorporations.get(r.ClientCorporationId) || null,
      employment_type: empType,
      date_added: r.DateAdded ? new Date(r.DateAdded).toISOString() : null,
      date_last_modified: r.DateLastModified ? new Date(r.DateLastModified).toISOString() : null,
      synced_at: new Date().toISOString(),
    };
  });

  const stats = await upsertBatch('job_orders', rows, 'bullhorn_id');
  console.log(`  ${stats.inserted} upserted, ${stats.errors} errors (${elapsed(start)})`);

  // Build lookup (paginated to handle >1000 rows)
  const joData = await fetchAll('job_orders', 'id, bullhorn_id');
  joData.forEach((r) => lookups.jobOrders.set(r.bullhorn_id, r.id));

  await logIngestionRun('full_sync', 'TargetJobsDB.JobOrders', 'job_orders',
    { processed: rows.length, inserted: stats.inserted, errors: stats.errors },
    stats.errors === 0 ? 'completed' : 'partial');

  return stats;
}

// ============================================================================
// 4. Activities (from Notes WHERE isDeleted = 0)
// ============================================================================

async function syncActivities(pool) {
  const start = Date.now();
  console.log('\n[4] Syncing activities (from Notes)...');

  const result = await pool.request().query(
    `SELECT Id, action, dateAdded, CorporateUserId, personReferenceId, JobOrderId
     FROM TargetJobsDB.Notes
     WHERE isDeleted = 0`
  );

  const rows = result.recordset.map((r) => ({
    bullhorn_id: r.Id,
    activity_type: r.action || 'Unknown',
    // notes: comments column not available in SQL Server mirror
    consultant_id: lookups.consultants.get(r.CorporateUserId) || null,
    candidate_id: lookups.candidates.get(r.personReferenceId) || null,
    job_order_id: lookups.jobOrders.get(r.JobOrderId) || null,
    activity_date: new Date(r.dateAdded).toISOString(),
    synced_at: new Date().toISOString(),
  }));

  const stats = await upsertBatch('activities', rows, 'bullhorn_id');
  console.log(`  ${stats.inserted} upserted, ${stats.errors} errors (${elapsed(start)})`);

  // Build lookup for strategic_referrals (paginated to handle >1000 rows)
  const actData = await fetchAll('activities', 'id, bullhorn_id');
  actData.forEach((r) => lookups.activities.set(r.bullhorn_id, r.id));

  await logIngestionRun('full_sync', 'TargetJobsDB.Notes', 'activities',
    { processed: rows.length, inserted: stats.inserted, errors: stats.errors },
    stats.errors === 0 ? 'completed' : 'partial');

  return stats;
}

// ============================================================================
// 5. Placements
// ============================================================================

async function syncPlacements(pool) {
  const start = Date.now();
  console.log('\n[5] Syncing placements...');

  const result = await pool.request().query(
    `SELECT Id, OwnerId, CandidateId, DateAdded, Status, PlacementPutDate,
            DateBegin, EmploymentType, JobOrderId, Margin, SalaryUnit,
            DateEnd, fee, payRate, salary
     FROM TargetJobsDB.Placements`
  );

  const rows = result.recordset.map((r) => {
    // Map employment type to our enum
    let revenueType = 'contract';
    if (r.EmploymentType) {
      const lower = r.EmploymentType.toLowerCase();
      if (lower.includes('perm')) revenueType = 'permanent';
    }

    // For contract: Margin is GP per hour (or per day if SalaryUnit is Daily)
    // For perm: Margin is the actual fee amount (dollar value); fee is the fee percentage (do NOT use)
    let feeAmount = null;
    let gpPerHour = null;

    if (revenueType === 'permanent') {
      feeAmount = r.Margin || 0;
    } else {
      // For contract, Margin is GP; if SalaryUnit is Daily, convert to hourly (÷8)
      if (r.Margin) {
        gpPerHour =
          r.SalaryUnit && r.SalaryUnit.toLowerCase() === 'daily'
            ? r.Margin / 8
            : r.Margin;
      } else {
        gpPerHour = 0;
      }
    }

    // Handle sentinel dates (0001-01-01 means not set)
    const dateBegin = r.DateBegin && r.DateBegin.getFullYear() > 1900
      ? r.DateBegin.toISOString().split('T')[0]
      : null;
    const dateEnd = r.DateEnd && r.DateEnd.getFullYear() > 1900
      ? r.DateEnd.toISOString().split('T')[0]
      : null;
    const placementDate = r.DateAdded
      ? r.DateAdded.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    return {
      bullhorn_id: r.Id,
      consultant_id: lookups.consultants.get(r.OwnerId) || null,
      candidate_id: lookups.candidates.get(r.CandidateId) || null,
      job_order_id: lookups.jobOrders.get(r.JobOrderId) || null,
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

  const stats = await upsertBatch('placements', rows, 'bullhorn_id');
  console.log(`  ${stats.inserted} upserted, ${stats.errors} errors (${elapsed(start)})`);

  await logIngestionRun('full_sync', 'TargetJobsDB.Placements', 'placements',
    { processed: rows.length, inserted: stats.inserted, errors: stats.errors },
    stats.errors === 0 ? 'completed' : 'partial');

  return stats;
}

// ============================================================================
// 6. Submission Status Log (from SubmissionHistory + Submissions join)
// ============================================================================

async function syncSubmissionStatusLog(pool) {
  const start = Date.now();
  console.log('\n[6] Syncing submission_status_log...');

  // Join SubmissionHistory with Submissions to get candidate + job order IDs
  const result = await pool.request().query(
    `SELECT h.id AS history_id,
            h.SubmissionId,
            h.status,
            h.comments,
            h.dateAdded,
            h.CorporateUserId,
            COALESCE(s.PersonId, s.BadPersonId) AS CandidateId,
            s.JobOrderId
     FROM TargetJobsDB.SubmissionHistory h
     LEFT JOIN TargetJobsDB.Submissions s ON h.SubmissionId = s.Id`
  );

  const rows = result.recordset.map((r) => ({
    bullhorn_submission_id: r.SubmissionId,
    bullhorn_submission_history_id: r.history_id,
    candidate_id: lookups.candidates.get(r.CandidateId) || null,
    job_order_id: lookups.jobOrders.get(r.JobOrderId) || null,
    consultant_id: lookups.consultants.get(r.CorporateUserId) || null,
    status_to: r.status || 'Unknown',
    detected_at: new Date(r.dateAdded).toISOString(),
    comments: r.comments || null,
    synced_at: new Date().toISOString(),
  }));

  const stats = await upsertBatch('submission_status_log', rows, 'bullhorn_submission_history_id');
  console.log(`  ${stats.inserted} upserted, ${stats.errors} errors (${elapsed(start)})`);

  await logIngestionRun('full_sync', 'TargetJobsDB.SubmissionHistory', 'submission_status_log',
    { processed: rows.length, inserted: stats.inserted, errors: stats.errors },
    stats.errors === 0 ? 'completed' : 'partial');

  return stats;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('POTENTIA CERTUS — FULL SYNC');
  console.log('SQL Server → Supabase PostgreSQL');
  console.log('='.repeat(60));

  const totalStart = Date.now();

  // Connect to SQL Server
  console.log('\nConnecting to SQL Server...');
  const pool = await sql.connect(SQL_CONFIG);
  console.log('Connected.');

  // Build consultant lookup first
  await buildConsultantLookup();

  // Run sync in FK-safe order
  const results = {};
  results.clientCorporations = await syncClientCorporations(pool);
  results.candidates = await syncCandidates(pool);
  results.jobOrders = await syncJobOrders(pool);
  results.activities = await syncActivities(pool);
  results.placements = await syncPlacements(pool);
  results.submissionStatusLog = await syncSubmissionStatusLog(pool);

  // Close SQL Server connection
  await pool.close();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SYNC COMPLETE');
  console.log('='.repeat(60));

  let totalInserted = 0;
  let totalErrors = 0;
  for (const [table, stats] of Object.entries(results)) {
    console.log(`  ${table.padEnd(30)} ${String(stats.inserted).padStart(6)} ok  ${String(stats.errors).padStart(4)} err`);
    totalInserted += stats.inserted;
    totalErrors += stats.errors;
  }

  console.log('  ' + '-'.repeat(44));
  console.log(`  ${'TOTAL'.padEnd(30)} ${String(totalInserted).padStart(6)} ok  ${String(totalErrors).padStart(4)} err`);
  console.log(`\nElapsed: ${elapsed(totalStart)}`);

  if (totalErrors > 0) {
    console.log('\nWARNING: Some records failed. Check ingestion_runs table for details.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
