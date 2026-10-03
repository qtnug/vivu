const sql = require('mssql');

async function main() {
  console.log('Connecting to master for quick query...');
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
    connectionTimeout: 8000,
    requestTimeout: 8000,
  });
  console.log('Master connected successfully!');
  const res = await pool.request().query('SELECT @@VERSION AS version, DB_NAME() AS current_db');
  console.log(res.recordset);
  await pool.close();
}

main().catch(e => console.error('FAILED:', e.message));
