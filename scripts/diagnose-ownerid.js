/**
 * Diagnostic script: Confirm that JobOrders.OwnerId matches CorporateUsers.IdInDataSrc (not Id)
 *
 * The hypothesis:
 *   - CorporateUsers.Id = SQL Server mirror internal ID (used by Notes.CorporateUserId)
 *   - CorporateUsers.IdInDataSrc = Bullhorn-native ID (used by JobOrders.OwnerId & Placements.OwnerId)
 *   - Our current sync maps OwnerId against .Id, causing a 3.7% match rate for job_orders
 *   - It should map against .IdInDataSrc instead
 */

require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

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

async function main() {
  console.log('='.repeat(60));
  console.log('DIAGNOSTIC: OwnerId vs CorporateUsers.Id vs IdInDataSrc');
  console.log('='.repeat(60));

  const pool = await sql.connect(SQL_CONFIG);

  // 1. Show CorporateUsers columns
  console.log('\n--- CorporateUsers sample (Id vs IdInDataSrc) ---');
  const users = await pool.request().query(
    `SELECT TOP 10 Id, IdInDataSrc, Name, Email
     FROM TargetJobsDB.CorporateUsers
     ORDER BY Id`
  );
  console.table(users.recordset.map(r => ({
    Id: r.Id,
    IdInDataSrc: r.IdInDataSrc,
    Name: r.Name,
    Email: r.Email,
  })));

  // 2. Show JobOrders sample with OwnerId
  console.log('\n--- JobOrders sample (OwnerId) ---');
  const jobs = await pool.request().query(
    `SELECT TOP 20 Id, OwnerId, Title
     FROM TargetJobsDB.JobOrders
     ORDER BY Id`
  );
  console.table(jobs.recordset.map(r => ({
    Id: r.Id,
    OwnerId: r.OwnerId,
    Title: (r.Title || '').substring(0, 40),
  })));

  // 3. Cross-reference: How many JobOrders.OwnerId match CorporateUsers.Id?
  const matchById = await pool.request().query(
    `SELECT COUNT(*) AS match_count
     FROM TargetJobsDB.JobOrders j
     INNER JOIN TargetJobsDB.CorporateUsers u ON j.OwnerId = u.Id`
  );
  console.log(`\nJobOrders.OwnerId matching CorporateUsers.Id: ${matchById.recordset[0].match_count}`);

  // 4. Cross-reference: How many JobOrders.OwnerId match CorporateUsers.IdInDataSrc?
  const matchByNativeId = await pool.request().query(
    `SELECT COUNT(*) AS match_count
     FROM TargetJobsDB.JobOrders j
     INNER JOIN TargetJobsDB.CorporateUsers u ON j.OwnerId = u.IdInDataSrc`
  );
  console.log(`JobOrders.OwnerId matching CorporateUsers.IdInDataSrc: ${matchByNativeId.recordset[0].match_count}`);

  // 5. Total job orders for context
  const totalJobs = await pool.request().query(
    `SELECT COUNT(*) AS total FROM TargetJobsDB.JobOrders`
  );
  console.log(`Total JobOrders: ${totalJobs.recordset[0].total}`);

  // 6. Same check for Placements
  const placementMatchById = await pool.request().query(
    `SELECT COUNT(*) AS match_count
     FROM TargetJobsDB.Placements p
     INNER JOIN TargetJobsDB.CorporateUsers u ON p.OwnerId = u.Id`
  );
  console.log(`\nPlacements.OwnerId matching CorporateUsers.Id: ${placementMatchById.recordset[0].match_count}`);

  const placementMatchByNativeId = await pool.request().query(
    `SELECT COUNT(*) AS match_count
     FROM TargetJobsDB.Placements p
     INNER JOIN TargetJobsDB.CorporateUsers u ON p.OwnerId = u.IdInDataSrc`
  );
  console.log(`Placements.OwnerId matching CorporateUsers.IdInDataSrc: ${placementMatchByNativeId.recordset[0].match_count}`);

  const totalPlacements = await pool.request().query(
    `SELECT COUNT(*) AS total FROM TargetJobsDB.Placements`
  );
  console.log(`Total Placements: ${totalPlacements.recordset[0].total}`);

  // 7. Verify Notes use CorporateUserId (should match .Id)
  const notesMatchById = await pool.request().query(
    `SELECT COUNT(*) AS match_count
     FROM TargetJobsDB.Notes n
     INNER JOIN TargetJobsDB.CorporateUsers u ON n.CorporateUserId = u.Id
     WHERE n.isDeleted = 0`
  );
  console.log(`\nNotes.CorporateUserId matching CorporateUsers.Id: ${notesMatchById.recordset[0].match_count}`);

  const notesMatchByNativeId = await pool.request().query(
    `SELECT COUNT(*) AS match_count
     FROM TargetJobsDB.Notes n
     INNER JOIN TargetJobsDB.CorporateUsers u ON n.CorporateUserId = u.IdInDataSrc
     WHERE n.isDeleted = 0`
  );
  console.log(`Notes.CorporateUserId matching CorporateUsers.IdInDataSrc: ${notesMatchByNativeId.recordset[0].match_count}`);

  await pool.close();

  console.log('\n' + '='.repeat(60));
  console.log('CONCLUSION:');
  console.log('If IdInDataSrc matches OwnerId much better than Id,');
  console.log('then OwnerId is the Bullhorn-native ID and we need');
  console.log('to store IdInDataSrc as bullhorn_native_id in user_profiles.');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
