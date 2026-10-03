import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sql from 'mssql';

const dbConfig: sql.config = {
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
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

const NON_EXISTENT_UUID = '99999999-9999-9999-9999-999999999999';

describe('Tier 2: Database Schema & Relational Constraints (Adversarial M1.2)', () => {
  let pool: sql.ConnectionPool;
  let validUser: string;
  let validRoute: string;
  let validStop: string;
  let validBus: string;
  let validTicketType: string;

  beforeAll(async () => {
    const maxRetries = 3;
    let lastErr: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        pool = await sql.connect(dbConfig);
        break;
      } catch (err: any) {
        lastErr = err;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    if (!pool || !pool.connected) {
      throw new Error(`Failed to connect to database in boundary-schema-constraints after ${maxRetries} attempts: ${lastErr?.message || lastErr}`);
    }

    const userRes = await pool.request().query<{ id: string }>("SELECT TOP 1 id FROM users WHERE role = 'admin'");
    validUser = userRes.recordset[0]?.id;

    const routeRes = await pool.request().query<{ id: string }>("SELECT TOP 1 id FROM bus_routes WHERE route_code = '01'");
    validRoute = routeRes.recordset[0]?.id;

    const stopRes = await pool.request().query<{ id: string }>("SELECT TOP 1 id FROM bus_stops");
    validStop = stopRes.recordset[0]?.id;

    const busRes = await pool.request().query<{ id: string }>("SELECT TOP 1 id FROM buses");
    validBus = busRes.recordset[0]?.id;

    const ttRes = await pool.request().query<{ id: string }>("SELECT TOP 1 id FROM ticket_types");
    validTicketType = ttRes.recordset[0]?.id;
  }, 35000);

  afterAll(async () => {
    // Teardown test artifacts
    if (pool) {
      try {
        await pool.request().query("DELETE FROM complaints WHERE content LIKE '%T2-TEST%'");
        await pool.request().query("DELETE FROM payment_transactions WHERE sepay_reference_code LIKE 'T2-SEPAY%'");
        await pool.request().query("DELETE FROM tickets WHERE ticket_code LIKE 'T2-TCK%'");
        await pool.request().query("DELETE FROM orders WHERE order_code LIKE 'T2-ORD%'");
        await pool.request().query("DELETE FROM route_stops WHERE stop_sequence >= 800");
        await pool.request().query("DELETE FROM bus_routes WHERE route_code LIKE 'T2-R%'");
        await pool.request().query("DELETE FROM bus_stops WHERE stop_name LIKE 'T2-Stop%'");
        await pool.request().query("DELETE FROM users WHERE email LIKE '%t2test%'");
        await pool.request().query("DELETE FROM ticket_types WHERE name LIKE 'T2-TT%'");
      } catch {}
      try {
        if (pool.connected) {
          await pool.close();
        }
      } catch {}
    }
  });

  describe('Foreign Key Rejections on Non-Existent Parents (Error 547)', () => {
    it('FK-RS-01: Should reject route_stops referencing non-existent route_id', async () => {
      await expect(
        pool.request()
          .input('route_id', NON_EXISTENT_UUID)
          .input('stop_id', validStop)
          .query('INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km) VALUES (@route_id, @stop_id, 801, 10.0)')
      ).rejects.toThrow();
    });

    it('FK-RS-02: Should reject route_stops referencing non-existent stop_id', async () => {
      await expect(
        pool.request()
          .input('route_id', validRoute)
          .input('stop_id', NON_EXISTENT_UUID)
          .query('INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km) VALUES (@route_id, @stop_id, 802, 10.0)')
      ).rejects.toThrow();
    });

    it('FK-ORD-01: Should reject orders referencing non-existent user_id', async () => {
      await expect(
        pool.request()
          .input('user_id', NON_EXISTENT_UUID)
          .input('ticket_type_id', validTicketType)
          .input('route_id', validRoute)
          .query(`INSERT INTO orders (order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
                  VALUES ('T2-ORD-BAD-USER', @user_id, @ticket_type_id, @route_id, 1, 7000, 'PENDING', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()))`)
      ).rejects.toThrow();
    });

    it('FK-ORD-02: Should reject orders referencing non-existent ticket_type_id', async () => {
      await expect(
        pool.request()
          .input('user_id', validUser)
          .input('ticket_type_id', NON_EXISTENT_UUID)
          .input('route_id', validRoute)
          .query(`INSERT INTO orders (order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
                  VALUES ('T2-ORD-BAD-TT', @user_id, @ticket_type_id, @route_id, 1, 7000, 'PENDING', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()))`)
      ).rejects.toThrow();
    });

    it('FK-TCK-01: Should reject tickets referencing non-existent order_id', async () => {
      await expect(
        pool.request()
          .input('order_id', NON_EXISTENT_UUID)
          .input('route_id', validRoute)
          .query(`INSERT INTO tickets (order_id, route_id, ticket_code, qr_payload, status, valid_from, valid_until)
                  VALUES (@order_id, @route_id, 'T2-TCK-BAD-ORD', 'QR_JWT', 'ACTIVE', SYSUTCDATETIME(), DATEADD(DAY, 1, SYSUTCDATETIME()))`)
      ).rejects.toThrow();
    });

    it('FK-SCH-01: Should reject schedules referencing non-existent bus_id', async () => {
      await expect(
        pool.request()
          .input('route_id', validRoute)
          .input('bus_id', NON_EXISTENT_UUID)
          .query(`INSERT INTO schedules (route_id, bus_id, departure_time, average_speed_kmh, days_of_week)
                  VALUES (@route_id, @bus_id, '14:00:00', 20.0, 'MON-SUN')`)
      ).rejects.toThrow();
    });
  });

  describe('Cascade Delete vs NO ACTION Integrity Rules', () => {
    it('CAS-01: Deleting a bus_route must CASCADE delete its route_stops while preserving bus_stops', async () => {
      const tempRouteId = 'e1111111-0000-0000-0000-000000000001';
      const tempStopId = 'e1111111-0000-0000-0000-000000000002';

      await pool.request().query(`
        INSERT INTO bus_routes (id, route_code, route_name, direction)
        VALUES ('${tempRouteId}', 'T2-R-CAS1', 'Temp Cascade Route', 'FORWARD');

        INSERT INTO bus_stops (id, stop_name, latitude, longitude)
        VALUES ('${tempStopId}', 'T2-Stop-CAS1', 21.0, 105.0);

        INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
        VALUES ('${tempRouteId}', '${tempStopId}', 1, 0.0);
      `);

      // Delete route
      await pool.request().query(`DELETE FROM bus_routes WHERE id = '${tempRouteId}'`);

      // Verify cascade
      const rsCount = await pool.request().query<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM route_stops WHERE route_id = '${tempRouteId}'`);
      expect(rsCount.recordset[0].cnt).toBe(0);

      // Verify stop preserved
      const stopCount = await pool.request().query<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM bus_stops WHERE id = '${tempStopId}'`);
      expect(stopCount.recordset[0].cnt).toBe(1);

      // Teardown stop
      await pool.request().query(`DELETE FROM bus_stops WHERE id = '${tempStopId}'`);
    });

    it('NOACT-01: Deleting a bus_stop referenced in route_stops must FAIL (NO ACTION Error 547)', async () => {
      const tempRouteId = 'e2222222-0000-0000-0000-000000000001';
      const tempStopId = 'e2222222-0000-0000-0000-000000000002';

      await pool.request().query(`
        INSERT INTO bus_routes (id, route_code, route_name, direction)
        VALUES ('${tempRouteId}', 'T2-R-NOACT1', 'Temp Route', 'FORWARD');

        INSERT INTO bus_stops (id, stop_name, latitude, longitude)
        VALUES ('${tempStopId}', 'T2-Stop-NOACT1', 21.0, 105.0);

        INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
        VALUES ('${tempRouteId}', '${tempStopId}', 1, 0.0);
      `);

      // Attempt to delete stop directly -> must fail
      await expect(
        pool.request().query(`DELETE FROM bus_stops WHERE id = '${tempStopId}'`)
      ).rejects.toThrow();

      // Clean up route (cascades route_stops) then stop
      await pool.request().query(`DELETE FROM bus_routes WHERE id = '${tempRouteId}'`);
      await pool.request().query(`DELETE FROM bus_stops WHERE id = '${tempStopId}'`);
    });

    it('CAS-02: Deleting an order must CASCADE delete its tickets', async () => {
      const tempOrderId = 'e3333333-0000-0000-0000-000000000001';
      const tempTicketId = 'e3333333-0000-0000-0000-000000000002';

      await pool.request().query(`
        INSERT INTO orders (id, order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
        VALUES ('${tempOrderId}', 'T2-ORD-CAS2', '${validUser}', '${validTicketType}', '${validRoute}', 1, 7000, 'PAID', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()));

        INSERT INTO tickets (id, order_id, route_id, ticket_code, qr_payload, status, valid_from, valid_until)
        VALUES ('${tempTicketId}', '${tempOrderId}', '${validRoute}', 'T2-TCK-CAS2', 'QR_JWT', 'ACTIVE', SYSUTCDATETIME(), DATEADD(DAY, 1, SYSUTCDATETIME()));
      `);

      await pool.request().query(`DELETE FROM orders WHERE id = '${tempOrderId}'`);

      const tckCount = await pool.request().query<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM tickets WHERE id = '${tempTicketId}'`);
      expect(tckCount.recordset[0].cnt).toBe(0);
    });

    it('NOACT-02: Deleting a ticket_type referenced in orders must FAIL (NO ACTION Error 547)', async () => {
      const tempTtId = 'e4444444-0000-0000-0000-000000000001';
      const tempOrderId = 'e4444444-0000-0000-0000-000000000002';

      await pool.request().query(`
        INSERT INTO ticket_types (id, category, name, price, validity_hours, is_student_price, is_active)
        VALUES ('${tempTtId}', 'SINGLE_RIDE', 'T2-TT-NOACT', 5000, 2, 0, 1);

        INSERT INTO orders (id, order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
        VALUES ('${tempOrderId}', 'T2-ORD-NOACT-TT', '${validUser}', '${tempTtId}', '${validRoute}', 1, 5000, 'PENDING', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()));
      `);

      await expect(
        pool.request().query(`DELETE FROM ticket_types WHERE id = '${tempTtId}'`)
      ).rejects.toThrow();

      await pool.request().query(`DELETE FROM orders WHERE id = '${tempOrderId}'`);
      await pool.request().query(`DELETE FROM ticket_types WHERE id = '${tempTtId}'`);
    });
  });

  describe('Unique Constraints (Error 2627 / 2601)', () => {
    it('UQ-01: Should reject duplicate email in users', async () => {
      await expect(
        pool.request().query("INSERT INTO users (full_name, email, role) VALUES ('Dup Admin', 'admin@busticket.vn', 'passenger')")
      ).rejects.toThrow();
    });

    it('UQ-02: Should reject duplicate route_code in bus_routes', async () => {
      await expect(
        pool.request().query("INSERT INTO bus_routes (route_code, route_name, direction) VALUES ('01', 'Dup Route 01', 'BACKWARD')")
      ).rejects.toThrow();
    });

    it('UQ-03: Should reject duplicate (route_id, stop_sequence) in route_stops', async () => {
      await expect(
        pool.request()
          .input('route_id', validRoute)
          .input('stop_id', validStop)
          .query('INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km) VALUES (@route_id, @stop_id, 1, 99.0)')
      ).rejects.toThrow();
    });

    it('UQ-04: Should reject duplicate license_plate in buses', async () => {
      await expect(
        pool.request().query("INSERT INTO buses (license_plate, capacity) VALUES ('29B-123.45', 50)")
      ).rejects.toThrow();
    });
  });

  describe('Check Constraints & Enum Sets (Error 547)', () => {
    it('CHK-01: Should reject invalid users.role', async () => {
      await expect(
        pool.request().query("INSERT INTO users (full_name, email, role) VALUES ('Hacker', 'hacker.t2@busticket.vn', 'superadmin')")
      ).rejects.toThrow();
    });

    it('CHK-02: Should reject invalid bus_routes.direction', async () => {
      await expect(
        pool.request().query("INSERT INTO bus_routes (route_code, route_name, direction) VALUES ('T2-R-CHK', 'Test', 'CIRCULAR')")
      ).rejects.toThrow();
    });

    it('CHK-03: Should reject invalid ticket_types.category', async () => {
      await expect(
        pool.request().query("INSERT INTO ticket_types (category, name, price) VALUES ('YEARLY_PASS', 'T2-TT-Year', 99000)")
      ).rejects.toThrow();
    });

    it('CHK-04: Should reject invalid orders.status', async () => {
      await expect(
        pool.request()
          .input('user_id', validUser)
          .input('ticket_type_id', validTicketType)
          .input('route_id', validRoute)
          .query(`INSERT INTO orders (order_code, user_id, ticket_type_id, route_id, quantity, total_amount, status, activation_date, expires_at)
                  VALUES ('T2-ORD-CHK', @user_id, @ticket_type_id, @route_id, 1, 7000, 'REFUNDED', '2026-10-02', DATEADD(MINUTE, 15, SYSUTCDATETIME()))`)
      ).rejects.toThrow();
    });
  });

  describe('Not-Null Constraints (Error 515)', () => {
    it('NN-01: Should reject NULL users.full_name', async () => {
      await expect(
        pool.request().query("INSERT INTO users (full_name, email, role) VALUES (NULL, 'null.t2@busticket.vn', 'passenger')")
      ).rejects.toThrow();
    });

    it('NN-02: Should reject NULL bus_routes.route_code', async () => {
      await expect(
        pool.request().query("INSERT INTO bus_routes (route_code, route_name, direction) VALUES (NULL, 'Null Code', 'FORWARD')")
      ).rejects.toThrow();
    });

    it('NN-03: Should reject NULL route_stops.stop_sequence', async () => {
      await expect(
        pool.request()
          .input('route_id', validRoute)
          .input('stop_id', validStop)
          .query('INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km) VALUES (@route_id, @stop_id, NULL, 5.0)')
      ).rejects.toThrow();
    });
  });
});
