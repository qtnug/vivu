const sql = require('mssql');

async function main() {
  console.log('Connecting to master with 25s timeout...');
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
      connectionTimeout: 25000,
      requestTimeout: 25000,
    });
    console.log('SUCCESS: Connected to master!');
    
    // Check database status
    const statusRes = await pool.request().query(`
      SELECT name, state_desc, is_auto_close_on, is_auto_shrink_on, recovery_model_desc
      FROM sys.databases
      WHERE name = 'bus_ticketing_system'
    `);
    console.log('Database configuration:');
    console.table(statusRes.recordset);

    if (statusRes.recordset.length > 0 && statusRes.recordset[0].is_auto_close_on) {
      console.log('Attempting to turn AUTO_CLOSE OFF...');
      await pool.request().query(`
        ALTER DATABASE [bus_ticketing_system] SET AUTO_CLOSE OFF WITH NO_WAIT;
      `);
      console.log('SUCCESS: AUTO_CLOSE set to OFF!');
    }

    await pool.close();
  } catch (err) {
    console.error('Failed:', err.message);
  }
}

main();
