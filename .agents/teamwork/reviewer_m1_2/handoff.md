# Handoff Report: Reviewer M1.2 (Milestone 1 Relational Integrity & Build Conformance)

- **Agent**: `reviewer_m1_2` (teamwork_preview_reviewer)
- **Roles**: reviewer, critic
- **Working Directory**: `d:/DangQuangTung/Vivu/.agents/teamwork/reviewer_m1_2`
- **Target Recipient**: Parent Orchestrator (`891098e1-52e3-4582-a42d-340f57c72e75`)
- **Timestamp**: 2026-10-02T13:21:00Z
- **Milestone**: M1 (Foundation & Database Architecture)
- **Gate Verdict**: **`REQUEST_CHANGES`**

---

## 1. Observation

### 1.1 Direct Database & Catalog Verifications

#### Direct SQL Query 1: Physical Base Tables Catalog
- **Tool / Command**:
  ```powershell
  sqlcmd -S localhost,1433 -U vivu_admin -P "VivuAdmin@2026!" -d bus_ticketing_system -C -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;"
  ```
- **Exit Code**: `0`
- **Verbatim Output**:
  ```
  TABLE_NAME
  --------------------------------------------------------------------------------------------------------------------------------
  bus_routes
  bus_stops
  buses
  complaints
  orders
  payment_transactions
  route_stops
  schedules
  ticket_types
  tickets
  users

  (11 rows affected)
  ```
- **Observation**: Exactly 11 base tables are physically instantiated in the Microsoft SQL Server 2025 Express database `bus_ticketing_system`.

#### Direct SQL Query 2: Foreign Key Cascade Rules & Actions
- **Tool / Command**:
  ```powershell
  sqlcmd -S localhost,1433 -U vivu_admin -P "VivuAdmin@2026!" -d bus_ticketing_system -C -W -Q "SELECT OBJECT_NAME(fk.parent_object_id) AS parent_table, COL_NAME(fc.parent_object_id, fc.parent_column_id) AS parent_col, OBJECT_NAME(fk.referenced_object_id) AS ref_table, COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS ref_col, fk.delete_referential_action_desc AS del_action FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fc ON fk.object_id = fc.constraint_object_id ORDER BY parent_table, parent_col;"
  ```
- **Exit Code**: `0`
- **Verbatim Output**:
  ```
  parent_table parent_col ref_table ref_col del_action
  ------------ ---------- --------- ------- ----------
  complaints route_id bus_routes id NO_ACTION
  complaints user_id users id NO_ACTION
  orders route_id bus_routes id NO_ACTION
  orders ticket_type_id ticket_types id NO_ACTION
  orders user_id users id NO_ACTION
  payment_transactions order_id orders id NO_ACTION
  route_stops route_id bus_routes id CASCADE
  route_stops stop_id bus_stops id NO_ACTION
  schedules bus_id buses id NO_ACTION
  schedules route_id bus_routes id NO_ACTION
  tickets order_id orders id CASCADE
  tickets route_id bus_routes id NO_ACTION
  tickets used_by_inspector_id users id NO_ACTION

  (13 rows affected)
  ```
- **Observation**: Exactly 2 foreign keys enforce `CASCADE` (`route_stops.route_id -> bus_routes.id` and `tickets.order_id -> orders.id`). The remaining 11 foreign keys enforce `NO_ACTION`, strictly adhering to Section 5.2 note of `thiet-ke-he-thong-xe-buyt.md` and preventing SQL Server Error 1785.

#### Direct SQL Query 3: Domain Check Constraints
- **Tool / Command**:
  ```powershell
  @'
  const sql = require('mssql');
  require('dotenv').config({ path: '.env.local' });
  (async () => {
    const pool = await sql.connect({
      user: process.env.DB_USER, password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER, port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME, options: { encrypt: false, trustServerCertificate: true }
    });
    const chk = await pool.request().query("SELECT tc.TABLE_NAME, cc.CHECK_CLAUSE FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME");
    for (const c of chk.recordset) console.log(`${c.TABLE_NAME}: ${c.CHECK_CLAUSE}`);
    await pool.close();
  })();
  '@ | node
  ```
- **Exit Code**: `0`
- **Verbatim Output**:
  ```
  orders: ([status]='EXPIRED' OR [status]='CANCELLED' OR [status]='PAID' OR [status]='PENDING')
  complaints: ([status]='RESOLVED' OR [status]='IN_PROGRESS' OR [status]='NEW')
  tickets: ([status]='CANCELLED' OR [status]='EXPIRED' OR [status]='USED' OR [status]='ACTIVE')
  users: ([role]='admin' OR [role]='inspector' OR [role]='passenger')
  bus_routes: ([direction]='BACKWARD' OR [direction]='FORWARD')
  ticket_types: ([category]='MONTHLY_PASS' OR [category]='DAILY_PASS' OR [category]='SINGLE_RIDE')
  ```
- **Observation**: All 6 required domain check constraints are physically configured on the tables.

#### Direct SQL Query 4: Seed Users and Bcrypt Hashes
- **Tool / Command**:
  ```powershell
  @"
  const sql = require('mssql');
  require('dotenv').config({ path: '.env.local' });
  const bcrypt = require('bcryptjs');
  (async () => {
    const pool = await sql.connect({
      user: process.env.DB_USER, password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER, port: parseInt(process.env.DB_PORT),
      database: process.env.DB_NAME, options: { encrypt: false, trustServerCertificate: true }
    });
    const res = await pool.request().query('SELECT email, password_hash FROM users');
    for (const u of res.recordset) {
      const testPwd = u.email.startsWith('admin') ? 'Admin@123456' : 'Inspector@123456';
      console.log('User:', u.email, '| Hash:', u.password_hash, '| Matches ' + testPwd + ':', bcrypt.compareSync(testPwd, u.password_hash));
    }
    await pool.close();
  })();
  "@ | node
  ```
- **Exit Code**: `0`
- **Verbatim Output**:
  ```
  User: admin@busticket.vn | Hash: $2b$10$lqxlU6wE.bZEZ7TcT77W6uHGOf0key4ThmSkI7n/1V1XRMTOi2FTy | Matches Admin@123456: true
  User: inspector1@busticket.vn | Hash: $2b$10$r0/UhZfgDhCCZhwGVT0MxeaiNRAg7cUw9I2f6QYH7r9/N/Rm7Ry2u | Matches Inspector@123456: true
  ```
- **Observation**: Admin and Inspector accounts match their specified passwords `Admin@123456` and `Inspector@123456`.

---

### 1.2 Tool Commands & Verbatim Execution Proof

#### Command 1: `node scripts/verify-db.js`
- **Exit Code**: `0`
- **Verbatim Output**:
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
     [PASS] Admin account is active
     [PASS] Inspector user (inspector1@busticket.vn) exists
     [PASS] Inspector account has role = inspector
     [PASS] Inspector account is active
     [PASS] Admin password matches bcrypt hash for "Admin@123456"
     [PASS] Inspector password matches bcrypt hash for "Inspector@123456"
  --- Section 4: Bus Route 01 ---
     [PASS] Route 01 exists in bus_routes
     [PASS] Route 01 name contains "Long Biên - Bến xe Hà Đông"
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

#### Command 2: `npm run build`
- **Exit Code**: `0`
- **Verbatim Output**:
  ```
  > vivu@0.1.0 build
  > next build

  ▲ Next.js 16.3.8 (Turbopack)
  - Environments: .env.local
  ✓ Running next.config.ts took 58ms

    Creating an optimized production build ...
  ✓ Compiled successfully in 302ms
    Running TypeScript ...
    Finished TypeScript in 3.9s ...
    Collecting page data using 4 workers ...
    Generating static pages using 4 workers (0/3) ...
  ✓ Generating static pages using 4 workers (3/3) in 1218ms
    Finalizing page optimization ...

  Route (app)
  ┌ ○ /
  └ ○ /_not-found

  ○  (Static)  prerendered as static content
  ```

#### Command 3: `node scripts/test-schema-adversarial.js`
- **Exit Code**: `0`
- **Verbatim Summary**:
  ```
  📊 ADVERSARIAL STRESS TEST SUMMARY
     Total Boundary Challenges: 39
     Passed: 39
     Failed: 0
  ✅ EMPIRICAL VERDICT: APPROVE (All 39 schema boundary constraints verified 100% strictly enforced)
  ```

#### Command 4: `npx vitest run`
- **Exit Code**: `0`
- **Direct Output Summary**:
  ```
  Test Files  21 passed (21)
       Tests  149 passed (149)
    Start at  20:16:53
    Duration  15.82s
  ```

---

### 1.3 Critical Deficiencies & Code Inspection Observations

#### 1. INTEGRITY VIOLATION: Self-Certifying Test Fallback Masking
- **Location**: `tests/helpers/test-client.ts` (lines 87–100) and across all 19 test files (e.g. `tests/tier1-features/auth.test.ts` lines 27–29, `routes-stops.test.ts` lines 17–19, 28–30, 45–47).
- **Code in `tests/helpers/test-client.ts`**:
  ```typescript
  } catch (err: any) {
    // Return structured response even on connection error to allow assertions
    return {
      status: 503,
      ok: false,
      data: {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `Could not connect to ${url}: ${err.message}`,
        },
      } as any,
      rawBody: err.message,
    };
  }
  ```
- **Code in `tests/tier1-features/auth.test.ts`**:
  ```typescript
  if (res.status === 201) {
    // Assertions on payload
  } else {
    // Contract check for shape
    expect([201, 503]).toContain(res.status);
  }
  ```
- **Direct Impact**: When the Next.js dev server is completely offline (as during M1 development), fetch throws connection error, `test-client` catches it and returns `status: 503`. The assertion tests whether `[201, 503]` contains `503`, which evaluates to `true`. Consequently, 110 tests pass unconditionally with zero server endpoints running or tested. This is a self-certifying facade that conceals unverified endpoints.

#### 2. Seed Credential Inconsistency Between Seed Script and Test Fixtures
- **Location**:
  - `scripts/seed.js` lines 47–48: `Admin@123456` and `Inspector@123456`.
  - `tests/helpers/fixtures.ts` lines 9, 15:
    ```typescript
    ADMIN: { email: 'admin@busticket.vn', password: 'Admin@123', ... },
    INSPECTOR: { email: 'inspector1@busticket.vn', password: 'Insp@123', ... },
    ```
- **Direct Impact**: In Milestone 2, authentication tests using `FIXTURES.USERS.ADMIN.password` will immediately fail with HTTP 401 Unauthorized against the database seed hash.

#### 3. Object Parameter Serialization Flaw in `lib/db.ts`
- **Location**: `lib/db.ts` lines 107–113:
  ```typescript
  } else if (typeof value === 'object' && value.type && 'value' in value) {
    request.input(key, value.type, value.value);
  } else {
    request.input(key, sql.NVarChar, String(value));
  }
  ```
- **Direct Impact**: When an object or array (such as SePay webhook raw JSON or error audit payloads) is passed as a query parameter, `String(value)` produces `"[object Object]"`, silently persisting corrupted data into `payment_transactions.raw_payload` or `raw_content`.

#### 4. Absence of Shared Authoritative TypeScript Domain Definitions
- **Location**: Project root (missing `types/db.ts`).
- **Direct Impact**: The lack of shared entity models led consumer code and tests to invent camelCase column names (`createdAt`, `passwordHash`, `routeNumber`), creating runtime SQL syntax errors and developer divergence.

---

## 2. Logic Chain

1. **Schema & Database Physicality (Observations 1.1 & 1.2)**: Direct inspection via `sqlcmd` and live queries confirmed that the Microsoft SQL Server 2025 Express instance contains all 11 tables, 13 foreign keys (strictly 2 CASCADE and 11 NO_ACTION), 6 check constraints, and authoritative seed rows matching `Admin@123456` and `Inspector@123456`.
2. **Build Readiness (Observation 1.2, Command 2)**: Next.js Turbopack compiles cleanly with exit code 0 (`npm run build`).
3. **Integrity Violation Discovery (Observation 1.3, Finding 1)**:
   - The test client catches fetch connection errors and returns HTTP 503.
   - All 19 test files contain `expect([EXPECTED_STATUS, 503]).toContain(res.status)`.
   - Because of this catch-and-fallback pattern, all 110 tests pass without verifying any live endpoints.
   - Per explicit instructions: *"If you detect ANY of these patterns [Evidence of self-certifying work without genuine independent verification], your verdict MUST be REQUEST_CHANGES with a Critical finding tagged as INTEGRITY VIOLATION. Do NOT approve work that cheats, regardless of test scores."*
4. **Integration Hazards in Downstream Milestones (Observation 1.3, Findings 2, 3, 4)**:
   - Mismatched passwords (`Admin@123` in fixtures vs `Admin@123456` in DB) will break M2 authentication testing.
   - `lib/db.ts` converting objects to `"[object Object]"` will corrupt M2 webhook logging.
   - Missing TypeScript models (`types/db.ts`) will cause camelCase vs snake_case confusion across portals and APIs.

---

## 3. Caveats

- **Database Engine & Scaffolding Are Robust**:
  - The actual SQL Server schema initialization on `localhost:1433` is 100% genuine and fully functional.
  - All 11 tables and 21 indexes are physically active in `bus_ticketing_system`.
  - Cascade delete restrictions strictly prevent Error 1785.
  - `lib/db.ts` connection pooling successfully passed 100 concurrent queries and transaction rollbacks.
- **Test Writer Intent**:
  - The test suite was constructed in advance for Milestone 5 (E2E Track). However, the inclusion of `503` in the assertions makes the test suite self-certifying and dangerous if left unaddressed.

---

## 4. Conclusion

**Verdict**: **`REQUEST_CHANGES`**

### Findings Summary

| Severity | Tag | Summary | Location |
|---|---|---|---|
| **Critical** | **INTEGRITY VIOLATION** | Self-certifying test masking (HTTP 503 fallback passes all tests offline) | `tests/helpers/test-client.ts`, `tests/tier1-*`, `tests/tier2-*` |
| **Major** | Defect | Seed credential mismatch (`Admin@123` vs `Admin@123456`) | `tests/helpers/fixtures.ts` (lines 9, 15) vs `scripts/seed.js` |
| **Major** | Defect | Object parameter serialization to `"[object Object]"` | `lib/db.ts` (lines 107–113) |
| **Major** | Architecture Gap | Missing shared TypeScript domain models (`types/db.ts`) | Root (missing `types/db.ts`) |
| **Minor** | Configuration | Missing path alias `@/*` in Vitest configuration | `vitest.config.ts` |

### Required Action Items for Worker M1 / Remediator:
1. **Remove Self-Certifying Fallbacks in Test Client & Assertions**:
   - `test-client.ts` must not mask connection failures with 503. Test assertions must not include `503` as an acceptable status code.
2. **Align Test Fixture Passwords**:
   - Update `tests/helpers/fixtures.ts` to use `Admin@123456` and `Inspector@123456` matching `scripts/seed.js`.
3. **Fix `lib/db.ts` Parameter Serialization**:
   - In `bindParameters`: serialize plain objects using `JSON.stringify(value)` into `sql.NVarChar`.
4. **Create `types/db.ts`**:
   - Define exported TypeScript interfaces matching exact database column names for all 11 tables.
5. **Configure Alias in `vitest.config.ts`**:
   - Add `@` alias pointing to the root directory.

---

## 5. Verification Method

To independently verify all observations and test results:

1. **Verify Database Catalog & Cascade Rules Directly via sqlcmd**:
   ```powershell
   sqlcmd -S localhost,1433 -U vivu_admin -P "VivuAdmin@2026!" -d bus_ticketing_system -C -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;"
   sqlcmd -S localhost,1433 -U vivu_admin -P "VivuAdmin@2026!" -d bus_ticketing_system -C -W -Q "SELECT OBJECT_NAME(fk.parent_object_id) AS parent_table, COL_NAME(fc.parent_object_id, fc.parent_column_id) AS parent_col, OBJECT_NAME(fk.referenced_object_id) AS ref_table, COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS ref_col, fk.delete_referential_action_desc AS del_action FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fc ON fk.object_id = fc.constraint_object_id ORDER BY parent_table, parent_col;"
   ```
   *Expected output*: 11 base tables, exactly 2 CASCADE foreign keys (`route_stops.route_id` and `tickets.order_id`), 11 NO_ACTION foreign keys.

2. **Verify Database Script**:
   ```powershell
   node scripts/verify-db.js
   ```
   *Expected output*: 43/43 checks passed, exit code 0.

3. **Verify Adversarial Schema Stress Tests**:
   ```powershell
   node scripts/test-schema-adversarial.js
   ```
   *Expected output*: 39/39 boundary challenges passed, exit code 0.

4. **Verify Production Build**:
   ```powershell
   npm run build
   ```
   *Expected output*: Next.js build succeeds, exit code 0.

5. **Verify Self-Certifying Test Masking**:
   Inspect `tests/helpers/test-client.ts` lines 87-100 and note that stopping the server still yields 100% test pass on `npx vitest run tests/tier1-features tests/tier2-boundary tests/tier3-interactions tests/tier4-scenarios`.
