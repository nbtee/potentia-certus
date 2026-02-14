/**
 * Verify Status Transitions in SQL Server
 * Checks what status values exist in Submissions and SubmissionHistory tables
 */

const sql = require('mssql');

const config = {
  server: 'papjobsserver.database.windows.net',
  port: 1433,
  database: 'PAPJobs',
  user: 'PAPJAdmin',
  password: 'YiUIY^&*65$%6*876598TYit7',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  }
};

async function verifyStatusTransitions() {
  try {
    console.log('Connecting to SQL Server...');
    await sql.connect(config);
    console.log('Connected successfully!\n');

    // Check status values in Submissions table
    console.log('=== STATUS VALUES IN Submissions TABLE ===\n');
    const submissionsStatus = await sql.query`
      SELECT
        status,
        COUNT(*) as count,
        MIN(dateAdded) as earliest_date,
        MAX(dateAdded) as latest_date
      FROM TargetJobsDB.Submissions
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY COUNT(*) DESC
    `;

    console.log('Submissions status distribution:');
    submissionsStatus.recordset.forEach(s => {
      console.log(`  ${s.status.padEnd(40)} ${s.count.toLocaleString().padStart(10)} records  (${s.earliest_date?.toISOString().split('T')[0]} to ${s.latest_date?.toISOString().split('T')[0]})`);
    });
    console.log(`\nTotal distinct status values: ${submissionsStatus.recordset.length}`);
    console.log();

    // Check status values in SubmissionHistory table
    console.log('=== STATUS VALUES IN SubmissionHistory TABLE ===\n');
    const historyStatus = await sql.query`
      SELECT
        status,
        COUNT(*) as count,
        MIN(dateAdded) as earliest_date,
        MAX(dateAdded) as latest_date
      FROM TargetJobsDB.SubmissionHistory
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY COUNT(*) DESC
    `;

    console.log('SubmissionHistory status distribution:');
    historyStatus.recordset.forEach(s => {
      console.log(`  ${s.status.padEnd(40)} ${s.count.toLocaleString().padStart(10)} records  (${s.earliest_date?.toISOString().split('T')[0]} to ${s.latest_date?.toISOString().split('T')[0]})`);
    });
    console.log(`\nTotal distinct status values: ${historyStatus.recordset.length}`);
    console.log();

    // Check for key pipeline stages
    console.log('=== PIPELINE STAGE VALIDATION ===\n');
    const keyStatuses = ['Submittal', 'Submitted', 'Interview', 'Client Interview', 'Interviewing', 'Offer', 'Offer Extended', 'Placed'];

    const allStatuses = new Set([
      ...submissionsStatus.recordset.map(s => s.status),
      ...historyStatus.recordset.map(s => s.status)
    ]);

    console.log('Checking for key pipeline stages:');
    keyStatuses.forEach(key => {
      const found = Array.from(allStatuses).find(s => s.toLowerCase().includes(key.toLowerCase()));
      if (found) {
        console.log(`  ✅ ${key.padEnd(30)} Found as: "${found}"`);
      } else {
        console.log(`  ❌ ${key.padEnd(30)} NOT FOUND`);
      }
    });
    console.log();

    // Show sample status transition history for a few submissions
    console.log('=== SAMPLE STATUS TRANSITION HISTORY ===\n');
    const sampleTransitions = await sql.query`
      SELECT TOP 50
        sh.SubmissionId,
        sh.status,
        sh.dateAdded,
        s.status as current_status,
        s.dateLastModified
      FROM TargetJobsDB.SubmissionHistory sh
      JOIN TargetJobsDB.Submissions s ON s.Id = sh.SubmissionId
      WHERE sh.SubmissionId IN (
        SELECT TOP 3 SubmissionId
        FROM TargetJobsDB.SubmissionHistory
        GROUP BY SubmissionId
        HAVING COUNT(*) > 3
        ORDER BY COUNT(*) DESC
      )
      ORDER BY sh.SubmissionId, sh.dateAdded
    `;

    console.log('Sample submission status transitions (3 submissions with multiple transitions):');
    let currentSubmissionId = null;
    sampleTransitions.recordset.forEach(t => {
      if (t.SubmissionId !== currentSubmissionId) {
        console.log(`\n  Submission ${t.SubmissionId} (current status: "${t.current_status}"):`);
        currentSubmissionId = t.SubmissionId;
      }
      console.log(`    ${t.dateAdded.toISOString().split('T')[0]} → "${t.status}"`);
    });
    console.log();

    // Check if "Submittal" status exists in history
    console.log('=== CRITICAL: SUBMITTAL STATUS CAPTURE ===\n');
    const submittalInHistory = await sql.query`
      SELECT COUNT(*) as count
      FROM TargetJobsDB.SubmissionHistory
      WHERE status LIKE '%Submit%'
    `;

    console.log(`Records with "Submit" in status (SubmissionHistory): ${submittalInHistory.recordset[0].count.toLocaleString()}`);

    if (submittalInHistory.recordset[0].count === 0) {
      console.log('⚠️  WARNING: No "Submittal" status found in SubmissionHistory!');
      console.log('   This confirms we need a polling-based shadow record system.');
    } else {
      console.log('✅ "Submittal" status IS captured in SubmissionHistory');
    }
    console.log();

    console.log('=== VERIFICATION COMPLETE ===');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

verifyStatusTransitions();
