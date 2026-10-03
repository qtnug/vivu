const sql = require('mssql');

async function test() {
  console.log('Testing connection to master...');
  try {
    const pool = await sql.connect({
      user: 'vivu_admin',
      password: 'VivuAdmin@2026!',
      server: 'localhost',
      port: 1433,
      database: 'master',
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
      connectionTimeout: 15000,
      requestTimeout: 15000,
    });
    console.log('Successfully connected to master!');
    const res = await pool.request().query(`
      SELECT name, state_desc, is_auto_close_on, is_auto_shrink_on
      FROM sys.databases
      WHERE name IN ('master', 'bus_ticketing_system')
    `);
    console.log('sys.databases result:');
    console.table(res.recordset);

    const memRes = await pool.request().query(`
      SELECT 
        cntr_value / 1024 AS target_server_memory_mb
      FROM sys.dm_os_performance_counters
      WHERE counter_name LIKE 'Target Server Memory%'
    `);
    console.log('Target Server Memory:', memRes.recordset);

    await pool.close();
  } catch (err) {
    console.error('Connection to master failed:', err.message);
  }
}

test();
