# Handoff Report: Test Harness Stability & Pool Pacing Strategy (Explorer M1.it3.2)

- **Agent**: `teamwork_preview_explorer` (Explorer M1 Iteration 3.2)
- **Roles**: explorer, analyst, synthesizer
- **Working Directory**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_2`
- **Target Recipient**: Parent Orchestrator (`891098e1-52e3-4582-a42d-340f57c72e75`), Worker M1.it3
- **Handoff Type**: Hard (Task Complete)
- **Primary Deliverable**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_2/analysis.md`

---

## 1. Observation

### 1.1 Verbatim Teardown Crash in `boundary-schema-constraints.test.ts`
- **File**: `d:/DangQuangTung/Vivu/tests/tier2-boundary/boundary-schema-constraints.test.ts`
- **Lines**: 21, 28–29, 47–61
- **Code**:
  ```typescript
  21:   let pool: sql.ConnectionPool;
  ...
  28:   beforeAll(async () => {
  29:     pool = await sql.connect(dbConfig);
  ...
  47:   afterAll(async () => {
  48:     // Teardown test artifacts
  49:     try {
  50:       await pool.request().query("DELETE FROM complaints WHERE content LIKE '%T2-TEST%'");
  ...
  59:     } catch {}
  60:     await pool.close();
  61:   });
  ```
- **Verbatim Error Output** (recorded in `reviewer_m1_it2_2_rep/handoff.md:99-106`):
  ```text
  FAIL  db  tests/tier2-boundary/boundary-schema-constraints.test.ts > Tier 2: Database Schema & Relational Constraints (Adversarial M1.2)
  TypeError: Cannot read properties of undefined (reading 'close')
   ❯ tests/tier2-boundary/boundary-schema-constraints.test.ts:60:16
       58|       await pool.request().query("DELETE FROM ticket_types WHERE name LIKE 'CHK_TEST%'");
       59|     } catch {}
       60|     await pool.close();
         |                ^
  ```
- **Observation**: If `beforeAll` fails or times out, `pool` is `undefined`. Line 50 fails inside the `try/catch` and is caught, but line 60 evaluates `undefined.close()`, crashing Vitest during teardown.

---

### 1.2 Unpaced Concurrency & Socket Starvation in `db-stress.test.ts`
- **File**: `d:/DangQuangTung/Vivu/tests/adversarial/db-stress.test.ts`
- **Lines**: 26–47, 49–68, 104–134
- **Code Snippets**:
  - Test 1 (lines 26–38):
    ```typescript
    const concurrencyCount = 100;
    const promises = Array.from({ length: concurrencyCount }, async (_, idx) => {
      const result = await query<{ idx: number; val: string }>(...);
      return result[0];
    });
    const results = await Promise.all(promises);
    ```
  - Test 2 (lines 49–62):
    ```typescript
    const concurrencyCount = 50;
    const promises = Array.from({ length: concurrencyCount }, async (_, idx) => {
      const result = await query<{ worker_id: number; status: string }>(
        `WAITFOR DELAY '00:00:00.020'; SELECT @worker_id AS worker_id, 'ok' AS status;`,
        { worker_id: idx }
      );
      return result[0];
    });
    const results = await Promise.all(promises);
    ```
  - Test 5 (lines 104–127):
    ```typescript
    const txCount = 25;
    const promises = Array.from({ length: txCount }, async (_, idx) => {
      return withTransaction(async (tx, reqFactory) => { ... });
    });
    const insertedIds = await Promise.all(promises);
    ```
- **Pool Sizing**: `lib/db.ts:22` configures `pool.max: 10`.
- **System Diagnostics** (recorded in `challenger_m1_it2_1_rep/handoff.md:68-88` and `reviewer_m1_it2_2_rep/handoff.md:151-161`):
  - 26 TCP connections stuck in `CLOSE_WAIT` on `sqlservr.exe` (PID 3684).
  - 132 internal threads blocked in `UserRequest`.
  - Windows Event Log:
    - **Event ID 701**: `There is insufficient system memory in resource pool 'internal' to run this query.`
    - **Event ID 17300**: `SQL Server was unable to run a new system task, either because there is insufficient memory or the number of configured sessions exceeds the maximum allowed in the server.`
  - TDS Pre-login probe: Client connects at TCP layer, sends TDS `PRELOGIN` packet (0x12), but SQL Server engine hangs indefinitely without returning a prelogin response packet.

---

### 1.3 Parallel Test Runner Collision in `vitest.config.ts`
- **File**: `d:/DangQuangTung/Vivu/vitest.config.ts`
- **Lines**: 10–19
- **Code**:
  ```typescript
  {
    test: {
      name: 'db',
      include: [
        'tests/adversarial/db-stress.test.ts',
        'tests/tier2-boundary/boundary-schema-constraints.test.ts',
      ],
    },
  }
  ```
- **Observation**: By default, Vitest runs test files within a project concurrently across worker threads. `boundary-schema-constraints.test.ts` (modifying tables and testing relational constraints) and `db-stress.test.ts` (heavy concurrency and transactions) ran at the exact same moment against the same local SQL Server Express instance, compounding thread starvation.

---

### 1.4 Test Hook Inventory Across Repository
- Inspected all 23 `.test.ts` files across `tests/`.
- **Result**: Only `tests/tier2-boundary/boundary-schema-constraints.test.ts` and `tests/adversarial/db-stress.test.ts` contain `beforeAll` / `afterAll` hooks. All other tests are API tests using `TestClient`.

---

## 2. Logic Chain

1. **Direct Cause of `TypeError` (Observation 1.1)**:
   In `boundary-schema-constraints.test.ts`, `afterAll` does not verify `if (pool)` before invoking `await pool.close()`. When any connection error or timeout occurs in `beforeAll`, `pool` remains uninitialized (`undefined`), causing `TypeError: Cannot read properties of undefined (reading 'close')`. Therefore, guarding pool closure with `if (pool) { try { if (pool.connected) await pool.close(); } catch {} }` eliminates this unhandled teardown exception.

2. **Mechanism of SQL Server Express Prelogin Outage (Observation 1.2)**:
   SQL Server 2025 Express is memory-constrained (1410 MB engine buffer cap) and worker-thread-constrained. Running 100 parallel queries, 50 `WAITFOR DELAY` queries, and 25 simultaneous transactions through a 10-connection pool caused Node.js to queue up dozens of concurrent requests. This triggered Event IDs 701 and 17300, depleting the `internal` memory pool. When Node.js sockets closed, SQL Server's worker threads were unable to process socket closures, leaving 26 sockets in `CLOSE_WAIT` and starving the TDS listener thread.

3. **Concurrency Pacing Solution (Observation 1.2)**:
   Pacing the workload into batches of 20–25 concurrent queries operates comfortably within SQL Server Express's thread capacity while still saturating the 10-connection pool by 2.0x–2.5x (validating pool queueing and deadlock resistance). Inserting brief yields (`20ms`–`50ms`) between batches permits tarn.js and tedious to cleanly release and reassign sockets without socket drops.

4. **Runner Isolation Solution (Observation 1.3)**:
   Enforcing `fileParallelism: false` for the `db` project in `vitest.config.ts` ensures that `boundary-schema-constraints.test.ts` executes first to verify schema and relational integrity, and only upon completion does `db-stress.test.ts` execute. This prevents concurrent lock contention on the same database tables and keeps thread utilization well below server thresholds.

---

## 3. Caveats

- **Service Restart Prerequisite**: The Windows service `MSSQL$SQLEXPRESS` requires elevated administrator privileges (`RunAs Administrator`) to clear existing hung `CLOSE_WAIT` sockets if it is currently in an unserviced state. The non-elevated agent sandbox cannot issue `Restart-Service`.
- **Scope Restriction**: In accordance with the Explorer archetype rules, no source files were modified directly. All recommendations are delivered as exact unified diffs and patch specifications in `analysis.md` for Worker implementation.
- **503 Masking Assertions**: While `test-client.ts` removed 503 fallback masking, 10 API test files still contain assertions of the form `expect([..., 503]).toContain(res.status)`. While not impacting the `db` project, these should be cleaned up during API test remediation.

---

## 4. Conclusion

The test harness stability strategy is fully formulated, documented, and ready for immediate implementation by Worker M1.it3:

1. **`tests/tier2-boundary/boundary-schema-constraints.test.ts`**:
   - Guard pool closure: `if (pool) { ... try { if (pool.connected) await pool.close(); } catch {} }`.
   - Add connection retry loop (3 attempts with 1s backoff) and explicit 35s hook timeout to `beforeAll`.
   - Safe navigation on recordset indices (`[0]?.id`).
   - Add `connectionTimeout: 15000` and `requestTimeout: 30000` to `dbConfig`.
2. **`tests/adversarial/db-stress.test.ts`**:
   - Batch 100 queries into 4 sustainable batches of 25 concurrent queries with 20ms yields.
   - Reduce `WAITFOR DELAY` queries from 50 to 20 concurrent (200% pool saturation) with a 30ms drain pause.
   - Batch 20 ACID transactions into 2 batches of 10 (100% pool saturation) with a 50ms connection release pause.
   - Add connection retry loop and 35s hook timeout to `beforeAll`.
   - Add a 150ms drain pause before `closePool()` in `afterAll`.
3. **`vitest.config.ts`**:
   - Set `fileParallelism: false`, `testTimeout: 35000`, and `hookTimeout: 35000` on the `db` project to guarantee sequential execution.
4. **`lib/db.ts`**:
   - Add defensive `catch` block inside `closePool()` when closing active pool.

---

## 5. Verification Method

Once Worker M1.it3 applies the patches:

1. **Verify `boundary-schema-constraints.test.ts` Teardown Safety**:
   ```powershell
   npx vitest run tests/tier2-boundary/boundary-schema-constraints.test.ts
   ```
   *Expected*: Zero `TypeError: Cannot read properties of undefined (reading 'close')`. If database is down, test fails gracefully on connection without unhandled teardown crashes.
2. **Verify Paced DB Stress Suite**:
   ```powershell
   npx vitest run tests/adversarial/db-stress.test.ts
   ```
   *Expected*: Passes all 22 tests. Completed without hung sockets.
3. **Verify Sequential Partitioned DB Project**:
   ```powershell
   npm run test:db
   ```
   *Expected*: Runs both files sequentially; 0 failed suites; exit code 0.
4. **Verify Socket Cleanliness**:
   ```powershell
   netstat -ano | findstr 1433
   ```
   *Expected*: Zero sockets in `CLOSE_WAIT`. Database accepts subsequent queries immediately.
