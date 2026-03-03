/**
 * Map Departments: SQL Server DepartmentId → org_hierarchy + user_profiles.hierarchy_node_id
 *
 * Discovery results (2026-02-24):
 *   SQL Server TargetJobsDB.Departments:
 *     18: Auckland Perm      → Auckland Perm     (00000000-0000-0000-0000-000000000011)
 *     19: Welly Perm         → Wellington Perm   (00000000-0000-0000-0000-000000000021)
 *     20: Auckland Contract  → Auckland Contract (00000000-0000-0000-0000-000000000012)
 *     21: Welly Contract     → Wellington Contract (00000000-0000-0000-0000-000000000022)
 *     22: Leadership         → Leadership (team) (449c2c0c-4955-4779-974d-79e99d9a882b)
 *     23: Christchurch Perm  → Christchurch Perm (00000000-0000-0000-0000-000000000031)
 *     24: Christchurch Contract → Christchurch Contract (00000000-0000-0000-0000-000000000032)
 *     25: Dunedin Perm       → Dunedin Perm      (00000000-0000-0000-0000-000000000041)
 *     26: Dunedin Contract   → Dunedin Contract  (00000000-0000-0000-0000-000000000042)
 */

const sql = require('mssql');
const { createClient } = require('@supabase/supabase-js');

const SQL_CONFIG = {
  server: 'papjobsserver.database.windows.net',
  port: 1433,
  database: 'PAPJobs',
  user: 'PAPJAdmin',
  password: 'YiUIY^&*65$%6*876598TYit7',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 120000,
  },
};

const SUPABASE_URL = 'https://tappsgclmhepucyaclfd.supabase.co';
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcHBzZ2NsbWhlcHVjeWFjbGZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTExMjM0NiwiZXhwIjoyMDg2Njg4MzQ2fQ.XYRlCARuhjxyyd6C1FrXGufGLYNytOIhz-P4Hng_3qs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// Hardcoded mapping: SQL Server DepartmentId → org_hierarchy node UUID
// ============================================================================

const DEPARTMENT_TO_NODE = {
  '18': '00000000-0000-0000-0000-000000000011', // Auckland Perm
  '19': '00000000-0000-0000-0000-000000000021', // Wellington Perm (Welly Perm in SQL Server)
  '20': '00000000-0000-0000-0000-000000000012', // Auckland Contract
  '21': '00000000-0000-0000-0000-000000000022', // Wellington Contract (Welly Contract in SQL Server)
  '22': '449c2c0c-4955-4779-974d-79e99d9a882b', // Leadership
  '23': '00000000-0000-0000-0000-000000000031', // Christchurch Perm
  '24': '00000000-0000-0000-0000-000000000032', // Christchurch Contract
  '25': '00000000-0000-0000-0000-000000000041', // Dunedin Perm
  '26': '00000000-0000-0000-0000-000000000042', // Dunedin Contract
};

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

async function main() {
  console.log('='.repeat(60));
  console.log('POTENTIA CERTUS — DEPARTMENT MAPPING');
  console.log('='.repeat(60));

  const start = Date.now();

  console.log('\nConnecting to SQL Server...');
  const pool = await sql.connect(SQL_CONFIG);
  console.log('Connected.');

  // Step 1: Update org_hierarchy.bullhorn_department_id (skip national node for Leadership)
  console.log('\n[1] Updating org_hierarchy.bullhorn_department_id...');
  for (const [deptId, nodeId] of Object.entries(DEPARTMENT_TO_NODE)) {
    const { data, error } = await supabase
      .from('org_hierarchy')
      .update({ bullhorn_department_id: parseInt(deptId) })
      .eq('id', nodeId)
      .select('name');

    if (error) {
      console.error(`  ERROR dept ${deptId} → node ${nodeId}: ${error.message}`);
    } else {
      const name = data?.[0]?.name || nodeId;
      console.log(`  Dept ${deptId} → ${name}`);
    }
  }

  // Step 2: Fetch CorporateUsers with DepartmentId from SQL Server
  console.log('\n[2] Fetching CorporateUsers from SQL Server...');
  const result = await pool.request().query(
    `SELECT Id, Name, DepartmentId FROM TargetJobsDB.CorporateUsers WHERE DepartmentId IS NOT NULL`
  );
  console.log(`  ${result.recordset.length} users with DepartmentId`);

  // Step 3: Build profile lookup
  const profiles = await fetchAll('user_profiles', 'id, bullhorn_corporate_user_id, display_name');
  const profileByBullhornId = new Map();
  profiles.forEach((p) => {
    if (p.bullhorn_corporate_user_id != null) {
      profileByBullhornId.set(p.bullhorn_corporate_user_id, p);
    }
  });
  console.log(`  ${profileByBullhornId.size} profiles with bullhorn IDs`);

  // Step 4: Update user_profiles.hierarchy_node_id
  console.log('\n[3] Updating user_profiles.hierarchy_node_id...');
  let updated = 0, skipped = 0, notFound = 0;

  for (const user of result.recordset) {
    const nodeId = DEPARTMENT_TO_NODE[String(user.DepartmentId)];
    if (!nodeId) {
      console.log(`  SKIP: ${user.Name} (dept ${user.DepartmentId}) — no mapping`);
      skipped++;
      continue;
    }

    const profile = profileByBullhornId.get(user.Id);
    if (!profile) {
      console.log(`  NOT FOUND: ${user.Name} (bullhorn ID ${user.Id}) — no profile`);
      notFound++;
      continue;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ hierarchy_node_id: nodeId })
      .eq('id', profile.id);

    if (error) {
      console.error(`  ERROR: ${profile.display_name}: ${error.message}`);
    } else {
      updated++;
    }
  }

  console.log(`\n  Updated: ${updated}, Skipped: ${skipped}, Not in profiles: ${notFound}`);

  // Step 5: Verify
  console.log('\n[4] Verification...');
  const finalProfiles = await fetchAll('user_profiles', 'id, display_name, hierarchy_node_id, role');
  const withNode = finalProfiles.filter((p) => p.hierarchy_node_id != null);
  const withoutNode = finalProfiles.filter((p) => p.hierarchy_node_id == null);

  console.log(`  Profiles with hierarchy_node_id: ${withNode.length}/${finalProfiles.length}`);

  if (withoutNode.length > 0) {
    console.log(`  Profiles WITHOUT hierarchy_node_id:`);
    withoutNode.forEach((p) => console.log(`    ${p.display_name || p.id} (${p.role})`));
  }

  // Distribution by team
  const finalHierarchy = await fetchAll('org_hierarchy', 'id, name, hierarchy_level, bullhorn_department_id');
  const nodeNames = new Map();
  finalHierarchy.forEach((n) => nodeNames.set(n.id, n.name));

  const distribution = {};
  withNode.forEach((p) => {
    const name = nodeNames.get(p.hierarchy_node_id) || 'Unknown';
    distribution[name] = (distribution[name] || 0) + 1;
  });

  console.log('\n  Distribution by team:');
  Object.entries(distribution).sort().forEach(([name, count]) => {
    console.log(`    ${name}: ${count}`);
  });

  // Verify org_hierarchy bullhorn_department_id
  console.log('\n  Org hierarchy department mapping:');
  finalHierarchy
    .filter((n) => n.bullhorn_department_id != null)
    .forEach((n) => console.log(`    ${n.name}: dept ${n.bullhorn_department_id}`));

  await pool.close();
  console.log(`\nDone (${elapsed(start)})`);
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
