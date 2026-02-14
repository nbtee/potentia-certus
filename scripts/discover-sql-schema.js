/**
 * SQL Server Schema Discovery Script
 * Connects to PAPJobs database and runs discovery queries to understand actual schema
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

async function discoverSchema() {
  try {
    console.log('Connecting to SQL Server...');
    await sql.connect(config);
    console.log('Connected successfully!\n');

    // Phase 1: Table Inventory with Schemas
    console.log('=== PHASE 1: TABLE INVENTORY WITH SCHEMAS ===\n');
    const tables = await sql.query`
      SELECT
        SCHEMA_NAME(schema_id) as schema_name,
        name as table_name
      FROM sys.tables
      ORDER BY SCHEMA_NAME(schema_id), name
    `;
    console.log('Available tables (schema.table):');
    tables.recordset.forEach(t => console.log(`  - ${t.schema_name}.${t.table_name}`));
    console.log();

    // Phase 1b: Row Counts
    console.log('=== TABLE ROW COUNTS ===\n');
    const rowCounts = await sql.query`
      SELECT
        t.name AS table_name,
        SUM(p.rows) AS row_count
      FROM sys.tables t
      JOIN sys.partitions p ON p.object_id = t.object_id
      WHERE p.index_id IN (0, 1)
        AND t.name IN ('Candidates', 'JobSubmission', 'JobOrder', 'Placement', 'Note', 'CorporateUser', 'ClientCorporation', 'Department')
      GROUP BY t.name
      ORDER BY SUM(p.rows) DESC
    `;
    console.log('Row counts for key tables:');
    rowCounts.recordset.forEach(r => console.log(`  ${r.table_name}: ${r.row_count.toLocaleString()} rows`));
    console.log();

    // Phase 2: Column Discovery for JobSubmission
    console.log('=== PHASE 2: JobSubmission COLUMNS ===\n');
    try {
      const jobSubmissionCols = await sql.query`
        SELECT
          c.name AS column_name,
          ty.name AS data_type,
          c.max_length,
          c.is_nullable
        FROM sys.columns c
        JOIN sys.types ty ON ty.user_type_id = c.user_type_id
        WHERE c.object_id = OBJECT_ID('JobSubmission')
        ORDER BY c.column_id
      `;
      console.log('JobSubmission columns:');
      jobSubmissionCols.recordset.forEach(c => {
        console.log(`  ${c.column_name.padEnd(30)} ${c.data_type.padEnd(15)} ${c.is_nullable ? 'NULL' : 'NOT NULL'}`);
      });
    } catch (err) {
      console.log(`  Table 'JobSubmission' not found. Checking variations...`);
    }
    console.log();

    // Try JobSubmissions (plural)
    console.log('=== Trying JobSubmissions (plural) ===\n');
    try {
      const jobSubmissionsCols = await sql.query`
        SELECT
          c.name AS column_name,
          ty.name AS data_type,
          c.max_length,
          c.is_nullable
        FROM sys.columns c
        JOIN sys.types ty ON ty.user_type_id = c.user_type_id
        WHERE c.object_id = OBJECT_ID('JobSubmissions')
        ORDER BY c.column_id
      `;
      console.log('JobSubmissions columns:');
      jobSubmissionsCols.recordset.forEach(c => {
        console.log(`  ${c.column_name.padEnd(30)} ${c.data_type.padEnd(15)} ${c.is_nullable ? 'NULL' : 'NOT NULL'}`);
      });
    } catch (err) {
      console.log(`  Table 'JobSubmissions' not found either.`);
    }
    console.log();

    // Phase 3: Sample Data from key tables
    console.log('=== PHASE 3: SAMPLE DATA ===\n');

    // Find the schema for key tables
    const keyTables = ['Submissions', 'SubmissionHistory', 'Placements', 'JobOrders', 'Notes', 'Departments', 'CorporateUsers', 'Candidates', 'ClientCorporations'];
    const tableSchemas = {};

    for (const tableName of keyTables) {
      const match = tables.recordset.find(t => t.table_name === tableName);
      if (match) {
        tableSchemas[tableName] = match.schema_name;
      }
    }

    console.log('=== KEY TABLE SCHEMAS ===\n');
    Object.entries(tableSchemas).forEach(([table, schema]) => {
      console.log(`  ${schema}.${table}`);
    });
    console.log();

    // Now query with proper schema names
    for (const [tableName, schemaName] of Object.entries(tableSchemas)) {
      console.log(`=== ${schemaName}.${tableName} ===\n`);
      try {
        const result = await sql.query(`SELECT TOP 3 * FROM [${schemaName}].[${tableName}]`);
        console.log(`Row count in sample: ${result.recordset.length}`);
        if (result.recordset.length > 0) {
          console.log('Columns:', Object.keys(result.recordset[0]).join(', '));
          console.log('\nSample records:');
          result.recordset.forEach(r => {
            // Show a condensed version
            const condensed = {};
            Object.keys(r).slice(0, 10).forEach(k => condensed[k] = r[k]);
            console.log(JSON.stringify(condensed, null, 2));
          });
        } else {
          console.log('Table has no rows (empty)');
        }
      } catch (err) {
        console.log(`Error querying ${schemaName}.${tableName}: ${err.message}`);
      }
      console.log();
    }

    console.log('\n=== DISCOVERY COMPLETE ===');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.close();
  }
}

discoverSchema();
