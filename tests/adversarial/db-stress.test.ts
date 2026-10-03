import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import sql from 'mssql';
import {
  getDbPool,
  query,
  queryOne,
  execute,
  executeReturning,
  withTransaction,
  checkConnection,
  closePool,
  dbConfig,
} from '../../lib/db';

describe('Empirical Adversarial Challenge: lib/db.ts', () => {
  beforeAll(async () => {
    const maxRetries = 3;
    let connected = false;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      connected = await checkConnection();
      if (connected) break;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    expect(connected).toBe(true);
  }, 35000);

  afterAll(async () => {
    try {
      await new Promise((r) => setTimeout(r, 500));
      await closePool();
    } catch {}
  });

  describe('1. Concurrency Stress Test (Pool Saturation & Deadlock Resistance)', () => {
    it('executes 100 queries in sustainable concurrent batches (4 x 25) without pool starvation or timeout', async () => {
      const batchSize = 25;
      const totalBatches = 4;
      const allResults: { idx: number; val: string }[] = [];
      const start = Date.now();

      for (let batch = 0; batch < totalBatches; batch++) {
        const promises = Array.from({ length: batchSize }, async (_, i) => {
          const idx = batch * batchSize + i;
          const result = await query<{ idx: number; val: string }>(
            'SELECT @idx AS idx, @val AS val',
            { idx, val: `concurrent_test_${idx}` }
          );
          return result[0];
        });
        const batchResults = await Promise.all(promises);
        allResults.push(...batchResults);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      const elapsed = Date.now() - start;
      expect(allResults).toHaveLength(100);
      allResults.forEach((row, idx) => {
        expect(row.idx).toBe(idx);
        expect(row.val).toBe(`concurrent_test_${idx}`);
      });
      console.log(`[PASS] 100 queries completed across 4 sustainable batches of 25 in ${elapsed}ms`);
    });

    it('executes 20 concurrent queries with simulated database latency (WAITFOR DELAY) within thread capacity', async () => {
      // Pool max is 10. 20 queries (2x pool max) each waiting 20ms proves queueing without thread starvation
      const concurrencyCount = 20;
      const start = Date.now();

      const promises = Array.from({ length: concurrencyCount }, async (_, idx) => {
        const result = await query<{ worker_id: number; status: string }>(
          `WAITFOR DELAY '00:00:00.020'; SELECT @worker_id AS worker_id, 'ok' AS status;`,
          { worker_id: idx }
        );
        return result[0];
      });

      const results = await Promise.all(promises);
      const elapsed = Date.now() - start;

      expect(results).toHaveLength(concurrencyCount);
      expect(results.every((r) => r.status === 'ok')).toBe(true);
      await new Promise((r) => setTimeout(r, 30));
      console.log(`[PASS] 20 concurrent delayed queries processed through 10-connection pool in ${elapsed}ms`);
    });

    it('handles rapid sequential bursts across multiple threads', async () => {
      const burstRounds = 5;
      const burstSize = 20;

      for (let round = 0; round < burstRounds; round++) {
        const promises = Array.from({ length: burstSize }, async (_, idx) => {
          return queryOne<{ sum: number }>('SELECT @a + @b AS sum', { a: round, b: idx });
        });
        const results = await Promise.all(promises);
        expect(results).toHaveLength(burstSize);
        results.forEach((res, idx) => {
          expect(res?.sum).toBe(round + idx);
        });
        await new Promise((r) => setTimeout(r, 10));
      }
    });

    it('preserves pool health when 20 concurrent queries encounter intentional syntax errors', async () => {
      const errorPromises = Array.from({ length: 20 }, async (_, idx) => {
        try {
          await query(`SELECT MALFORMED SYNTAX @idx`, { idx });
          return 'unexpected_success';
        } catch (e: any) {
          return 'caught_error';
        }
      });

      const errorResults = await Promise.all(errorPromises);
      expect(errorResults.every((r) => r === 'caught_error')).toBe(true);
      await new Promise((r) => setTimeout(r, 20));

      // Verify connection pool is not corrupted or starved after errors
      const postCheck = await queryOne<{ ok: number }>('SELECT 1 AS ok');
      expect(postCheck?.ok).toBe(1);
    });

    it('executes concurrent ACID transactions in sustainable batches without pool deadlock', async () => {
      // Testing withTransaction concurrency across a pool of max 10 connections (2 batches of 10)
      const batchSize = 10;
      const batches = 2;
      const prefix = `concur_tx_${Date.now()}`;
      const allInsertedIds: string[] = [];

      for (let b = 0; b < batches; b++) {
        const promises = Array.from({ length: batchSize }, async (_, i) => {
          const idx = b * batchSize + i;
          return withTransaction(async (tx, reqFactory) => {
            const req = reqFactory();
            req.input('email', sql.NVarChar, `${prefix}_${idx}@test.vn`);
            req.input('phone', sql.NVarChar, `099${idx.toString().padStart(7, '0')}`);
            req.input('fullName', sql.NVarChar, `Tx User ${idx}`);
            req.input('role', sql.VarChar(20), 'passenger');
            req.input('passwordHash', sql.NVarChar, 'hash');

            const res = await req.query(`
              INSERT INTO users (id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at)
              OUTPUT INSERTED.id
              VALUES (NEWID(), @email, @phone, @fullName, @role, @passwordHash, 1, SYSUTCDATETIME(), SYSUTCDATETIME());
            `);
            return res.recordset[0].id;
          });
        });

        const ids = await Promise.all(promises);
        allInsertedIds.push(...ids);
        await new Promise((r) => setTimeout(r, 50));
      }

      expect(allInsertedIds).toHaveLength(batches * batchSize);
      expect(allInsertedIds.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);

      // Cleanup
      await execute('DELETE FROM users WHERE email LIKE @prefix', { prefix: `${prefix}%` });
    });
  });

  describe('2. ACID Transaction & Rollback Integrity', () => {
    it('rolls back all modifications when an error is thrown inside withTransaction', async () => {
      const testEmail = `rollback_test_${Date.now()}@adversarial.vivu.vn`;
      const testPhone = `098${Math.floor(1000000 + Math.random() * 9000000)}`;

      // Verify user does not exist initially
      const preCheck = await queryOne('SELECT id FROM users WHERE email = @email', { email: testEmail });
      expect(preCheck).toBeNull();

      // Attempt transaction that inserts then throws
      let errorCaught = false;
      try {
        await withTransaction(async (tx, reqFactory) => {
          const req = reqFactory();
          req.input('email', sql.NVarChar, testEmail);
          req.input('phone', sql.NVarChar, testPhone);
          req.input('fullName', sql.NVarChar, 'Rollback Test');
          req.input('role', sql.VarChar(20), 'passenger');
          req.input('passwordHash', sql.NVarChar, 'dummy');

          await req.query(`
            INSERT INTO users (id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at)
            VALUES (NEWID(), @email, @phone, @fullName, @role, @passwordHash, 1, SYSUTCDATETIME(), SYSUTCDATETIME());
          `);

          // Intentionally throw inside transaction
          throw new Error('FORCE_ROLLBACK_INTENTIONAL_ERROR');
        });
      } catch (err: any) {
        if (err.message === 'FORCE_ROLLBACK_INTENTIONAL_ERROR') {
          errorCaught = true;
        } else {
          throw err;
        }
      }

      expect(errorCaught).toBe(true);

      // Verify row was rolled back and is NOT present in database
      const postCheck = await queryOne('SELECT id FROM users WHERE email = @email', { email: testEmail });
      expect(postCheck).toBeNull();
    });

    it('rolls back multi-statement operations atomically when second operation fails', async () => {
      const email1 = `multi_step_1_${Date.now()}@adversarial.vivu.vn`;
      const phone1 = `097${Math.floor(1000000 + Math.random() * 9000000)}`;

      let errorCaught = false;
      try {
        await withTransaction(async (tx, reqFactory) => {
          // Step 1: Valid insert
          const req1 = reqFactory();
          req1.input('email', sql.NVarChar, email1);
          req1.input('phone', sql.NVarChar, phone1);
          req1.input('fullName', sql.NVarChar, 'Step 1 User');
          req1.input('role', sql.VarChar(20), 'passenger');
          req1.input('passwordHash', sql.NVarChar, 'dummy');
          await req1.query(`
            INSERT INTO users (id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at)
            VALUES (NEWID(), @email, @phone, @fullName, @role, @passwordHash, 1, SYSUTCDATETIME(), SYSUTCDATETIME());
          `);

          // Step 2: Second insert that violates constraint (duplicate email of existing admin)
          const req2 = reqFactory();
          req2.input('email', sql.NVarChar, 'admin@busticket.vn'); // Violates UNIQUE KEY
          req2.input('phone', sql.NVarChar, `096${Math.floor(1000000 + Math.random() * 9000000)}`);
          req2.input('fullName', sql.NVarChar, 'Step 2 Dupe');
          req2.input('role', sql.VarChar(20), 'admin');
          req2.input('passwordHash', sql.NVarChar, 'dummy');
          await req2.query(`
            INSERT INTO users (id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at)
            VALUES (NEWID(), @email, @phone, @fullName, @role, @passwordHash, 1, SYSUTCDATETIME(), SYSUTCDATETIME());
          `);
        });
      } catch (err: any) {
        errorCaught = true;
      }

      expect(errorCaught).toBe(true);

      // Verify Step 1 insert was completely rolled back!
      const user1 = await queryOne('SELECT id FROM users WHERE email = @email', { email: email1 });
      expect(user1).toBeNull();
    });

    it('successfully commits operations when no error is thrown inside withTransaction', async () => {
      const testEmail = `commit_test_${Date.now()}@adversarial.vivu.vn`;
      const testPhone = `095${Math.floor(1000000 + Math.random() * 9000000)}`;

      const insertedId = await withTransaction(async (tx, reqFactory) => {
        const req = reqFactory();
        req.input('email', sql.NVarChar, testEmail);
        req.input('phone', sql.NVarChar, testPhone);
        req.input('fullName', sql.NVarChar, 'Commit Test');
        req.input('role', sql.VarChar(20), 'passenger');
        req.input('passwordHash', sql.NVarChar, 'dummy');

        const result = await req.query(`
          INSERT INTO users (id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at)
          OUTPUT INSERTED.id
          VALUES (NEWID(), @email, @phone, @fullName, @role, @passwordHash, 1, SYSUTCDATETIME(), SYSUTCDATETIME());
        `);
        return result.recordset[0].id;
      });

      expect(insertedId).toBeDefined();

      // Verify row exists
      const postCheck = await queryOne<{ id: string; email: string }>(
        'SELECT id, email FROM users WHERE email = @email',
        { email: testEmail }
      );
      expect(postCheck?.id).toBe(insertedId);

      // Cleanup
      await execute('DELETE FROM users WHERE email = @email', { email: testEmail });
    });

    it('handles SQL constraint violation inside transaction gracefully without crashing pool', async () => {
      let caught = false;
      try {
        await withTransaction(async (tx, reqFactory) => {
          const req = reqFactory();
          // Duplicate admin email violates unique constraint
          req.input('email', sql.NVarChar, 'admin@busticket.vn');
          req.input('fullName', sql.NVarChar, 'Dupe');
          req.input('role', sql.VarChar(20), 'admin');
          req.input('passwordHash', sql.NVarChar, 'dummy');

          await req.query(`
            INSERT INTO users (id, email, full_name, role, password_hash, is_active, created_at, updated_at)
            VALUES (NEWID(), @email, @fullName, @role, @passwordHash, 1, SYSUTCDATETIME(), SYSUTCDATETIME());
          `);
        });
      } catch (err: any) {
        caught = true;
        expect(err.message).toMatch(/violation of (UNIQUE KEY|PRIMARY KEY)|Cannot insert duplicate key/i);
      }
      expect(caught).toBe(true);

      // Pool must remain completely healthy after rollback
      const alive = await checkConnection();
      expect(alive).toBe(true);
    });
  });

  describe('3. SQL Injection Defense & Parameter Escaping', () => {
    it('safely binds classic SQL injection payloads without executing unauthorized SQL', async () => {
      const maliciousInputs = [
        "' OR '1'='1",
        "'; DROP TABLE bus_stops; --",
        "' UNION SELECT id, password_hash, email, full_name, role, 1, 0, 1, SYSUTCDATETIME(), SYSUTCDATETIME() FROM users --",
        "1; WAITFOR DELAY '00:00:05'; --",
        "admin'--",
        "admin' /*",
        "' OR 1=1; --",
        "\" OR \"\"=\"",
        "'; EXEC xp_cmdshell('dir'); --",
      ];

      for (const payload of maliciousInputs) {
        // Query users by email with the payload
        const rows = await query<{ id: string; email: string }>(
          'SELECT id, email FROM users WHERE email = @email',
          { email: payload }
        );

        // Expect no rows returned, and definitely no error or injected execution
        expect(rows).toHaveLength(0);
      }
    });

    it('safely handles injection payloads in LIKE clauses with parameters', async () => {
      const maliciousPatterns = [
        "%' OR 1=1 --",
        "%Long Biên%'; DROP TABLE bus_stops; --",
        "[A-Z]%' OR 'a'='a",
      ];

      for (const pattern of maliciousPatterns) {
        const routes = await query(
          'SELECT id, route_name FROM bus_routes WHERE route_name LIKE @search',
          { search: pattern }
        );
        // The parameterized query should treat the whole string as a parameter literal
        // None should trigger SQL syntax errors or arbitrary code execution
        expect(Array.isArray(routes)).toBe(true);
      }
    });

    it('correctly handles non-string parameter types (int, decimal, boolean, Date, null)', async () => {
      // Test null
      const nullResult = await queryOne<{ res: string | null }>(
        'SELECT @val AS res',
        { val: null }
      );
      expect(nullResult?.res).toBeNull();

      // Test boolean (bit)
      const boolResult = await queryOne<{ res: boolean }>(
        'SELECT @val AS res',
        { val: true }
      );
      expect(boolResult?.res).toBe(true);

      // Test integer
      const intResult = await queryOne<{ res: number }>(
        'SELECT @val AS res',
        { val: 12345 }
      );
      expect(intResult?.res).toBe(12345);

      // Test decimal
      const decResult = await queryOne<{ res: number }>(
        'SELECT @val AS res',
        { val: 123.45 }
      );
      expect(decResult?.res).toBeCloseTo(123.45, 2);

      // Test Date
      const now = new Date('2026-10-02T12:00:00Z');
      const dateResult = await queryOne<{ res: Date }>(
        'SELECT @val AS res',
        { val: now }
      );
      expect(dateResult?.res).toBeDefined();
    });

    it('supports custom explicit SQL types via { type, value } object notation', async () => {
      const bigNumber = '987654321098';
      const res = await queryOne<{ bigVal: string }>(
        'SELECT @bigVal AS bigVal',
        { bigVal: { type: sql.BigInt, value: bigNumber } }
      );
      expect(String(res?.bigVal)).toBe(bigNumber);
    });

    it('serializes plain objects and arrays to JSON strings without corrupting to [object Object]', async () => {
      const payload = { event: 'PAYMENT_RECEIVED', amount: 50000, meta: { bank: 'VCB' } };
      const res = await queryOne<{ val: string }>('SELECT @val AS val', { val: payload });
      expect(res?.val).toBe(JSON.stringify(payload));
      expect(JSON.parse(res!.val)).toEqual(payload);
    });

    it('safely serializes objects containing type and value fields when type is not an mssql type', async () => {
      const txData = { type: 'TRANSFER', value: 100000 };
      const res = await queryOne<{ val: string }>('SELECT @val AS val', { val: txData });
      expect(res?.val).toBe(JSON.stringify(txData));
    });

    it('supports Vietnamese Unicode characters properly (NVarChar)', async () => {
      const vietnameseText = 'Hà Nội - Đồ án Xe Buýt Thông Minh Vivu (Long Biên ⇄ Hà Đông)';
      const result = await queryOne<{ text: string }>(
        'SELECT @text AS text',
        { text: vietnameseText }
      );
      expect(result?.text).toBe(vietnameseText);
    });
  });

  describe('4. Helper Functions & Error Handling Boundaries', () => {
    it('queryOne returns first element when found, null when empty', async () => {
      const found = await queryOne<{ route_code: string }>(
        'SELECT route_code FROM bus_routes WHERE route_code = @num',
        { num: '01' }
      );
      expect(found).not.toBeNull();
      expect(found?.route_code).toBe('01');

      const notFound = await queryOne(
        'SELECT route_code FROM bus_routes WHERE route_code = @num',
        { num: 'NON_EXISTENT_9999' }
      );
      expect(notFound).toBeNull();
    });

    it('execute returns correct affected rows count', async () => {
      // Create temporary record with unique email and phone
      const tempEmail = `temp_exec_${Date.now()}@adversarial.vivu.vn`;
      const tempPhone = `094${Math.floor(1000000 + Math.random() * 9000000)}`;

      const insertCount = await execute(`
        INSERT INTO users (id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at)
        VALUES (NEWID(), @email, @phone, 'Temp', 'passenger', 'hash', 1, SYSUTCDATETIME(), SYSUTCDATETIME())
      `, { email: tempEmail, phone: tempPhone });
      expect(insertCount).toBe(1);

      const updateCount = await execute(`
        UPDATE users SET full_name = 'Temp Updated' WHERE email = @email
      `, { email: tempEmail });
      expect(updateCount).toBe(1);

      const deleteCount = await execute(`
        DELETE FROM users WHERE email = @email
      `, { email: tempEmail });
      expect(deleteCount).toBe(1);
    });

    it('executeReturning outputs the inserted row', async () => {
      const tempEmail = `returning_${Date.now()}@adversarial.vivu.vn`;
      const tempPhone = `093${Math.floor(1000000 + Math.random() * 9000000)}`;

      const row = await executeReturning<{ id: string; email: string }>(`
        INSERT INTO users (id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at)
        OUTPUT INSERTED.id, INSERTED.email
        VALUES (NEWID(), @email, @phone, 'Returning Test', 'passenger', 'hash', 1, SYSUTCDATETIME(), SYSUTCDATETIME())
      `, { email: tempEmail, phone: tempPhone });

      expect(row).not.toBeNull();
      expect(row?.email).toBe(tempEmail);

      // Cleanup
      await execute('DELETE FROM users WHERE email = @email', { email: tempEmail });
    });

    it('properly throws and preserves SQL error when query syntax is invalid', async () => {
      await expect(
        query('SELECT FROM invalid_syntax_table WHERE')
      ).rejects.toThrow();
    });

    it('transparently re-initializes connection pool after closePool() is called', async () => {
      // Intentionally close the pool
      await closePool();
      await new Promise((r) => setTimeout(r, 50));

      // Ensure that next query automatically establishes a fresh connection
      const result = await queryOne<{ reconnected: number }>('SELECT 1 AS reconnected');
      expect(result).not.toBeNull();
      expect(result?.reconnected).toBe(1);
    });

    it('validates 32-bit integer boundaries and documents overflow behavior', async () => {
      // 32-bit Max signed integer: 2,147,483,647
      const maxInt32 = 2147483647;
      const validInt = await queryOne<{ res: number }>('SELECT @val AS res', { val: maxInt32 });
      expect(validInt?.res).toBe(maxInt32);

      // Overflow (> Int32.MaxValue) is rejected with EPARAM if passed as bare number
      await expect(
        queryOne('SELECT @val AS res', { val: 9999999999 })
      ).rejects.toThrow(/Validation failed for parameter 'val'/);

      // But succeeds when caller explicitly specifies BigInt or string
      const bigIntRes = await queryOne<{ res: string }>(
        'SELECT @val AS res',
        { val: { type: sql.BigInt, value: '9999999999' } }
      );
      expect(String(bigIntRes?.res)).toBe('9999999999');
    });
  });
});

