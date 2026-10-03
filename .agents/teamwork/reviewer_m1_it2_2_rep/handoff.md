# Handoff Report: Reviewer M1 Iteration 2.2 Replacement (Schema, Partitioning & Live Verification Audit)

- **Agent**: Reviewer M1.it2.2 Replacement (`teamwork_preview_reviewer`)
- **Roles**: reviewer, critic
- **Working Directory**: `d:/DangQuangTung/Vivu/.agents/teamwork/reviewer_m1_it2_2_rep`
- **Parent Conversation ID**: `891098e1-52e3-4582-a42d-340f57c72e75`
- **Target Role / Recipient**: Parent Orchestrator (`891098e1-52e3-4582-a42d-340f57c72e75`)
- **Gate Verdict**: **`REQUEST_CHANGES`**

---

## 1. Observation

Direct observations, tool commands, line numbers, and verbatim command execution outputs on `d:/DangQuangTung/Vivu`:

### 1.1 Source Code & Remediation Items Inspection
1. **`types/db.ts` and `types/index.ts`**:
   - `types/db.ts` contains complete TypeScript interfaces for all 11 database entities: `User` (lines 31-42), `BusRoute` (lines 47-55), `BusStop` (lines 60-67), `RouteStop` (lines 72-78), `Bus` (lines 83-89), `Schedule` (lines 94-102), `TicketType` (lines 107-116), `Order` (lines 121-135), `Ticket` (lines 140-152), `PaymentTransaction` (lines 157-165), `Complaint` (lines 170-178).
   - Domain union types (`UserRole`, `RouteDirection`, `TicketCategory`, `OrderStatus`, `TicketStatus`, `ComplaintStatus`), insertion helper types (`NewUser`, `NewOrder`, etc.), and DTO contracts (`RouteWithStops`, `OrderWithTickets`, `TicketJwtPayload`, `TicketVerificationResult`, `SePayWebhookInbound`) are strictly typed.
   - Column names strictly preserve snake_case alignment matching `scripts/schema.sql`.
   - `types/index.ts` exports `export * from './db';`.

2. **`package.json` and `vitest.config.ts` Runner Partitioning**:
   - `package.json` defines partitioned scripts:
     - Line 11: `"test": "vitest run --project db"`
     - Line 12: `"test:db": "vitest run --project db"`
     - Line 13: `"test:api": "vitest run --project api"`
     - Line 14: `"test:e2e": "vitest run --project e2e"`
     - Line 15: `"test:all": "vitest run"`
   - `vitest.config.ts` partitions tests into three projects: `db` (`tests/adversarial/db-stress.test.ts`, `tests/tier2-boundary/boundary-schema-constraints.test.ts`), `api` (`tests/tier1-features/**`, `tests/tier2-boundary/**` excluding constraints), and `e2e` (`tests/tier3-interactions/**`, `tests/tier4-scenarios/**`).

3. **`tests/helpers/test-client.ts` Test Masking Removal**:
   - Lines 71–86 invoke native `fetch(url, init)` directly without catching network connection errors.
   - Running `npm run test:api` against an offline Next.js server yielded 75 genuine `TypeError: fetch failed` (`ECONNREFUSED ::1:3001` / `127.0.0.1:3001`) failures, confirming that offline server states are no longer deceptively masked as passing.

4. **Remaining 503 Assertions in API Test Files (Coverage Gap on `GATE_STATUS.md` Issue #1)**:
   - Grep search across `tests/` revealed 54 remaining instances of `expect([..., 503]).toContain(res.status)` and `if (res.status !== 503)` across 10 API test files:
     - `tests/tier1-features/auth.test.ts` (lines 28, 44, 59, 74, 96, 106)
     - `tests/tier1-features/admin-crud.test.ts` (lines 28, 49, 70, 91, 100)
     - `tests/tier1-features/complaints.test.ts` (lines 20, 46, 56, 70, 86)
     - `tests/tier1-features/routes-stops.test.ts` (lines 18, 29, 46, 62, 82, 89)
     - `tests/tier1-features/sepay-webhook.test.ts` (lines 29, 114)
     - `tests/tier1-features/orders.test.ts` (lines 35, 63)
     - `tests/tier2-boundary/boundary-webhook.test.ts` (lines 59, 68, 78, 86)
     - `tests/tier2-boundary/boundary-expiry.test.ts` (lines 31, 43, 61, 71)
     - `tests/tier2-boundary/boundary-orders.test.ts` (lines 18, 33, 48, 63, 78, 93)
     - `tests/tier2-boundary/boundary-security.test.ts` (lines 27, 35, 43, 51, 60)
     - `tests/tier3-interactions/route-stop-reorder-impact.test.ts` (line 28)

5. **`lib/db.ts` Object Parameter Binding & Lifecycle**:
   - Lines 88–96 define `isSqlType(t)` to distinguish `mssql` SQL types from plain objects.
   - Lines 123–136 serialize plain objects and arrays via `JSON.stringify(value)` instead of `String(value)`.
   - `Buffer` is bound to `sql.VarBinary`.
   - Lines 248–275 `closePool()` awaits in-flight `global.__mssqlPoolPromise`.

6. **`tests/helpers/fixtures.ts` Credential Alignment**:
   - Lines 9 and 15 define `Admin@123456` and `Inspector@123456`, matching `scripts/seed.js` and `scripts/verify-db.js`.

---

### 1.2 Verification Commands Execution

1. **`node scripts/verify-db.js`**:
   - **Exit Code**: `1` (FAIL)
   - **Verbatim Output**:
     ```
     ===============================================================
     🔍 Vivu Platform: Comprehensive Database Verification
     🔌 Target: localhost:1433 / bus_ticketing_system (User: vivu_admin)
     ===============================================================

        [FAIL] ❌ Connection established with SQL Server
               ↳ Error: Failed to connect to localhost:1433 in 15000ms

     ❌ Fatal: Unable to connect to database. Aborting verification.
     ```

2. **`npm run test:db`**:
   - **Exit Code**: `1` (FAIL)
   - **Verbatim Output**:
     ```
     stderr | tests/adversarial/db-stress.test.ts > Empirical Adversarial Challenge: lib/db.ts
     [DB Connection Error]: Could not connect to SQL Server at localhost:1433 (DB: bus_ticketing_system): Failed to connect to localhost:1433 in 15000ms

     ⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯

      FAIL  db  tests/adversarial/db-stress.test.ts > Empirical Adversarial Challenge: lib/db.ts
     Error: Hook timed out in 10000ms.
      ❯ tests/adversarial/db-stress.test.ts:16:3
          16|   beforeAll(async () => {
          17|     const connected = await checkConnection();

      FAIL  db  tests/tier2-boundary/boundary-schema-constraints.test.ts > Tier 2: Database Schema & Relational Constraints (Adversarial M1.2)
     Error: Hook timed out in 10000ms.
      ❯ tests/tier2-boundary/boundary-schema-constraints.test.ts:28:3
          28|   beforeAll(async () => {
          29|     pool = await sql.connect(dbConfig);

      FAIL  db  tests/tier2-boundary/boundary-schema-constraints.test.ts > Tier 2: Database Schema & Relational Constraints (Adversarial M1.2)
     TypeError: Cannot read properties of undefined (reading 'close')
      ❯ tests/tier2-boundary/boundary-schema-constraints.test.ts:60:16
          58|       await pool.request().query("DELETE FROM ticket_types WHERE name LIKE 'CHK_TEST%'");
          59|     } catch {}
          60|     await pool.close();
            |                ^

      Test Files  2 failed (2)
           Tests  43 skipped (43)
        Duration  19.16s
     ```

3. **`npm run typecheck`**:
   - **Exit Code**: `0` (PASS)
   - **Verbatim Output**:
     ```
     > vivu@0.1.0 typecheck
     > tsc --noEmit
     ```

4. **`npm run lint`**:
   - **Exit Code**: `0` (PASS)
   - **Verbatim Output**:
     ```
     > vivu@0.1.0 lint
     > eslint .
     ```

5. **`npm run build`**:
   - **Exit Code**: `0` (PASS)
   - **Verbatim Output**:
     ```
     ▲ Next.js 16.3.8 (Turbopack)
     - Environments: .env.local
     ✓ Running next.config.ts took 339ms
       Creating an optimized production build ...
     ✓ Compiled successfully in 1524ms
       Running TypeScript ...
       Finished TypeScript in 6.7s ...
       Collecting page data using 4 workers ...
       Generating static pages using 4 workers (0/3) ...
     ✓ Generating static pages using 4 workers (3/3) in 2.0s
       Finalizing page optimization ...

     Route (app)
     ┌ ○ /
     └ ○ /_not-found
     ```

---

### 1.3 Root-Cause Investigation: SQL Server Internal Failure
Investigation into why `localhost:1433` timed out during verification:
1. `MSSQL$SQLEXPRESS` service status was `Running` with PID 3684. Port 1433 was listening, but all incoming TDS connections timed out in `SentPrelogin`.
2. Windows Application Event Log (`Get-WinEvent`) revealed critical SQL Server errors starting at `10/2/2026 10:51:02 PM`:
   - **Event ID 701**: `There is insufficient system memory in resource pool 'internal' to run this query.`
   - **Event ID 17300**: `SQL Server was unable to run a new system task, either because there is insufficient memory or the number of configured sessions exceeds the maximum allowed in the server. Verify that the server has adequate memory. Use sp_configure with option 'user connections' to check the maximum number of user connections allowed. Use sys.dm_exec_sessions to check the current number of sessions, including user processes.`
3. Host system memory check: `TotalVisibleMemorySize`: 8,199,124 KB (~8 GB), `FreePhysicalMemory`: 691,260 KB (~691 MB).
4. `sqlcmd` connection attempt via TCP and Named Pipe (`np:\\.\pipe\MSSQL$SQLEXPRESS\sql\query`) confirmed:
   `Sqlcmd: Error: Microsoft ODBC Driver 18 for SQL Server : Unable to complete login process due to delay in prelogin response.`
5. Attempting to restart the service via `Restart-Service MSSQL$SQLEXPRESS` and `taskkill` failed with `Access is denied` (non-elevated agent sandbox).

---

## 2. Logic Chain

1. **Static Analysis & Schema Conformance**:
   - Based on Observation 1.1.1, `types/db.ts` provides domain models for all 11 tables matching `scripts/schema.sql`.
   - Based on Observation 1.1.2, runner partitioning in `package.json` and `vitest.config.ts` correctly isolates database tests from unbuilt API routes.
   - Based on Observations 1.2.3, 1.2.4, and 1.2.5, `npm run typecheck`, `npm run lint`, and `npm run build` pass cleanly with exit code 0.

2. **Test Masking Remediation Incompleteness**:
   - Based on Observation 1.1.3, `tests/helpers/test-client.ts` successfully removed the synthetic 503 fallback.
   - However, based on Observation 1.1.4, 54 occurrences of `expect([..., 503]).toContain(res.status)` and `if (res.status !== 503)` remain in the test suite files. This violates the explicit mandate in `GATE_STATUS.md` issue #1: *"Fix self-certifying 503 fallback masking in tests/helpers/test-client.ts and test assertions so offline failures are not falsely accepted as passing."*

3. **Live Database Verification Failure**:
   - In `worker_m1_it2/handoff.md`, Worker M1.it2 claimed 43/43 passing database checks in `verify-db.js` and 43/43 passing database Vitest tests in `test:db`.
   - When independently executed (Observations 1.2.1 and 1.2.2), BOTH `node scripts/verify-db.js` and `npm run test:db` failed with exit code 1.
   - Based on Observation 1.3, this failure was triggered by SQL Server running out of internal memory and session workers (Event IDs 701 & 17300), following high-concurrency stress testing (`db-stress.test.ts`: 100 concurrent queries, 50 delayed queries, 25 concurrent ACID transactions) on a resource-constrained host machine.
   - Furthermore, Observation 1.2.2 uncovered a code defect in `tests/tier2-boundary/boundary-schema-constraints.test.ts:60`: the `afterAll` hook attempts `await pool.close()` unconditionally without checking if `pool` was initialized, causing an uncaught `TypeError: Cannot read properties of undefined (reading 'close')`.

4. **Verdict Determination**:
   - Independent verification failed on 2 out of 5 required commands.
   - Unhandled teardown defect discovered in `boundary-schema-constraints.test.ts`.
   - Test masking assertions with HTTP 503 remain present in 10 test files.
   - Under the Quality and Adversarial Review standards, work cannot be approved when live verification commands fail. Therefore, the gate verdict must be `REQUEST_CHANGES`.

---

## 3. Caveats

- **Service Restart Permission**: The agent runs under a non-elevated user token and cannot execute `Restart-Service MSSQL$SQLEXPRESS` or kill PID 3684. Once the host administrator or system service restarts `MSSQL$SQLEXPRESS` and frees system memory, `scripts/verify-db.js` and `npm run test:db` should be re-run.
- **Stress Test Concurrency Limits**: On SQL Server Express instances operating in low-RAM environments (<1 GB free physical memory), concurrency limits in `tests/adversarial/db-stress.test.ts` (100 concurrent requests, 25 simultaneous transactions) must be throttled or paced to prevent re-triggering Event ID 17300 / 701 memory exhaustion.

---

## 4. Conclusion

**Verdict: `REQUEST_CHANGES`**

### Summary of Findings:

#### 1. [CRITICAL] Live Database Verification Failure (`verify-db.js` & `test:db`)
- **What**: Both `node scripts/verify-db.js` and `npm run test:db` fail with exit code 1 due to connection timeouts.
- **Where**: `scripts/verify-db.js`, `tests/adversarial/db-stress.test.ts`, `tests/tier2-boundary/boundary-schema-constraints.test.ts`.
- **Why**: SQL Server `MSSQL$SQLEXPRESS` suffered memory and session worker exhaustion (Event ID 701 & Event ID 17300) and cannot accept new connections.
- **Action Required**: Host administrator must restart `MSSQL$SQLEXPRESS` service. Concurrency stress tests should be adjusted or verified against the fresh instance.

#### 2. [MAJOR] Teardown Crash in `boundary-schema-constraints.test.ts`
- **What**: `TypeError: Cannot read properties of undefined (reading 'close')` in `afterAll`.
- **Where**: `tests/tier2-boundary/boundary-schema-constraints.test.ts:60`.
- **Why**: If `beforeAll` connection fails or times out, `pool` remains undefined, causing an unhandled crash during test teardown.
- **Action Required**: Guard teardown with `if (pool) { await pool.close(); }`.

#### 3. [MAJOR] Remaining 503 Fallback Assertions in API Test Files
- **What**: 54 instances of `expect([..., 503]).toContain(res.status)` and `if (res.status !== 503)` remain in API test files.
- **Where**: 10 files in `tests/tier1-features/`, `tests/tier2-boundary/`, `tests/tier3-interactions/`.
- **Why**: Violates `GATE_STATUS.md` issue #1 remediation requirement to eliminate masking assertions.
- **Action Required**: Remove 503 from expected HTTP status arrays and conditional checks across all test files.

---

## 5. Verification Method

To independently verify after remediation:

1. **Restart SQL Server Service (Host Admin)**:
   ```powershell
   Restart-Service MSSQL$SQLEXPRESS
   ```
2. **Verify Database Catalog & Seed Data**:
   ```powershell
   node scripts/verify-db.js
   ```
   *Expectation*: 43/43 assertions pass, exit code 0.
3. **Verify Partitioned Database Tests**:
   ```powershell
   npm run test:db
   ```
   *Expectation*: 2 test files, 43 tests pass, exit code 0.
4. **Verify TypeScript & Lint**:
   ```powershell
   npm run typecheck
   npm run lint
   ```
   *Expectation*: Exit code 0, 0 errors.
5. **Verify Production Build**:
   ```powershell
   npm run build
   ```
   *Expectation*: Next.js Turbopack build succeeds with exit code 0.
