/**
 * Extract all activity types from SQL Server Notes table
 * This will show us exactly what activities are being tracked in Bullhorn
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

async function extractActivityTypes() {
  try {
    console.log('Connecting to SQL Server...\n');
    await sql.connect(config);
    console.log('✅ Connected successfully!\n');
    console.log('='.repeat(80));

    // Get all distinct activity types with counts
    console.log('\n📊 ALL ACTIVITY TYPES (from Notes.action field)\n');
    console.log('='.repeat(80));

    const activityTypes = await sql.query`
      SELECT
        action AS activity_type,
        COUNT(*) AS total_count,
        COUNT(DISTINCT CorporateUserId) AS unique_consultants,
        MIN(dateAdded) AS earliest_date,
        MAX(dateAdded) AS latest_date
      FROM TargetJobsDB.Notes
      WHERE isDeleted = 0
        AND action IS NOT NULL
      GROUP BY action
      ORDER BY COUNT(*) DESC
    `;

    console.log(`Found ${activityTypes.recordset.length} distinct activity types\n`);

    // Display in a formatted table
    console.log('┌─────┬────────────────────────────────────────┬────────────┬──────────────┐');
    console.log('│ #   │ Activity Type                          │ Count      │ Consultants  │');
    console.log('├─────┼────────────────────────────────────────┼────────────┼──────────────┤');

    activityTypes.recordset.forEach((row, index) => {
      const num = (index + 1).toString().padEnd(3);
      const type = row.activity_type.substring(0, 38).padEnd(38);
      const count = row.total_count.toString().padStart(10);
      const consultants = row.unique_consultants.toString().padStart(12);

      console.log(`│ ${num} │ ${type} │ ${count} │ ${consultants} │`);
    });

    console.log('└─────┴────────────────────────────────────────┴────────────┴──────────────┘');

    // Show total activity count
    const totalActivities = activityTypes.recordset.reduce((sum, row) => sum + row.total_count, 0);
    console.log(`\n📈 Total activities: ${totalActivities.toLocaleString()}`);
    console.log(`📊 Total activity types: ${activityTypes.recordset.length}`);

    // Show activity type categorization suggestions
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 ACTIVITY TYPE BREAKDOWN\n');
    console.log('='.repeat(80));

    // Group by likely categories
    const clientActivities = activityTypes.recordset.filter(r =>
      r.activity_type.toLowerCase().includes('client') ||
      r.activity_type.toLowerCase().includes('bd') ||
      r.activity_type.toLowerCase().includes('ad')
    );

    const candidateActivities = activityTypes.recordset.filter(r =>
      r.activity_type.toLowerCase().includes('candidate') ||
      r.activity_type.toLowerCase().includes('coffee')
    );

    const emailActivities = activityTypes.recordset.filter(r =>
      r.activity_type.toLowerCase().includes('email')
    );

    const callActivities = activityTypes.recordset.filter(r =>
      r.activity_type.toLowerCase().includes('call') &&
      !r.activity_type.toLowerCase().includes('email')
    );

    const meetingActivities = activityTypes.recordset.filter(r =>
      r.activity_type.toLowerCase().includes('meeting') ||
      r.activity_type.toLowerCase().includes('catch')
    );

    console.log('\n🎯 CLIENT/BD ACTIVITIES:');
    clientActivities.forEach(row => {
      console.log(`   - ${row.activity_type} (${row.total_count.toLocaleString()} records)`);
    });

    console.log('\n👤 CANDIDATE ACTIVITIES:');
    candidateActivities.forEach(row => {
      console.log(`   - ${row.activity_type} (${row.total_count.toLocaleString()} records)`);
    });

    console.log('\n📞 CALL ACTIVITIES:');
    callActivities.forEach(row => {
      console.log(`   - ${row.activity_type} (${row.total_count.toLocaleString()} records)`);
    });

    console.log('\n🤝 MEETING/CATCH-UP ACTIVITIES:');
    meetingActivities.forEach(row => {
      console.log(`   - ${row.activity_type} (${row.total_count.toLocaleString()} records)`);
    });

    console.log('\n📧 EMAIL ACTIVITIES:');
    emailActivities.forEach(row => {
      console.log(`   - ${row.activity_type} (${row.total_count.toLocaleString()} records)`);
    });

    // Export to JSON for easy reference
    const exportData = {
      total_activity_types: activityTypes.recordset.length,
      total_activities: totalActivities,
      activity_types: activityTypes.recordset.map(row => ({
        activity_type: row.activity_type,
        count: row.total_count,
        unique_consultants: row.unique_consultants,
        earliest_date: row.earliest_date,
        latest_date: row.latest_date
      }))
    };

    const fs = require('fs');
    fs.writeFileSync(
      'docs/activity-types-export.json',
      JSON.stringify(exportData, null, 2)
    );

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Activity types exported to: docs/activity-types-export.json');
    console.log('\n📋 NEXT STEP: Review the list above and tell me which activity types');
    console.log('   should be tracked as data assets for your dashboards.\n');
    console.log('='.repeat(80) + '\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.code) console.error('   Code:', err.code);
  } finally {
    await sql.close();
  }
}

extractActivityTypes();
