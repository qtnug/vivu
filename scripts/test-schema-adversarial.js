/**
 * scripts/test-schema-adversarial.js
 * Empirical Challenger M1.2: Adversarial Schema & Constraint Stress Test Suite
 *
 * Verifies with empirical T-SQL executions:
 * 1. Foreign Key Rejections on Non-Existent Parents (13 constraints)
 * 2. Cascade Delete Rules vs NO ACTION Restrictions (6 scenarios)
 * 3. Unique Constraint Violations (7 constraints)
 * 4. Check Constraint & Enum Violations (6 constraints)
 * 5. Not-Null Constraint Violations (7 constraints)
 */

const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER || 'vivu_admin',
  password: process.env.DB_PASSWORD || 'VivuAdmin@2026!',
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'bus_ticketing_system',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: { max: 5, min: 0, idleTimeoutMillis: 10000 },
};

// Truly non-existent UUIDs guaranteed not in seed data
const NON_EXISTENT_UUID_1 = '99999999-9999-9999-9999-999999999991';
const NON_EXISTENT_UUID_2 = '99999999-9999-9999-9999-999999999992';
const NON_EXISTENT_UUID_3 = '99999999-9999-9999-9999-999999999993';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

function recordResult(id, category, description, passed, errorDetails = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  [PASS] ${id}: ${description}`);
    if (errorDetails) {
      console.log(`         ↳ Rejection caught: ${errorDetails}`);
    }
  } else {
    failedTests++;
    console.log(`  [FAIL] ❌ ${id}: ${description}`);
    if (errorDetails) {
      console.log(`         ↳ Failure detail: ${errorDetails}`);
    }
  }
  testResults.push({ id, category, description, passed, errorDetails });
}

async function runAdversarialTests() {
  console.log('================================================================================');
  console.log('⚔️  Vivu Platform: Empirical Schema Constraints & Boundary Stress Harness');
  console.log(`🔌 Target: ${dbConfig.server}:${dbConfig.port} / ${dbConfig.database} (User: ${dbConfig.user})`);
  console.log('================================================================================\n');

  let pool;
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to SQL Server successfully.\n');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  // Clean up any test leftovers from previous runs
  async function cleanupLeftovers() {
    try {
      await pool.request().query("DELETE FROM complaints WHERE content LIKE '%test%' OR category = 'SERVICE'");
      await pool.request().query("DELETE FROM payment_transactions WHERE sepay_reference_code LIKE 'SEPAY_REF%'");
      await pool.request().query("DELETE FROM tickets WHERE ticket_code LIKE 'TEST%'");
      await pool.request().query("DELETE FROM orders WHERE order_code LIKE 'TEST%'");
      await pool.request().query("DELETE FROM route_stops WHERE stop_sequence >= 900");
      await pool.request().query("DELETE FROM bus_routes WHERE route_code LIKE 'TEST%' OR route_code IN ('99')");
      await pool.request().query("DELETE FROM bus_stops WHERE stop_name LIKE '%Test%'");
      await pool.request().query("DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%hacker%' OR full_name LIKE '%Test%'");
      await pool.request().query("DELETE FROM ticket_types WHERE name LIKE '%Test%' OR name = 'Temp TT' OR category = 'YEARLY_PASS'");
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  await cleanupLeftovers();

  // Pre-fetch valid parent IDs from authoritative seed data
  let validUser, validRoute, validStop, validBus, validTicketType;
  try {
    const userRes = await pool.request().query("SELECT TOP 1 id FROM users WHERE role = 'admin'");
    validUser = userRes.recordset[0].id;

    const routeRes = await pool.request().query("SELECT TOP 1 id FROM bus_routes WHERE route_code = '01'");
    validRoute = routeRes.recordset[0].id;

    const stopRes = await pool.request().query("SELECT TOP 1 id FROM bus_stops");
    validStop = stopRes.recordset[0].id;

    const busRes = await pool.request().query("SELECT TOP 1 id FROM buses");
    validBus = busRes.recordset[0].id;

    const ttRes = await pool.request().query("SELECT TOP 1 id FROM ticket_types");
    validTicketType = ttRes.recordset[0].id;
  } catch (err) {
    console.error('❌ Failed to fetch seed fixtures:', err.message);
    process.exit(1);
  }

  // Helper to execute and expect specific error numbers (547: FK/CHECK, 2627/2601: UNIQUE, 515: NOT NULL)
  async function assertThrowsSqlError(id, category, description, sqlStatement, params = {}, expectedErrorNumbers = [547]) {
    const req = pool.request();
    for (const [k, v] of Object.entries(params)) {
      req.input(k, v);
    }
    try {
      await req.query(sqlStatement);
      recordResult(id, category, description, false, 'Expected SQL error but query succeeded unexpectedly');
    } catch (err) {
      const sqlNumber = err.number;
      const isExpected = expectedErrorNumbers.includes(sqlNumber);
      if (isExpected) {
        recordResult(id, category, description, true, `SQL Error ${sqlNumber} (${err.message.split('.')[0]})`);
      } else {
        recordResult(id, category, description, false, `Unexpected SQL Error ${sqlNumber}: ${err.message}`);
      }
    }
  }

  // ===========================================================================
  // SECTION 1: FOREIGN KEY REJECTIONS ON NON-EXISTENT PARENT KEYS (Error 547)
  // ===========================================================================
  console.log('--- SECTION 1: Foreign Key Rejections on Non-Existent Parents ---');

  // FK-01: route_stops.route_id
  await assertThrowsSqlError(
    'FK-01',
    'Foreign Key',
    'Reject route_stops referencing non-existent route_id',
    `INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
     VALUES (@route_id, @stop_id, 999, 10.0)`,
    { route_id: NON_EXISTENT_UUID_1, stop_id: validStop },
    [547]
  );

  // FK-02: route_stops.stop_id
  await assertThrowsSqlError(
    'FK-02',
    'Foreign Key',
    'Reject route_stops referencing non-existent stop_id',
    `INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
     VALUES (@route_id, @stop_id, 999, 10.0)`,
    { route_id: validRoute, stop_id: NON_EXISTENT_UUID_1 },
    [547]
  );

  // FK-03: schedules.route_id
  await assertThrowsSqlError(
    'FK-03',
    'Foreign Key',
    'Reject schedules referencing non-existent route_id',
    `INSERT INTO schedules (route_id, bus_id, departure_time, average_speed_kmh, days_of_week)
     VALUES (@route_id, @bus_id, '12:00:00', 25.0, 'MON-SUN')`,
    { route_id: NON_EXISTENT_UUID_1, bus_id: validBus },
    [547]
  );

  // FK-04: schedules.bus_id
  await assertThrowsSqlError(
    'FK-04',
    'Foreign Key',
    'Reject schedules referencing non-existent bus_id',
    `INSERT INTO schedules (route_id, bus_id, departure_time, average_speed_kmh, days_of_week)
     VALUES (@route_id, @bus_id, '12:00:00', 25.0, 'MON-SUN')`,
    { route_id: validRoute, bus_id: NON_EXISTENT_UUID_1 },
    [547]
  );

  // FK-05: orders.user_id
  await assertThrowsSqlError(
    'FK-05',
    'Foreign Key',
    'Reject orders referencing non-existent user_id',
    `INSERT INTO orders (order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
     VALUES ('TEST_ORD_BAD_USER', @user_id, @ticket_type_id, @route_id, 1, 7000, 'PENDING', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()))`,
    { user_id: NON_EXISTENT_UUID_1, ticket_type_id: validTicketType, route_id: validRoute },
    [547]
  );

  // FK-06: orders.ticket_type_id
  await assertThrowsSqlError(
    'FK-06',
    'Foreign Key',
    'Reject orders referencing non-existent ticket_type_id',
    `INSERT INTO orders (order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
     VALUES ('TEST_ORD_BAD_TT', @user_id, @ticket_type_id, @route_id, 1, 7000, 'PENDING', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()))`,
    { user_id: validUser, ticket_type_id: NON_EXISTENT_UUID_1, route_id: validRoute },
    [547]
  );

  // FK-07: orders.route_id
  await assertThrowsSqlError(
    'FK-07',
    'Foreign Key',
    'Reject orders referencing non-existent route_id',
    `INSERT INTO orders (order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
     VALUES ('TEST_ORD_BAD_ROUTE', @user_id, @ticket_type_id, @route_id, 1, 7000, 'PENDING', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()))`,
    { user_id: validUser, ticket_type_id: validTicketType, route_id: NON_EXISTENT_UUID_1 },
    [547]
  );

  // FK-08: tickets.order_id
  await assertThrowsSqlError(
    'FK-08',
    'Foreign Key',
    'Reject tickets referencing non-existent order_id',
    `INSERT INTO tickets (order_id, route_id, ticket_code, qr_payload, status, valid_from, valid_until)
     VALUES (@order_id, @route_id, 'TEST_TCK_BAD_ORD', 'QR_JWT_PAYLOAD', 'ACTIVE', SYSUTCDATETIME(), DATEADD(DAY, 1, SYSUTCDATETIME()))`,
    { order_id: NON_EXISTENT_UUID_1, route_id: validRoute },
    [547]
  );

  // FK-09: tickets.route_id
  await assertThrowsSqlError(
    'FK-09',
    'Foreign Key',
    'Reject tickets referencing non-existent route_id',
    `DECLARE @temp_order_id UNIQUEIDENTIFIER = NEWID();
     INSERT INTO orders (id, order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
     VALUES (@temp_order_id, 'TEST_ORD_FOR_TCK9', @user_id, @ticket_type_id, @valid_route, 1, 7000, 'PAID', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()));

     INSERT INTO tickets (order_id, route_id, ticket_code, qr_payload, status, valid_from, valid_until)
     VALUES (@temp_order_id, @bad_route_id, 'TEST_TCK_BAD_ROUTE', 'QR_JWT', 'ACTIVE', SYSUTCDATETIME(), DATEADD(DAY, 1, SYSUTCDATETIME()));
    `,
    { user_id: validUser, ticket_type_id: validTicketType, valid_route: validRoute, bad_route_id: NON_EXISTENT_UUID_1 },
    [547]
  );
  await pool.request().query("DELETE FROM orders WHERE order_code = 'TEST_ORD_FOR_TCK9'");

  // FK-10: tickets.used_by_inspector_id
  await assertThrowsSqlError(
    'FK-10',
    'Foreign Key',
    'Reject tickets referencing non-existent used_by_inspector_id',
    `DECLARE @temp_order_id UNIQUEIDENTIFIER = NEWID();
     INSERT INTO orders (id, order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
     VALUES (@temp_order_id, 'TEST_ORD_FOR_TCK10', @user_id, @ticket_type_id, @valid_route, 1, 7000, 'PAID', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()));

     INSERT INTO tickets (order_id, route_id, ticket_code, qr_payload, status, valid_from, valid_until, used_at, used_by_inspector_id)
     VALUES (@temp_order_id, @valid_route, 'TEST_TCK_BAD_INSP', 'QR_JWT', 'USED', SYSUTCDATETIME(), DATEADD(DAY, 1, SYSUTCDATETIME()), SYSUTCDATETIME(), @bad_user_id);
    `,
    { user_id: validUser, ticket_type_id: validTicketType, valid_route: validRoute, bad_user_id: NON_EXISTENT_UUID_1 },
    [547]
  );
  await pool.request().query("DELETE FROM orders WHERE order_code = 'TEST_ORD_FOR_TCK10'");

  // FK-11: payment_transactions.order_id
  await assertThrowsSqlError(
    'FK-11',
    'Foreign Key',
    'Reject payment_transactions referencing non-existent order_id',
    `INSERT INTO payment_transactions (order_id, sepay_reference_code, transfer_amount, raw_content)
     VALUES (@order_id, 'SEPAY_REF_BAD', 7000, 'BAD ORDER')`,
    { order_id: NON_EXISTENT_UUID_1 },
    [547]
  );

  // FK-12: complaints.user_id
  await assertThrowsSqlError(
    'FK-12',
    'Foreign Key',
    'Reject complaints referencing non-existent user_id',
    `INSERT INTO complaints (user_id, route_id, category, content, status)
     VALUES (@user_id, @route_id, 'SERVICE', 'Complaint test bad user', 'NEW')`,
    { user_id: NON_EXISTENT_UUID_1, route_id: validRoute },
    [547]
  );

  // FK-13: complaints.route_id
  await assertThrowsSqlError(
    'FK-13',
    'Foreign Key',
    'Reject complaints referencing non-existent route_id',
    `INSERT INTO complaints (user_id, route_id, category, content, status)
     VALUES (@user_id, @route_id, 'SERVICE', 'Complaint test bad route', 'NEW')`,
    { user_id: validUser, route_id: NON_EXISTENT_UUID_1 },
    [547]
  );

  // ===========================================================================
  // SECTION 2: CASCADE DELETE VS NO ACTION INTEGRITY RULES
  // ===========================================================================
  console.log('\n--- SECTION 2: Cascade Delete vs NO ACTION Rules ---');

  // CAS-01: route_stops.route_id ON DELETE CASCADE
  try {
    const tempRouteId = 'f0000001-0000-0000-0000-000000000001';
    const tempStopId = 'f0000001-0000-0000-0000-000000000002';

    await pool.request().query(`
      INSERT INTO bus_routes (id, route_code, route_name, direction, description)
      VALUES ('${tempRouteId}', 'TEST_CAS_R1', 'Cascade Test Route', 'FORWARD', 'Test');

      INSERT INTO bus_stops (id, stop_name, latitude, longitude)
      VALUES ('${tempStopId}', 'Cascade Test Stop', 21.0, 105.0);

      INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
      VALUES ('${tempRouteId}', '${tempStopId}', 1, 0.0);
    `);

    // Delete route -> MUST cascade delete route_stops
    await pool.request().query(`DELETE FROM bus_routes WHERE id = '${tempRouteId}'`);

    const routeStopCheck = await pool.request().query(`SELECT COUNT(*) AS cnt FROM route_stops WHERE route_id = '${tempRouteId}'`);
    const stopCheck = await pool.request().query(`SELECT COUNT(*) AS cnt FROM bus_stops WHERE id = '${tempStopId}'`);

    const cascadeSuccess = routeStopCheck.recordset[0].cnt === 0 && stopCheck.recordset[0].cnt === 1;
    recordResult(
      'CAS-01',
      'Cascade Delete',
      'DELETE bus_routes automatically cascades to route_stops, leaving bus_stops intact',
      cascadeSuccess,
      `route_stops count: ${routeStopCheck.recordset[0].cnt}, stop preserved count: ${stopCheck.recordset[0].cnt}`
    );

    await pool.request().query(`DELETE FROM bus_stops WHERE id = '${tempStopId}'`);
  } catch (err) {
    recordResult('CAS-01', 'Cascade Delete', 'DELETE bus_routes cascade test failed', false, err.message);
  }

  // NOACT-01: route_stops.stop_id NO ACTION (Deleting bus_stop referenced in route_stops MUST FAIL)
  try {
    const tempRouteId = 'f0000002-0000-0000-0000-000000000001';
    const tempStopId = 'f0000002-0000-0000-0000-000000000002';

    await pool.request().query(`
      INSERT INTO bus_routes (id, route_code, route_name, direction, description)
      VALUES ('${tempRouteId}', 'TEST_NOACT_R1', 'No Action Test Route', 'FORWARD', 'Test');

      INSERT INTO bus_stops (id, stop_name, latitude, longitude)
      VALUES ('${tempStopId}', 'No Action Test Stop', 21.0, 105.0);

      INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
      VALUES ('${tempRouteId}', '${tempStopId}', 1, 0.0);
    `);

    let threwExpected = false;
    let errMsg = '';
    try {
      await pool.request().query(`DELETE FROM bus_stops WHERE id = '${tempStopId}'`);
    } catch (delErr) {
      if (delErr.number === 547) {
        threwExpected = true;
        errMsg = `SQL Error 547 (${delErr.message.split('.')[0]})`;
      } else {
        errMsg = `Unexpected error: ${delErr.message}`;
      }
    }

    recordResult(
      'NOACT-01',
      'NO ACTION Restriction',
      'DELETE bus_stops referenced in route_stops is strictly BLOCKED (Error 547)',
      threwExpected,
      errMsg
    );

    await pool.request().query(`DELETE FROM bus_routes WHERE id = '${tempRouteId}'`);
    await pool.request().query(`DELETE FROM bus_stops WHERE id = '${tempStopId}'`);
  } catch (err) {
    recordResult('NOACT-01', 'NO ACTION Restriction', 'Stop deletion NO ACTION test failed', false, err.message);
  }

  // CAS-02: tickets.order_id ON DELETE CASCADE
  try {
    const tempOrderId = 'f0000003-0000-0000-0000-000000000001';
    const tempTicketId = 'f0000003-0000-0000-0000-000000000002';

    await pool.request().query(`
      INSERT INTO orders (id, order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
      VALUES ('${tempOrderId}', 'TEST_CAS_ORD1', '${validUser}', '${validTicketType}', '${validRoute}', 1, 7000, 'PAID', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()));

      INSERT INTO tickets (id, order_id, route_id, ticket_code, qr_payload, status, valid_from, valid_until)
      VALUES ('${tempTicketId}', '${tempOrderId}', '${validRoute}', 'TEST_CAS_TCK1', 'QR_JWT_TEST', 'ACTIVE', SYSUTCDATETIME(), DATEADD(DAY, 1, SYSUTCDATETIME()));
    `);

    await pool.request().query(`DELETE FROM orders WHERE id = '${tempOrderId}'`);

    const tckCheck = await pool.request().query(`SELECT COUNT(*) AS cnt FROM tickets WHERE id = '${tempTicketId}'`);
    const cascadeSuccess = tckCheck.recordset[0].cnt === 0;

    recordResult(
      'CAS-02',
      'Cascade Delete',
      'DELETE orders automatically cascades to tickets',
      cascadeSuccess,
      `Remaining tickets count: ${tckCheck.recordset[0].cnt}`
    );
  } catch (err) {
    recordResult('CAS-02', 'Cascade Delete', 'DELETE orders cascade test failed', false, err.message);
  }

  // NOACT-02: orders.ticket_type_id NO ACTION (Deleting ticket_type referenced in orders MUST FAIL)
  try {
    const tempTicketTypeId = 'f0000004-0000-0000-0000-000000000001';
    const tempOrderId = 'f0000004-0000-0000-0000-000000000002';

    await pool.request().query(`
      INSERT INTO ticket_types (id, category, name, price, validity_hours, is_student_price, is_active)
      VALUES ('${tempTicketTypeId}', 'SINGLE_RIDE', 'Temp TT', 5000, 2, 0, 1);

      INSERT INTO orders (id, order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
      VALUES ('${tempOrderId}', 'TEST_NOACT_TT_ORD', '${validUser}', '${tempTicketTypeId}', '${validRoute}', 1, 5000, 'PENDING', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()));
    `);

    let threwExpected = false;
    let errMsg = '';
    try {
      await pool.request().query(`DELETE FROM ticket_types WHERE id = '${tempTicketTypeId}'`);
    } catch (delErr) {
      if (delErr.number === 547) {
        threwExpected = true;
        errMsg = `SQL Error 547 (${delErr.message.split('.')[0]})`;
      } else {
        errMsg = `Unexpected error: ${delErr.message}`;
      }
    }

    recordResult(
      'NOACT-02',
      'NO ACTION Restriction',
      'DELETE ticket_types referenced in orders is strictly BLOCKED (Error 547)',
      threwExpected,
      errMsg
    );

    await pool.request().query(`DELETE FROM orders WHERE id = '${tempOrderId}'`);
    await pool.request().query(`DELETE FROM ticket_types WHERE id = '${tempTicketTypeId}'`);
  } catch (err) {
    recordResult('NOACT-02', 'NO ACTION Restriction', 'Ticket type NO ACTION test failed', false, err.message);
  }

  // NOACT-03: orders.user_id NO ACTION (Deleting user referenced in orders MUST FAIL)
  try {
    const tempUserId = 'f0000005-0000-0000-0000-000000000001';
    const tempOrderId = 'f0000005-0000-0000-0000-000000000002';

    await pool.request().query(`
      INSERT INTO users (id, full_name, email, role)
      VALUES ('${tempUserId}', 'Temp User', 'temp_user_noact@busticket.vn', 'passenger');

      INSERT INTO orders (id, order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
      VALUES ('${tempOrderId}', 'TEST_NOACT_USR_ORD', '${tempUserId}', '${validTicketType}', '${validRoute}', 1, 7000, 'PENDING', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()));
    `);

    let threwExpected = false;
    let errMsg = '';
    try {
      await pool.request().query(`DELETE FROM users WHERE id = '${tempUserId}'`);
    } catch (delErr) {
      if (delErr.number === 547) {
        threwExpected = true;
        errMsg = `SQL Error 547 (${delErr.message.split('.')[0]})`;
      } else {
        errMsg = `Unexpected error: ${delErr.message}`;
      }
    }

    recordResult(
      'NOACT-03',
      'NO ACTION Restriction',
      'DELETE users referenced in orders is strictly BLOCKED (Error 547)',
      threwExpected,
      errMsg
    );

    await pool.request().query(`DELETE FROM orders WHERE id = '${tempOrderId}'`);
    await pool.request().query(`DELETE FROM users WHERE id = '${tempUserId}'`);
  } catch (err) {
    recordResult('NOACT-03', 'NO ACTION Restriction', 'User NO ACTION test failed', false, err.message);
  }

  // NOACT-04: payment_transactions.order_id NO ACTION (Deleting order referenced in payment_transactions MUST FAIL)
  try {
    const tempOrderId = 'f0000006-0000-0000-0000-000000000001';
    const tempTxId = 'f0000006-0000-0000-0000-000000000002';

    await pool.request().query(`
      INSERT INTO orders (id, order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
      VALUES ('${tempOrderId}', 'TEST_NOACT_TX_ORD', '${validUser}', '${validTicketType}', '${validRoute}', 1, 7000, 'PAID', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()));

      INSERT INTO payment_transactions (id, order_id, sepay_reference_code, transfer_amount, raw_content)
      VALUES ('${tempTxId}', '${tempOrderId}', 'SEPAY_REF_NOACT', 7000, 'Content');
    `);

    let threwExpected = false;
    let errMsg = '';
    try {
      await pool.request().query(`DELETE FROM orders WHERE id = '${tempOrderId}'`);
    } catch (delErr) {
      if (delErr.number === 547) {
        threwExpected = true;
        errMsg = `SQL Error 547 (${delErr.message.split('.')[0]})`;
      } else {
        errMsg = `Unexpected error: ${delErr.message}`;
      }
    }

    recordResult(
      'NOACT-04',
      'NO ACTION Restriction',
      'DELETE orders referenced in payment_transactions is strictly BLOCKED (Error 547)',
      threwExpected,
      errMsg
    );

    await pool.request().query(`DELETE FROM payment_transactions WHERE id = '${tempTxId}'`);
    await pool.request().query(`DELETE FROM orders WHERE id = '${tempOrderId}'`);
  } catch (err) {
    recordResult('NOACT-04', 'NO ACTION Restriction', 'Order NO ACTION with transactions failed', false, err.message);
  }

  // ===========================================================================
  // SECTION 3: UNIQUE CONSTRAINT VIOLATIONS (Error 2627 / 2601)
  // ===========================================================================
  console.log('\n--- SECTION 3: Unique Constraint Violations ---');

  // UQ-01: users.email
  await assertThrowsSqlError(
    'UQ-01',
    'Unique Constraint',
    'Reject duplicate email in users (existing: admin@busticket.vn)',
    `INSERT INTO users (full_name, email, role) VALUES ('Duplicate Admin', 'admin@busticket.vn', 'passenger')`,
    {},
    [2627, 2601]
  );

  // UQ-02: users.phone
  try {
    const tempUserPhone = 'f0000007-0000-0000-0000-000000000001';
    await pool.request().query(`
      INSERT INTO users (id, full_name, phone, role)
      VALUES ('${tempUserPhone}', 'Phone User 1', '0912345678', 'passenger');
    `);

    await assertThrowsSqlError(
      'UQ-02',
      'Unique Constraint',
      'Reject duplicate phone in users (phone: 0912345678)',
      `INSERT INTO users (full_name, phone, role) VALUES ('Phone User 2', '0912345678', 'passenger')`,
      {},
      [2627, 2601]
    );

    await pool.request().query(`DELETE FROM users WHERE id = '${tempUserPhone}'`);
  } catch (err) {
    recordResult('UQ-02', 'Unique Constraint', 'Duplicate phone test error', false, err.message);
  }

  // UQ-03: bus_routes.route_code
  await assertThrowsSqlError(
    'UQ-03',
    'Unique Constraint',
    'Reject duplicate route_code in bus_routes (existing: 01)',
    `INSERT INTO bus_routes (route_code, route_name, direction) VALUES ('01', 'Duplicate Route 01', 'BACKWARD')`,
    {},
    [2627, 2601]
  );

  // UQ-04: buses.license_plate
  await assertThrowsSqlError(
    'UQ-04',
    'Unique Constraint',
    'Reject duplicate license_plate in buses (existing: 29B-123.45)',
    `INSERT INTO buses (license_plate, capacity) VALUES ('29B-123.45', 40)`,
    {},
    [2627, 2601]
  );

  // UQ-05: route_stops(route_id, stop_sequence) composite unique (uq_route_sequence)
  await assertThrowsSqlError(
    'UQ-05',
    'Unique Constraint',
    'Reject duplicate (route_id, stop_sequence) in route_stops (Route 01, sequence 1)',
    `INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
     VALUES (@route_id, @stop_id, 1, 99.0)`,
    { route_id: validRoute, stop_id: validStop },
    [2627, 2601]
  );

  // UQ-06: orders.order_code
  try {
    const tempOrderCodeId = 'f0000008-0000-0000-0000-000000000001';
    await pool.request().query(`
      INSERT INTO orders (id, order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
      VALUES ('${tempOrderCodeId}', 'TEST_DUP_ORD_CODE', '${validUser}', '${validTicketType}', '${validRoute}', 1, 7000, 'PENDING', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()));
    `);

    await assertThrowsSqlError(
      'UQ-06',
      'Unique Constraint',
      'Reject duplicate order_code in orders',
      `INSERT INTO orders (order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
       VALUES ('TEST_DUP_ORD_CODE', @user_id, @ticket_type_id, @route_id, 1, 7000, 'PENDING', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()))`,
      { user_id: validUser, ticket_type_id: validTicketType, route_id: validRoute },
      [2627, 2601]
    );

    await pool.request().query(`DELETE FROM orders WHERE id = '${tempOrderCodeId}'`);
  } catch (err) {
    recordResult('UQ-06', 'Unique Constraint', 'Duplicate order_code test error', false, err.message);
  }

  // UQ-07: tickets.ticket_code
  try {
    const tempOrderId = 'f0000009-0000-0000-0000-000000000001';
    const tempTicketId = 'f0000009-0000-0000-0000-000000000002';

    await pool.request().query(`
      INSERT INTO orders (id, order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
      VALUES ('${tempOrderId}', 'TEST_DUP_TCK_ORD', '${validUser}', '${validTicketType}', '${validRoute}', 1, 7000, 'PAID', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()));

      INSERT INTO tickets (id, order_id, route_id, ticket_code, qr_payload, status, valid_from, valid_until)
      VALUES ('${tempTicketId}', '${tempOrderId}', '${validRoute}', 'TEST_DUP_TCK_CODE', 'QR_JWT', 'ACTIVE', SYSUTCDATETIME(), DATEADD(DAY, 1, SYSUTCDATETIME()));
    `);

    await assertThrowsSqlError(
      'UQ-07',
      'Unique Constraint',
      'Reject duplicate ticket_code in tickets',
      `INSERT INTO tickets (order_id, route_id, ticket_code, qr_payload, status, valid_from, valid_until)
       VALUES (@order_id, @route_id, 'TEST_DUP_TCK_CODE', 'QR_JWT_2', 'ACTIVE', SYSUTCDATETIME(), DATEADD(DAY, 1, SYSUTCDATETIME()))`,
      { order_id: tempOrderId, route_id: validRoute },
      [2627, 2601]
    );

    await pool.request().query(`DELETE FROM orders WHERE id = '${tempOrderId}'`);
  } catch (err) {
    recordResult('UQ-07', 'Unique Constraint', 'Duplicate ticket_code test error', false, err.message);
  }

  // ===========================================================================
  // SECTION 4: CHECK CONSTRAINTS & ENUM VALIDATIONS (Error 547)
  // ===========================================================================
  console.log('\n--- SECTION 4: Check Constraints & Valid Enum Sets ---');

  // CHK-01: users.role CHECK (role IN ('passenger', 'inspector', 'admin'))
  await assertThrowsSqlError(
    'CHK-01',
    'Check Constraint',
    "Reject invalid users.role = 'superadmin'",
    `INSERT INTO users (full_name, email, role) VALUES ('Hacker', 'hacker@busticket.vn', 'superadmin')`,
    {},
    [547]
  );

  // CHK-02: bus_routes.direction CHECK (direction IN ('FORWARD', 'BACKWARD'))
  await assertThrowsSqlError(
    'CHK-02',
    'Check Constraint',
    "Reject invalid bus_routes.direction = 'CIRCULAR'",
    `INSERT INTO bus_routes (route_code, route_name, direction) VALUES ('99', 'Circular Route', 'CIRCULAR')`,
    {},
    [547]
  );

  // CHK-03: ticket_types.category CHECK (category IN ('SINGLE_RIDE', 'DAILY_PASS', 'MONTHLY_PASS'))
  await assertThrowsSqlError(
    'CHK-03',
    'Check Constraint',
    "Reject invalid ticket_types.category = 'YEARLY_PASS'",
    `INSERT INTO ticket_types (category, name, price) VALUES ('YEARLY_PASS', 'Yearly Pass', 1000000)`,
    {},
    [547]
  );

  // CHK-04: orders.status CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED'))
  await assertThrowsSqlError(
    'CHK-04',
    'Check Constraint',
    "Reject invalid orders.status = 'REFUNDED'",
    `INSERT INTO orders (order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
     VALUES ('TEST_CHK_ORD', @user_id, @ticket_type_id, @route_id, 1, 7000, 'REFUNDED', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()))`,
    { user_id: validUser, ticket_type_id: validTicketType, route_id: validRoute },
    [547]
  );

  // CHK-05: tickets.status CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'))
  try {
    const tempOrderId = 'f0000010-0000-0000-0000-000000000001';
    await pool.request().query(`
      INSERT INTO orders (id, order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
      VALUES ('${tempOrderId}', 'TEST_CHK_TCK_ORD', '${validUser}', '${validTicketType}', '${validRoute}', 1, 7000, 'PAID', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()));
    `);

    await assertThrowsSqlError(
      'CHK-05',
      'Check Constraint',
      "Reject invalid tickets.status = 'SUSPENDED'",
      `INSERT INTO tickets (order_id, route_id, ticket_code, qr_payload, status, valid_from, valid_until)
       VALUES (@order_id, @route_id, 'TEST_CHK_TCK_CODE', 'QR_JWT', 'SUSPENDED', SYSUTCDATETIME(), DATEADD(DAY, 1, SYSUTCDATETIME()))`,
      { order_id: tempOrderId, route_id: validRoute },
      [547]
    );

    await pool.request().query(`DELETE FROM orders WHERE id = '${tempOrderId}'`);
  } catch (err) {
    recordResult('CHK-05', 'Check Constraint', 'tickets.status check test error', false, err.message);
  }

  // CHK-06: complaints.status CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED'))
  await assertThrowsSqlError(
    'CHK-06',
    'Check Constraint',
    "Reject invalid complaints.status = 'DISMISSED'",
    `INSERT INTO complaints (user_id, route_id, category, content, status)
     VALUES (@user_id, @route_id, 'SERVICE', 'Complaint content', 'DISMISSED')`,
    { user_id: validUser, route_id: validRoute },
    [547]
  );

  // ===========================================================================
  // SECTION 5: NOT NULL CONSTRAINTS ON ESSENTIAL COLUMNS (Error 515)
  // ===========================================================================
  console.log('\n--- SECTION 5: NOT NULL Constraints on Essential Columns ---');

  // NN-01: users.full_name NOT NULL
  await assertThrowsSqlError(
    'NN-01',
    'Not Null Constraint',
    'Reject NULL users.full_name',
    `INSERT INTO users (full_name, email, role) VALUES (NULL, 'nullname@busticket.vn', 'passenger')`,
    {},
    [515]
  );

  // NN-02: bus_routes.route_code NOT NULL
  await assertThrowsSqlError(
    'NN-02',
    'Not Null Constraint',
    'Reject NULL bus_routes.route_code',
    `INSERT INTO bus_routes (route_code, route_name, direction) VALUES (NULL, 'Null Code Route', 'FORWARD')`,
    {},
    [515]
  );

  // NN-03: bus_stops.latitude NOT NULL
  await assertThrowsSqlError(
    'NN-03',
    'Not Null Constraint',
    'Reject NULL bus_stops.latitude',
    `INSERT INTO bus_stops (stop_name, latitude, longitude) VALUES ('Null Lat Stop', NULL, 105.0)`,
    {},
    [515]
  );

  // NN-04: route_stops.stop_sequence NOT NULL
  await assertThrowsSqlError(
    'NN-04',
    'Not Null Constraint',
    'Reject NULL route_stops.stop_sequence',
    `INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
     VALUES (@route_id, @stop_id, NULL, 5.0)`,
    { route_id: validRoute, stop_id: validStop },
    [515]
  );

  // NN-05: ticket_types.price NOT NULL
  await assertThrowsSqlError(
    'NN-05',
    'Not Null Constraint',
    'Reject NULL ticket_types.price',
    `INSERT INTO ticket_types (category, name, price) VALUES ('SINGLE_RIDE', 'Null Price Pass', NULL)`,
    {},
    [515]
  );

  // NN-06: orders.total_amount NOT NULL
  await assertThrowsSqlError(
    'NN-06',
    'Not Null Constraint',
    'Reject NULL orders.total_amount',
    `INSERT INTO orders (order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
     VALUES ('TEST_NN_ORD', @user_id, @ticket_type_id, @route_id, 1, NULL, 'PENDING', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()))`,
    { user_id: validUser, ticket_type_id: validTicketType, route_id: validRoute },
    [515]
  );

  // NN-07: tickets.qr_payload NOT NULL
  try {
    const tempOrderId = 'f0000011-0000-0000-0000-000000000001';
    await pool.request().query(`
      INSERT INTO orders (id, order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
      VALUES ('${tempOrderId}', 'TEST_NN_TCK_ORD', '${validUser}', '${validTicketType}', '${validRoute}', 1, 7000, 'PAID', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()));
    `);

    await assertThrowsSqlError(
      'NN-07',
      'Not Null Constraint',
      'Reject NULL tickets.qr_payload',
      `INSERT INTO tickets (order_id, route_id, ticket_code, qr_payload, status, valid_from, valid_until)
       VALUES (@order_id, @route_id, 'TEST_NN_TCK_CODE', NULL, 'ACTIVE', SYSUTCDATETIME(), DATEADD(DAY, 1, SYSUTCDATETIME()))`,
      { order_id: tempOrderId, route_id: validRoute },
      [515]
    );

    await pool.request().query(`DELETE FROM orders WHERE id = '${tempOrderId}'`);
  } catch (err) {
    recordResult('NN-07', 'Not Null Constraint', 'tickets.qr_payload NOT NULL test error', false, err.message);
  }

  // Final cleanup
  await cleanupLeftovers();

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================================');
  console.log(`📊 ADVERSARIAL STRESS TEST SUMMARY`);
  console.log(`   Total Boundary Challenges: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);
  console.log('================================================================================\n');

  await pool.close();

  if (failedTests > 0) {
    console.error(`❌ EMPIRICAL VERDICT: REJECT (${failedTests} constraints failed adversarial validation)`);
    process.exit(1);
  } else {
    console.log(`✅ EMPIRICAL VERDICT: APPROVE (All ${totalTests} schema boundary constraints verified 100% strictly enforced)`);
    process.exit(0);
  }
}

runAdversarialTests().catch((err) => {
  console.error('Unhandled harness failure:', err);
  process.exit(1);
});
