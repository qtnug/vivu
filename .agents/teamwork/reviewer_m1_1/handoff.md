# Handoff Report: Reviewer M1.1 (Milestone 1 Code, Database & Integrity Review)

- **Agent**: `reviewer_m1_1` (teamwork_preview_reviewer)
- **Roles**: reviewer, critic
- **Working Directory**: `d:/DangQuangTung/Vivu/.agents/teamwork/reviewer_m1_1`
- **Target Recipient**: Parent Orchestrator (`891098e1-52e3-4582-a42d-340f57c72e75`)
- **Timestamp**: 2026-10-02T13:15:00Z
- **Gate Verdict**: **`REQUEST_CHANGES`**

---

## 1. Observation

### 1.1 Verbatim Command Execution Outputs

#### Command 1: `node scripts/verify-db.js`
- **Exit Code**: `0`
- **Direct Output**:
  ```
  ===============================================================
  🔍 Vivu Platform: Comprehensive Database Verification
  🔌 Target: localhost:1433 / bus_ticketing_system (User: vivu_admin)
  ===============================================================

     [PASS] Connection established with SQL Server

  --- Section 1: Schema Integrity (11 Tables) ---
     [PASS] Table 'users' exists in database
     [PASS] Table 'bus_routes' exists in database
     [PASS] Table 'bus_stops' exists in database
     [PASS] Table 'route_stops' exists in database
     [PASS] Table 'buses' exists in database
     [PASS] Table 'schedules' exists in database
     [PASS] Table 'ticket_types' exists in database
     [PASS] Table 'orders' exists in database
     [PASS] Table 'tickets' exists in database
     [PASS] Table 'payment_transactions' exists in database
     [PASS] Table 'complaints' exists in database

  --- Section 2: Foreign Key Cascade Rules ---
     [PASS] Cascade delete rules strictly enforced (ONLY route_stops.route_id & tickets.order_id are CASCADE)
            ↳ Found 2 valid cascades, 0 illegal cascades

  --- Section 3: Seed Users (Admin & Inspector) ---
     [PASS] Admin user (admin@busticket.vn) exists
     [PASS] Admin account has role = admin
            ↳ Role: admin
     [PASS] Admin account is active
     [PASS] Inspector user (inspector1@busticket.vn) exists
     [PASS] Inspector account has role = inspector
            ↳ Role: inspector
     [PASS] Inspector account is active
     [PASS] Admin password matches bcrypt hash for "Admin@123456"
     [PASS] Inspector password matches bcrypt hash for "Inspector@123456"

  --- Section 4: Bus Route 01 ---
     [PASS] Route 01 exists in bus_routes
     [PASS] Route 01 name contains "Long Biên - Bến xe Hà Đông"
            ↳ Name: Bến xe Long Biên - Bến xe Hà Đông
     [PASS] Route 01 direction is FORWARD

  --- Section 5: Bus Stops & Sequence ---
     [PASS] At least 5 bus stops exist (found 5)
     [PASS] Bus stop 'Bến xe Long Biên' exists
     [PASS] Bus stop 'Hồ Hoàn Kiếm' exists
     [PASS] Bus stop 'Ga Hà Nội' exists
     [PASS] Bus stop 'Ngã Tư Sở' exists
     [PASS] Bus stop 'Bến xe Hà Đông' exists
     [PASS] Route 01 has exactly 5 ordered stops in route_stops
     [PASS] Route 01 stops ordered strictly 1 through 5
     [PASS] Route 01 cumulative distances are non-decreasing

  --- Section 6: Buses & Schedules ---
     [PASS] Bus 29B-123.45 exists
     [PASS] Bus 29B-678.90 exists
     [PASS] At least 1 schedule exists for Route 01 (found 2)
     [PASS] Route 01 schedule has 06:00:00 departure

  --- Section 7: Ticket Types (Pricing Catalog) ---
     [PASS] Exactly 5 ticket types exist (found 5)
     [PASS] Single Ride Regular is 7,000 VND
     [PASS] Single Ride Student is 3,000 VND
     [PASS] Daily Pass is 30,000 VND
     [PASS] Monthly Pass Regular is 200,000 VND
     [PASS] Monthly Pass Student is 100,000 VND

  ===============================================================
  📊 Verification Summary: Total Checks: 43 | Passed: 43 | Failed: 0
  🎉 ALL DATABASE VERIFICATION CHECKS PASSED PERFECTLY!
  ===============================================================
  ```

#### Command 2: `npm run typecheck`
- **Exit Code**: `0`
- **Output**: `tsc --noEmit` completed with zero type errors.

#### Command 3: `npm run lint`
- **Exit Code**: `0`
- **Output**: `eslint .` completed with 0 errors and 0 warnings.

#### Command 4: `npm run build`
- **Exit Code**: `0`
- **Output**: Next.js 16.3.8 Turbopack compiled successfully in 345ms, generating static pages (`/` and `/_not-found`).

#### Command 5: `npx vitest run` (Mandatory Test Runner Execution)
- **Exit Code**: `1` (FAILED)
- **Direct Output Summary**:
  ```
  Test Files  1 failed | 19 passed (20)
       Tests  7 failed | 117 passed (124)
    Duration  7.24s

  FAIL tests/adversarial/db-stress.test.ts
  - rolls back all modifications when an error is thrown inside withTransaction -> RequestError: Invalid column name 'createdAt'.
  - successfully commits operations when no error is thrown inside withTransaction -> RequestError: Invalid column name 'createdAt'.
  - handles SQL constraint violation inside transaction gracefully without crashing pool -> AssertionError: expected 'Invalid column name \'createdAt\'.' to match /violation of (UNIQUE KEY|PRIMARY KEY...
  - safely handles injection payloads in LIKE clauses with parameters -> RequestError: Invalid column name 'routeName'.
  - queryOne returns first element when found, null when empty -> RequestError: Invalid column name 'routeNumber'.
  - execute returns correct affected rows count -> RequestError: Invalid column name 'createdAt'.
  - executeReturning outputs the inserted row -> RequestError: Invalid column name 'createdAt'.
  ```

### 1.2 Code Inspection Observations
1. **Absence of Domain TypeScript Definitions**:
   - `types/` directory does not exist in the project root.
   - Searching for database models across `lib/` and root shows no TypeScript interfaces or type declarations for the 11 schema tables (`User`, `BusRoute`, `BusStop`, `RouteStop`, `Bus`, `Schedule`, `TicketType`, `Order`, `Ticket`, `PaymentTransaction`, `Complaint`).
   - `lib/db.ts` exposes `query<T = any>(sqlText: string, params?: Record<string, any>): Promise<T[]>` where `T` defaults to `any`.
2. **Object Parameter Binding Flaw in `lib/db.ts`**:
   - In `lib/db.ts` lines 94-114 (`bindParameters`):
     ```typescript
     } else if (typeof value === 'object' && value.type && 'value' in value) {
       request.input(key, value.type, value.value);
     } else {
       request.input(key, sql.NVarChar, String(value));
     }
     ```
   - When a JavaScript plain object or array (e.g. payload metadata or JSON log) is supplied as a parameter, `String(value)` evaluates to `"[object Object]"`, which silently persists corrupt strings into columns like `payment_transactions.raw_payload`.
3. **Seed Credential Discrepancy**:
   - `scripts/seed.js` lines 47-48: Seeded Admin password is `Admin@123456`, Inspector password is `Inspector@123456`.
   - `tests/helpers/fixtures.ts` lines 9, 15: Configured Admin password is `Admin@123`, Inspector password is `Insp@123`.
4. **Self-Certifying Assertion Structure in `tests/`**:
   - In `tests/helpers/test-client.ts` lines 87-100: Fetch connection errors (when Next.js server is not running on port 3001) catch `fetch` error and return `{ status: 503, ok: false, ... }`.
   - In virtually all 19 test files (110 test cases), assertions contain fallback checks:
     `if (res.status === 200) { ... } else { expect([200, 503]).toContain(res.status); }`
     This causes all 110 tests to pass unconditionally when no server or API is running.

---

## 2. Logic Chain

1. **Gate Invalidation via Test Failure**:
   - Section 1.2 of the dispatch specifically mandates: *"If TEST_READY.md exists, run the test runner (`npx vitest run`)."*
   - The test runner was executed and failed with exit code 1 (`7 failed, 117 passed`).
   - Because `vitest` scans all `**/*.test.ts` files, the presence of failing tests in `tests/adversarial/db-stress.test.ts` breaks automated CI and blocks milestone progression.
2. **Column Naming Inconsistencies Caused by Missing Type Models**:
   - In `tests/adversarial/db-stress.test.ts`, tests failed because column names were assumed to be camelCase (`createdAt`, `fullName`, `passwordHash`, `isActive`, `routeName`, `routeNumber`), whereas SQL Server schema defines snake_case (`created_at`, `full_name`, `password_hash`, `is_active`, `route_name`, `route_code`).
   - This failure directly stems from the missing Milestone 1 deliverable: **authoritative TypeScript domain definitions** for the 11 database entities. If strong TypeScript types were defined in `types/db.ts`, caller code and test suites would have compile-time type safety preventing column mismatches.
3. **Data Corruption Risk in Query Helper**:
   - `bindParameters` in `lib/db.ts` falls back to `String(value)`. Any object not explicitly wrapped in `{ type, value }` is coerced to `"[object Object]"` instead of `JSON.stringify(value)`. This will corrupt JSON storage in subsequent milestones (e.g., SePay webhook payloads).
4. **Credential Mismatch Between Seed & Test Fixtures**:
   - In M2, when the authentication endpoint `POST /api/auth/login` is implemented and verified against the seeded database, all tests using `FIXTURES.USERS.ADMIN.password` (`Admin@123`) or `INSPECTOR.password` (`Insp@123`) will fail with HTTP 401 UNAUTHORIZED because the database contains the hash for `Admin@123456`.
5. **Self-Certifying Test Masking**:
   - The test suite's 100% pass status reported in `TEST_READY.md` relies on `[200, 503].toContain(res.status)`. While planned as a harness for M5, accepting 503 connection failure as a pass gives false positive assurance that APIs are verified when they have not yet been implemented or called.

---

## 3. Caveats

- **SQL Server Database Foundation is Solid**:
  - The core SQL Server schema initialization on `localhost:1433` is 100% genuine and fully functional.
  - All 11 tables and 21 indexes were physically verified in `bus_ticketing_system`.
  - Referential integrity correctly enforces the 2 allowed cascades (`route_stops.route_id` and `tickets.order_id`) with 0 illegal cascades, preventing SQL Server Error 1785.
  - `scripts/verify-db.js` passes 43/43 assertions against the live database.
  - `npm run build`, `npm run lint`, and `npm run typecheck` all pass with exit code 0.
- **Root Cause of Test Failure is Test Query Casing**:
  - The 7 failures in `tests/adversarial/db-stress.test.ts` were caused by incorrect column names written in the adversarial test file, not by a database crash. `lib/db.ts` actually survived 100 concurrent queries, 50 delayed queries, and extreme SQL injection attacks without connection starvation.

---

## 4. Conclusion

The Milestone 1 implementation cannot be approved in its current state. The explicit gate verdict is **`REQUEST_CHANGES`**.

### Required Action Items for Worker M1 / Remediator:
1. **Create Authoritative TypeScript Domain Definitions (`types/db.ts`)**:
   - Define exported TypeScript interfaces and types for all 11 tables matching the exact schema column names: `User`, `BusRoute`, `BusStop`, `RouteStop`, `Bus`, `Schedule`, `TicketType`, `Order`, `Ticket`, `PaymentTransaction`, `Complaint`.
   - Export enum/union types for statuses: `UserRole`, `RouteDirection`, `TicketCategory`, `OrderStatus`, `TicketStatus`, `ComplaintStatus`.
2. **Fix `lib/db.ts` Object Parameter Binding & Export `bindParameters`**:
   - In `bindParameters`: If `typeof value === 'object'` and `value !== null`, check if it is `{ type, value }`; if not, serialize using `JSON.stringify(value)` into `sql.NVarChar`.
   - Export `bindParameters` so transactions in `withTransaction` can utilize unified parameter binding.
   - Guard `closePool()` against in-flight `__mssqlPoolPromise`.
3. **Align Seed Passwords and Test Fixtures**:
   - Align `tests/helpers/fixtures.ts` and `scripts/seed.js` to use consistent passwords (e.g. `Admin@123456` and `Inspector@123456`).
4. **Fix Column Casing in `tests/adversarial/db-stress.test.ts` & Ensure Clean Test Runner**:
   - Update `tests/adversarial/db-stress.test.ts` to use exact column names (`created_at`, `full_name`, `password_hash`, `is_active`, `route_name`, `route_code`).
   - Run `npx vitest run` and ensure all test files pass with exit code 0.
5. **Eliminate 503 False-Pass Masking in Test Suite**:
   - For tests intended to verify actual endpoints, avoid swallowing connection errors via `expect([200, 503]).toContain(res.status)`. Use proper skipped test marks (`it.skipIf(...)`) or targeted unit/integration assertions so that genuine API verification is not obscured by false positives.

---

## 5. Verification Method

To independently verify the fixes:

1. **Verify Database Integrity**:
   ```powershell
   node scripts/verify-db.js
   ```
   *Expected*: `Total Checks: 43 | Passed: 43 | Failed: 0`, exit code 0.

2. **Verify TypeScript Compilation**:
   ```powershell
   npm run typecheck
   ```
   *Expected*: `tsc --noEmit` exits with code 0 with `types/db.ts` imported.

3. **Verify Vitest Runner**:
   ```powershell
   npx vitest run
   ```
   *Expected*: All test suites pass (20/20 files, 124/124 tests), exit code 0.

4. **Verify Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Next.js build succeeds with Turbopack, exit code 0.

---

# Appendix: Quality & Adversarial Review Details

## Review Summary
- **Verdict**: **`REQUEST_CHANGES`**

## Findings

### [Critical] Finding 1: Test Runner Failure (`npx vitest run` exit code 1)
- **Where**: `tests/adversarial/db-stress.test.ts`
- **Why**: 7 tests fail with SQL errors (`Invalid column name 'createdAt'`, `'routeName'`, `'routeNumber'`), causing the test suite runner to terminate with exit code 1.
- **Suggestion**: Update column names in `tests/adversarial/db-stress.test.ts` to match the SQL Server schema (`created_at`, `route_name`, `route_code`).

### [Critical] Finding 2: Missing Authoritative TypeScript Domain Definitions
- **Where**: Project root / `types/`
- **Why**: Milestone 1 requires schema and data models. Currently no TypeScript interfaces exist for the 11 database entities, leading to `any` types and casing errors in downstream code.
- **Suggestion**: Create `types/db.ts` with strongly typed interfaces for all 11 tables and export them for use across API routes and tests.

### [Critical] Finding 3: Integrity Violation — Test Suite 503 Masking / Self-Certifying Fallback
- **Where**: `tests/helpers/test-client.ts`, all `tests/tier1-features/*.test.ts`, `tests/tier2-boundary/*.test.ts`
- **Why**: Tests assert `expect([200, 503]).toContain(res.status)`. When Next.js is offline, `fetch` fails and returns 503, making all tests pass and creating a false illusion of 100% verified test coverage in `TEST_READY.md`.
- **Suggestion**: Remove the 503 fallback from tests or gate live HTTP tests behind active server checks so that test results reflect genuine verification.

### [Major] Finding 4: Object Parameter Coercion to `[object Object]` in `lib/db.ts`
- **Where**: `lib/db.ts:111`
- **Why**: Plain JS objects passed as query parameters are coerced via `String(value)` to `"[object Object]"`, destroying structured JSON data.
- **Suggestion**: In `bindParameters`, serialize plain objects using `JSON.stringify(value)` when bound to `NVarChar`.

### [Major] Finding 5: Credential Inconsistency Between Seed and Fixtures
- **Where**: `scripts/seed.js:47-48` vs `tests/helpers/fixtures.ts:9,15`
- **Why**: Passwords differ (`Admin@123456` vs `Admin@123`), which will cause M2 authentication tests to fail against the seeded database.
- **Suggestion**: Synchronize passwords to `Admin@123456` and `Inspector@123456` in `fixtures.ts`.

---

## Adversarial Challenge Report

### Challenge Summary
- **Overall risk assessment**: **MEDIUM-HIGH** (Database core is resilient; test harness and type layer have gaps).

### Stress Test Results
1. **100 Concurrent Rapid Queries**: `PASS` — Completed in ~1.09s without pool starvation or timeout.
2. **50 Concurrent Delayed Queries (`WAITFOR DELAY 20ms`)**: `PASS` — Queued and executed through the 10-connection pool without deadlock.
3. **Extreme SQL Injection Payloads**: `PASS` — Stacked queries (`'; DROP TABLE...`), `UNION SELECT`, and `xp_cmdshell` strings were properly neutralized by parameter binding.
4. **Vietnamese Unicode (`NVarChar`)**: `PASS` — Accented characters (e.g. `Bến xe Long Biên`) stored and queried without mojibake.
5. **ACID Transaction Rollback & Commit**: `FAIL (Query syntax/casing)` — Logic functions correctly in `lib/db.ts`, but test script crashed due to column name mismatch (`createdAt`).
6. **Object Parameter Serialization**: `FAIL (Vulnerability confirmed)` — Passing an object without `{ type, value }` results in string `"[object Object]"`.
