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
      connectionTimeout: 10000,
      requestTimeout: 10000,
    });
    console.log('Connected to master!');
    
    // Query active spids and wait types
    const spidRes = await pool.request().query(`
      SELECT spid, blocked, waittime, lastwaittype, waitresource, dbid, status, cmd
      FROM master.dbo.sysprocesses
      WHERE spid > 50 OR blocked <> 0 OR lastwaittype <> 'MISCELLANEOUS'
    `);
    console.log('Active processes:');
    console.table(spidRes.recordset);

    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
