/**
 * Bullhorn Enrichment: Bullhorn REST API → SQL Server
 *
 * Pulls missing fields from the Bullhorn REST API and writes them
 * into the SQL Server mirror tables. The existing sync pipeline
 * (Azure Function / full-sync.js) then brings them into Supabase.
 *
 * Fields enriched:
 *   - Placements:      customInt2, hoursPerDay, status
 *   - Notes:           comments
 *   - JobOrders:       status
 *   - CorporateUsers:  enabled, isDeleted, isLockedOut
 *   - ClientContacts:  clientCorporationId (new mapping table)
 *
 * Usage:
 *   node scripts/bullhorn-enrich.js
 *   node scripts/bullhorn-enrich.js --entity=placements
 *   node scripts/bullhorn-enrich.js --entity=notes
 */

require('dotenv').config({ path: '.env.local' });

const sql = require('mssql');

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

const BULLHORN = {
  clientId: process.env.BULLHORN_CLIENT_ID,
  clientSecret: process.env.BULLHORN_CLIENT_SECRET,
  username: process.env.BULLHORN_USERNAME,
  password: process.env.BULLHORN_PASSWORD,
};

// Bullhorn API limits
const BH_BATCH_SIZE = 500; // max entities per multi-fetch
const BH_SEARCH_SIZE = 500; // max results per search call
const SQL_BATCH_SIZE = 500; // rows per SQL UPDATE batch
const RATE_LIMIT_DELAY = 250; // ms between API calls

// ============================================================================
// Bullhorn Auth
// ============================================================================

async function bullhornAuth() {
  console.log('Authenticating with Bullhorn...');

  // Step 1: Get regional URLs via loginInfo
  const infoResp = await fetch(
    'https://rest.bullhornstaffing.com/rest-services/loginInfo?username=' +
      encodeURIComponent(BULLHORN.username)
  );
  const info = await infoResp.json();
  const oauthBase = info.oauthUrl; // e.g. https://auth-aus.bullhornstaffing.com/oauth
  const restBase = info.restUrl; // e.g. https://rest-aus.bullhornstaffing.com/rest-services

  // Step 2: Get authorization code
  const authResp = await fetch(
    oauthBase +
      '/authorize?' +
      new URLSearchParams({
        client_id: BULLHORN.clientId,
        response_type: 'code',
        username: BULLHORN.username,
        password: BULLHORN.password,
        action: 'Login',
      }),
    { redirect: 'manual' }
  );

  const location = authResp.headers.get('location');
  if (!location) {
    throw new Error('Bullhorn auth failed — no redirect. Status: ' + authResp.status);
  }
  const code = new URL(location).searchParams.get('code');
  if (!code) {
    throw new Error('Bullhorn auth failed — no code in redirect: ' + location);
  }

  // Step 3: Exchange code for access token
  const tokenResp = await fetch(oauthBase + '/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: BULLHORN.clientId,
      client_secret: BULLHORN.clientSecret,
    }),
  });
  const tokenData = await tokenResp.json();
  if (tokenData.error) {
    throw new Error('Bullhorn token error: ' + JSON.stringify(tokenData));
  }

  // Step 4: REST login to get session token + swimlane URL
  const loginResp = await fetch(
    restBase + '/login?version=*&access_token=' + tokenData.access_token
  );
  const loginData = await loginResp.json();
  if (!loginData.restUrl || !loginData.BhRestToken) {
    throw new Error('Bullhorn REST login failed: ' + JSON.stringify(loginData));
  }

  console.log('  Authenticated. REST URL: ' + loginData.restUrl);

  return {
    restUrl: loginData.restUrl,
    token: loginData.BhRestToken,
    refreshToken: tokenData.refresh_token,
    oauthBase,
  };
}

// ============================================================================
// Bullhorn API Helpers
// ============================================================================

async function refreshBullhornSession(bh) {
  console.log('\n  Refreshing Bullhorn session...');
  const tokenResp = await fetch(bh.oauthBase + '/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: bh.refreshToken,
      client_id: BULLHORN.clientId,
      client_secret: BULLHORN.clientSecret,
    }),
  });
  const tokenData = await tokenResp.json();
  if (tokenData.error) {
    throw new Error('Bullhorn refresh failed: ' + JSON.stringify(tokenData));
  }

  const infoResp = await fetch('https://rest.bullhornstaffing.com/rest-services/loginInfo?username=' + encodeURIComponent(BULLHORN.username));
  const info = await infoResp.json();

  const loginResp = await fetch(info.restUrl + '/login?version=*&access_token=' + tokenData.access_token);
  const loginData = await loginResp.json();
  if (!loginData.restUrl || !loginData.BhRestToken) {
    throw new Error('Bullhorn REST re-login failed: ' + JSON.stringify(loginData));
  }

  bh.token = loginData.BhRestToken;
  bh.restUrl = loginData.restUrl;
  bh.refreshToken = tokenData.refresh_token;
  console.log('  Session refreshed.');
}

async function bhFetch(bh, path) {
  const url = bh.restUrl + path + (path.includes('?') ? '&' : '?') + 'BhRestToken=' + bh.token;
  const resp = await fetch(url);

  if (resp.status === 401) {
    // Try refresh once before failing
    await refreshBullhornSession(bh);
    const retryUrl = bh.restUrl + path + (path.includes('?') ? '&' : '?') + 'BhRestToken=' + bh.token;
    const retryResp = await fetch(retryUrl);
    if (retryResp.status === 401) {
      throw new Error('Bullhorn session expired after refresh. Re-run the script.');
    }
    return retryResp.json();
  }

  if (resp.status === 429) {
    console.log('    Rate limited — waiting 2s...');
    await sleep(2000);
    return bhFetch(bh, path);
  }

  const data = await resp.json();
  if (data.errorMessage) {
    throw new Error('Bullhorn API error: ' + data.errorMessage);
  }
  return data;
}

/**
 * Fetch entities by IDs in batches of BH_BATCH_SIZE using the multi-entity endpoint.
 * Returns a Map of id → entity data.
 */
async function bhMultiFetch(bh, entityType, ids, fields) {
  const results = new Map();
  const fieldStr = fields.join(',');

  for (let i = 0; i < ids.length; i += BH_BATCH_SIZE) {
    const batch = ids.slice(i, i + BH_BATCH_SIZE);
    const idStr = batch.join(',');
    const data = await bhFetch(bh, `entity/${entityType}/${idStr}?fields=${fieldStr}`);

    if (data.data) {
      for (const entity of data.data) {
        results.set(entity.id, entity);
      }
    }

    const pct = Math.min(100, Math.round(((i + batch.length) / ids.length) * 100));
    process.stdout.write(`\r  Fetched ${results.size}/${ids.length} ${entityType} records (${pct}%)`);
    if (i + BH_BATCH_SIZE < ids.length) await sleep(RATE_LIMIT_DELAY);
  }
  console.log();
  return results;
}

/**
 * Fetch all entities matching a search/query, paginating through results.
 * Returns an array of entity objects.
 */
async function bhSearchAll(bh, entityType, query, fields) {
  const results = [];
  const fieldStr = fields.join(',');
  let start = 0;

  while (true) {
    const data = await bhFetch(
      bh,
      `search/${entityType}?query=${encodeURIComponent(query)}&fields=${fieldStr}&count=${BH_SEARCH_SIZE}&start=${start}`
    );

    if (data.data) results.push(...data.data);

    const total = data.total || 0;
    const pct = total > 0 ? Math.min(100, Math.round(((start + (data.data?.length || 0)) / total) * 100)) : 100;
    process.stdout.write(`\r  Fetched ${results.length}/${total} ${entityType} records (${pct}%)`);

    if (!data.data || data.data.length < BH_SEARCH_SIZE || results.length >= total) break;
    start += BH_SEARCH_SIZE;
    await sleep(RATE_LIMIT_DELAY);
  }
  console.log();
  return results;
}

/**
 * Fetch all entities via /query endpoint (JPQL), paginating through results.
 */
async function bhQueryAll(bh, entityType, where, fields) {
  const results = [];
  const fieldStr = fields.join(',');
  let start = 0;

  while (true) {
    const data = await bhFetch(
      bh,
      `query/${entityType}?where=${encodeURIComponent(where)}&fields=${fieldStr}&count=${BH_SEARCH_SIZE}&start=${start}`
    );

    if (data.data) results.push(...data.data);

    const total = data.total || 0;
    process.stdout.write(`\r  Fetched ${results.length}/${total} ${entityType} records`);

    if (!data.data || data.data.length < BH_SEARCH_SIZE || results.length >= total) break;
    start += BH_SEARCH_SIZE;
    await sleep(RATE_LIMIT_DELAY);
  }
  console.log();
  return results;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function elapsed(start) {
  return ((Date.now() - start) / 1000).toFixed(1) + 's';
}

// ============================================================================
// SQL Server Column Management
// ============================================================================

async function ensureColumn(pool, schema, table, column, sqlType) {
  const result = await pool.request().query(`
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'
  `);
  if (result.recordset.length === 0) {
    console.log(`  Adding column ${schema}.${table}.${column} (${sqlType})...`);
    await pool.request().query(`ALTER TABLE [${schema}].[${table}] ADD [${column}] ${sqlType} NULL`);
  }
}

async function ensureTable(pool, schema, table, createSql) {
  const result = await pool.request().query(`
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${table}'
  `);
  if (result.recordset.length === 0) {
    console.log(`  Creating table ${schema}.${table}...`);
    await pool.request().query(createSql);
  }
}

// ============================================================================
// SQL Write Helpers (concurrent parameterized updates)
// ============================================================================

const CONCURRENCY = 20; // parallel SQL queries

function getSqlType(type) {
  switch (type) {
    case 'INT': return sql.Int;
    case 'BIT': return sql.Bit;
    case 'DECIMAL': return sql.Decimal(10, 2);
    case 'NVARCHAR': return sql.NVarChar(sql.MAX);
    default: return sql.NVarChar(sql.MAX);
  }
}

/**
 * Run parameterized UPDATE queries with concurrency limit.
 * Each row gets its own parameterized query — safe for any content.
 */
async function bulkUpdate(pool, targetTable, idColumn, entities, columnDefs) {
  if (entities.length === 0) return 0;

  let updated = 0;
  let completed = 0;

  // Process in concurrent batches
  for (let i = 0; i < entities.length; i += CONCURRENCY) {
    const batch = entities.slice(i, i + CONCURRENCY);
    const promises = batch.map((row) => {
      const req = pool.request();
      req.input('id', sql.Int, row.id);
      columnDefs.forEach((col, idx) => {
        req.input('v' + idx, getSqlType(col.type), row[col.src] ?? null);
      });
      const sets = columnDefs.map((c, idx) => `[${c.dest}] = @v${idx}`).join(', ');
      const [schema, tbl] = targetTable.includes('.') ? targetTable.split('.') : [null, targetTable];
      const fqn = schema ? `[${schema}].[${tbl}]` : `[${tbl}]`;
      return req.query(`UPDATE ${fqn} SET ${sets} WHERE [${idColumn}] = @id`);
    });

    const results = await Promise.all(promises);
    updated += results.reduce((sum, r) => sum + (r.rowsAffected?.[0] || 0), 0);
    completed += batch.length;

    const pct = Math.min(100, Math.round((completed / entities.length) * 100));
    process.stdout.write(`\r  Writing to SQL Server: ${completed}/${entities.length} (${pct}%)`);
  }
  console.log();
  return updated;
}

/**
 * Concurrent parameterized MERGE for upserts (new tables).
 */
async function bulkUpsert(pool, targetTable, idColumn, entities, columnDefs) {
  if (entities.length === 0) return 0;

  let updated = 0;
  let completed = 0;
  const selectCols = columnDefs.map((c) => `[${c.dest}]`).join(', ');

  for (let i = 0; i < entities.length; i += CONCURRENCY) {
    const batch = entities.slice(i, i + CONCURRENCY);
    const promises = batch.map((row) => {
      const req = pool.request();
      req.input('id', sql.Int, row.id);
      columnDefs.forEach((col, idx) => {
        req.input('v' + idx, getSqlType(col.type), row[col.src] ?? null);
      });
      const [schema, tbl] = targetTable.includes('.') ? targetTable.split('.') : [null, targetTable];
      const fqn = schema ? `[${schema}].[${tbl}]` : `[${tbl}]`;
      const updateSets = columnDefs.map((c, idx) => `target.[${c.dest}] = @v${idx}`).join(', ');
      const insertVals = columnDefs.map((c, idx) => `@v${idx}`).join(', ');
      return req.query(`
        MERGE ${fqn} AS target
        USING (SELECT @id AS [${idColumn}]) AS source ON target.[${idColumn}] = source.[${idColumn}]
        WHEN MATCHED THEN UPDATE SET ${updateSets}
        WHEN NOT MATCHED THEN INSERT ([${idColumn}], ${selectCols}) VALUES (@id, ${insertVals});
      `);
    });

    const results = await Promise.all(promises);
    updated += results.reduce((sum, r) => sum + (r.rowsAffected?.[0] || 0), 0);
    completed += batch.length;

    const pct = Math.min(100, Math.round((completed / entities.length) * 100));
    process.stdout.write(`\r  Writing to SQL Server: ${completed}/${entities.length} (${pct}%)`);
  }
  console.log();
  return updated;
}

// ============================================================================
// Entity Enrichment Functions
// ============================================================================

async function enrichPlacements(bh, pool) {
  const start = Date.now();
  console.log('\n[1/5] Enriching Placements (customInt2, hoursPerDay, status)...');

  await ensureColumn(pool, 'TargetJobsDB', 'Placements', 'customInt2', 'INT');
  await ensureColumn(pool, 'TargetJobsDB', 'Placements', 'hoursPerDay', 'DECIMAL(10,2)');

  const idResult = await pool.request().query('SELECT Id FROM TargetJobsDB.Placements');
  const ids = idResult.recordset.map((r) => r.Id);
  console.log(`  ${ids.length} placements to enrich`);
  if (ids.length === 0) return { updated: 0 };

  const entities = await bhMultiFetch(bh, 'Placement', ids, ['id', 'customInt2', 'hoursPerDay', 'status']);

  const rows = Array.from(entities.values()).map((e) => ({
    id: e.id,
    customInt2: e.customInt2 ?? null,
    hoursPerDay: e.hoursPerDay ?? null,
    status: e.status ?? null,
  }));

  const updated = await bulkUpdate(pool, 'TargetJobsDB.Placements', 'Id', rows, [
    { src: 'customInt2', dest: 'customInt2', type: 'INT' },
    { src: 'hoursPerDay', dest: 'hoursPerDay', type: 'DECIMAL' },
    { src: 'status', dest: 'Status', type: 'NVARCHAR' },
  ]);

  console.log(`  ${updated} placements updated (${elapsed(start)})`);
  return { updated };
}

async function enrichNotes(bh, pool) {
  const start = Date.now();
  console.log('\n[2/5] Enriching Notes (comments)...');

  await ensureColumn(pool, 'TargetJobsDB', 'Notes', 'comments', 'NVARCHAR(MAX)');

  const idResult = await pool.request().query('SELECT Id FROM TargetJobsDB.Notes WHERE isDeleted = 0');
  const ids = idResult.recordset.map((r) => r.Id);
  console.log(`  ${ids.length} notes to enrich`);
  if (ids.length === 0) return { updated: 0 };

  const entities = await bhMultiFetch(bh, 'Note', ids, ['id', 'comments']);

  const rows = Array.from(entities.values())
    .filter((e) => e.comments)
    .map((e) => ({
      id: e.id,
      comments: e.comments,
    }));

  console.log(`  ${rows.length} notes have comments`);

  const updated = await bulkUpdate(pool, 'TargetJobsDB.Notes', 'Id', rows, [
    { src: 'comments', dest: 'comments', type: 'NVARCHAR' },
  ]);

  console.log(`  ${updated} notes updated (${elapsed(start)})`);
  return { updated };
}

async function enrichJobOrders(bh, pool) {
  const start = Date.now();
  console.log('\n[3/5] Enriching JobOrders (status)...');

  await ensureColumn(pool, 'TargetJobsDB', 'JobOrders', 'Status', 'NVARCHAR(200)');

  const idResult = await pool.request().query('SELECT Id FROM TargetJobsDB.JobOrders');
  const ids = idResult.recordset.map((r) => r.Id);
  console.log(`  ${ids.length} job orders to enrich`);
  if (ids.length === 0) return { updated: 0 };

  const entities = await bhMultiFetch(bh, 'JobOrder', ids, ['id', 'status']);

  const rows = Array.from(entities.values()).map((e) => ({
    id: e.id,
    status: e.status ?? null,
  }));

  const updated = await bulkUpdate(pool, 'TargetJobsDB.JobOrders', 'Id', rows, [
    { src: 'status', dest: 'Status', type: 'NVARCHAR' },
  ]);

  console.log(`  ${updated} job orders updated (${elapsed(start)})`);
  return { updated };
}

async function enrichCorporateUsers(bh, pool) {
  const start = Date.now();
  console.log('\n[4/5] Enriching CorporateUsers (enabled, isDeleted, isLockedOut)...');

  await ensureColumn(pool, 'TargetJobsDB', 'CorporateUsers', 'Enabled', 'BIT');
  await ensureColumn(pool, 'TargetJobsDB', 'CorporateUsers', 'IsDeleted', 'BIT');
  await ensureColumn(pool, 'TargetJobsDB', 'CorporateUsers', 'IsLockedOut', 'BIT');

  const bhUsers = await bhQueryAll(bh, 'CorporateUser', 'id>0', [
    'id', 'enabled', 'isDeleted', 'isLockedOut',
  ]);

  // SQL Server mirror Id = Bullhorn entity id
  const idResult = await pool.request().query('SELECT Id FROM TargetJobsDB.CorporateUsers');
  const sqlIds = new Set(idResult.recordset.map((r) => r.Id));

  const rows = bhUsers
    .filter((u) => sqlIds.has(u.id))
    .map((u) => ({
      id: u.id,
      enabled: u.enabled ? 1 : 0,
      isDeleted: u.isDeleted ? 1 : 0,
      isLockedOut: u.isLockedOut ? 1 : 0,
    }));

  const updated = await bulkUpdate(pool, 'TargetJobsDB.CorporateUsers', 'Id', rows, [
    { src: 'enabled', dest: 'Enabled', type: 'BIT' },
    { src: 'isDeleted', dest: 'IsDeleted', type: 'BIT' },
    { src: 'isLockedOut', dest: 'IsLockedOut', type: 'BIT' },
  ]);

  console.log(`  ${bhUsers.length} Bullhorn users fetched, ${updated} SQL Server rows updated (${elapsed(start)})`);
  return { updated };
}

async function enrichClientContacts(bh, pool) {
  const start = Date.now();
  console.log('\n[5/5] Enriching ClientContacts (clientCorporationId)...');

  await ensureTable(
    pool,
    'TargetJobsDB',
    'ClientContactCorporations',
    `CREATE TABLE TargetJobsDB.ClientContactCorporations (
      ClientContactId INT PRIMARY KEY,
      ClientCorporationId INT NOT NULL
    )`
  );

  const contacts = await bhSearchAll(bh, 'ClientContact', 'isDeleted:false', [
    'id', 'clientCorporation',
  ]);

  const rows = contacts
    .filter((c) => c.clientCorporation?.id)
    .map((c) => ({
      id: c.id,
      corpId: c.clientCorporation.id,
    }));

  const updated = await bulkUpsert(pool, 'TargetJobsDB.ClientContactCorporations', 'ClientContactId', rows, [
    { src: 'corpId', dest: 'ClientCorporationId', type: 'INT' },
  ]);

  console.log(`  ${contacts.length} contacts fetched, ${updated} mappings written (${elapsed(start)})`);
  return { updated };
}

// ============================================================================
// Main
// ============================================================================

const ENTITY_MAP = {
  placements: enrichPlacements,
  notes: enrichNotes,
  joborders: enrichJobOrders,
  corporateusers: enrichCorporateUsers,
  clientcontacts: enrichClientContacts,
};

async function main() {
  console.log('='.repeat(60));
  console.log('POTENTIA CERTUS — BULLHORN ENRICHMENT');
  console.log('Bullhorn REST API → SQL Server');
  console.log('='.repeat(60));

  const totalStart = Date.now();

  // Parse --entity flag
  const entityArg = process.argv.find((a) => a.startsWith('--entity='));
  const targetEntity = entityArg ? entityArg.split('=')[1].toLowerCase() : null;

  if (targetEntity && !ENTITY_MAP[targetEntity]) {
    console.error(`Unknown entity: ${targetEntity}`);
    console.error('Valid entities: ' + Object.keys(ENTITY_MAP).join(', '));
    process.exit(1);
  }

  // Validate env vars
  for (const key of ['BULLHORN_CLIENT_ID', 'BULLHORN_CLIENT_SECRET', 'BULLHORN_USERNAME', 'BULLHORN_PASSWORD']) {
    if (!process.env[key]) {
      console.error(`Missing env var: ${key}`);
      process.exit(1);
    }
  }

  // Authenticate with Bullhorn
  const bh = await bullhornAuth();

  // Connect to SQL Server
  console.log('\nConnecting to SQL Server...');
  const pool = await sql.connect(SQL_CONFIG);
  console.log('Connected.');

  // Run enrichments
  const results = {};
  const entitiesToRun = targetEntity
    ? { [targetEntity]: ENTITY_MAP[targetEntity] }
    : ENTITY_MAP;

  for (const [name, fn] of Object.entries(entitiesToRun)) {
    try {
      results[name] = await fn(bh, pool);
    } catch (err) {
      console.error(`  ERROR in ${name}: ${err.message || err}`);
      if (err.stack) console.error(err.stack);
      results[name] = { updated: 0, error: err.message || String(err) };
    }
  }

  // Close SQL Server connection
  await pool.close();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('ENRICHMENT COMPLETE');
  console.log('='.repeat(60));

  for (const [name, stats] of Object.entries(results)) {
    const status = stats.error ? `ERROR: ${stats.error}` : `${stats.updated} updated`;
    console.log(`  ${name.padEnd(25)} ${status}`);
  }

  console.log(`\nElapsed: ${elapsed(totalStart)}`);
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
