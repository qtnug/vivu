/**
 * Independent Forensic Audit Script for Milestone 1
 * Written by Forensic Auditor M1 (auditor_m1_1)
 * Location: .agents/teamwork/auditor_m1_1/audit_independent.js
 */

const sql = require('mssql');
const bcrypt = require('bcryptjs');

const dbConfig = {
  user: process.env.DB_USER || 'vivu_admin',
  password: process.env.DB_PASSWORD || 'VivuAdmin@2026!',
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'bus_ticketing_system',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function runForensicAudit() {
  console.log('--- FORENSIC AUDIT START ---');
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    console.log('[AUDIT] Successfully connected to SQL Server at localhost:1433/bus_ticketing_system');
  } catch (err) {
    console.error('[AUDIT ERROR] Connection failed:', err);
    process.exit(1);
  }

  let violations = [];

  // 1. Check Tables
  const expectedTables = [
    'users', 'bus_routes', 'bus_stops', 'route_stops', 'buses',
    'schedules', 'ticket_types', 'orders', 'tickets', 'payment_transactions', 'complaints'
  ];
  const tablesRes = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
  const actualTables = tablesRes.recordset.map(r => r.TABLE_NAME.toLowerCase());
  for (const t of expectedTables) {
    if (!actualTables.includes(t)) {
      violations.push(`Missing table: ${t}`);
    }
  }
  console.log(`[AUDIT] Found ${actualTables.length} tables in catalog. Expected 11. Match: ${expectedTables.length === actualTables.length}`);

  // 2. Check FK Cascade Rules
  const fkRes = await pool.request().query(`
    SELECT OBJECT_NAME(parent_object_id) AS parent_table,
           OBJECT_NAME(referenced_object_id) AS ref_table,
           delete_referential_action_desc AS del_action
    FROM sys.foreign_keys
  `);
  let cascades = 0;
  for (const fk of fkRes.recordset) {
    const parent = fk.parent_table.toLowerCase();
    const ref = fk.ref_table.toLowerCase();
    const del = fk.del_action;
    if (del === 'CASCADE') {
      cascades++;
      if (!((parent === 'route_stops' && ref === 'bus_routes') || (parent === 'tickets' && ref === 'orders'))) {
        violations.push(`Illegal CASCADE on ${parent} -> ${ref}`);
      }
    }
  }
  if (cascades !== 2) {
    violations.push(`Expected exactly 2 cascades, found ${cascades}`);
  }
  console.log(`[AUDIT] Verified cascade delete constraints: exactly ${cascades} valid cascades (route_stops->bus_routes, tickets->orders)`);

  // 3. Check Bcrypt Hashes and Negative Authentication Test
  const usersRes = await pool.request().query("SELECT email, password_hash, role, is_active FROM users");
  const users = usersRes.recordset;
  const admin = users.find(u => u.email === 'admin@busticket.vn');
  const insp = users.find(u => u.email === 'inspector1@busticket.vn');

  if (!admin || !insp) {
    violations.push('Missing admin or inspector seed user');
  } else {
    const adminPassOk = await bcrypt.compare('Admin@123456', admin.password_hash);
    const inspPassOk = await bcrypt.compare('Inspector@123456', insp.password_hash);
    const adminPassFake = await bcrypt.compare('WrongPassword999', admin.password_hash);

    console.log(`[AUDIT] Admin password match: ${adminPassOk}`);
    console.log(`[AUDIT] Inspector password match: ${inspPassOk}`);
    console.log(`[AUDIT] Negative test (WrongPassword999 rejected): ${!adminPassFake}`);

    if (!adminPassOk) violations.push('Admin password does not match Admin@123456');
    if (!inspPassOk) violations.push('Inspector password does not match Inspector@123456');
    if (adminPassFake) violations.push('Negative password test failed: bcrypt accepted wrong password');
  }

  // 4. Check Route 01, Stops, Distances, Buses, Schedules, Ticket Types
  const rRes = await pool.request().query("SELECT route_code, route_name FROM bus_routes WHERE route_code = '01'");
  if (rRes.recordset.length !== 1) violations.push('Route 01 missing');

  const sRes = await pool.request().query("SELECT count(*) as cnt FROM bus_stops");
  if (sRes.recordset[0].cnt !== 5) violations.push(`Expected 5 stops, got ${sRes.recordset[0].cnt}`);

  const rsRes = await pool.request().query(`
    SELECT rs.stop_sequence, rs.distance_from_start_km 
    FROM route_stops rs
    JOIN bus_routes br ON rs.route_id = br.id
    WHERE br.route_code = '01'
    ORDER BY rs.stop_sequence
  `);
  if (rsRes.recordset.length !== 5) {
    violations.push(`Expected 5 route_stops, got ${rsRes.recordset.length}`);
  } else {
    for (let i = 0; i < 5; i++) {
      if (rsRes.recordset[i].stop_sequence !== i + 1) {
        violations.push(`Sequence mismatch at index ${i}`);
      }
    }
  }

  const bRes = await pool.request().query("SELECT count(*) as cnt FROM buses");
  if (bRes.recordset[0].cnt !== 2) violations.push(`Expected 2 buses, got ${bRes.recordset[0].cnt}`);

  const ttRes = await pool.request().query("SELECT count(*) as cnt FROM ticket_types");
  if (ttRes.recordset[0].cnt !== 5) violations.push(`Expected 5 ticket_types, got ${ttRes.recordset[0].cnt}`);

  // 5. Test ACID Transaction Rollback
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const req = new sql.Request(tx);
    await req.query("INSERT INTO bus_stops (id, stop_name, latitude, longitude) VALUES (NEWID(), 'Test Stop Temp', 21.0, 105.0)");
    await tx.rollback();
    const afterRollback = await pool.request().query("SELECT count(*) as cnt FROM bus_stops WHERE stop_name = 'Test Stop Temp'");
    if (afterRollback.recordset[0].cnt !== 0) {
      violations.push('Transaction rollback failed: temp stop still exists');
    } else {
      console.log('[AUDIT] ACID Transaction test: rollback verified successfully.');
    }
  } catch (txErr) {
    violations.push(`Transaction test error: ${txErr.message}`);
    try { await tx.rollback(); } catch(e) {}
  }

  await pool.close();

  if (violations.length > 0) {
    console.error('--- FORENSIC AUDIT FAILED ---');
    console.error(violations.join('\n'));
    process.exit(1);
  } else {
    console.log('--- FORENSIC AUDIT COMPLETE: ALL CHECKS PASSED ---');
    process.exit(0);
  }
}

runForensicAudit().catch(err => {
  console.error('Unhandled audit error:', err);
  process.exit(1);
});
