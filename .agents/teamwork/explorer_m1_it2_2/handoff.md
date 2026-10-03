# Handoff Report: Explorer M1 Iteration 2.2 (Test Suites Integrity & Fixtures Strategy)

- **Agent**: `explorer_m1_it2_2` (teamwork_preview_explorer)
- **Role**: Test Suite Analyst & Fix Strategist
- **Working Directory**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it2_2`
- **Target Recipient**: Parent Orchestrator (`891098e1-52e3-4582-a42d-340f57c72e75`), Worker M1.it2
- **Handoff Type**: Hard (Task Complete)
- **Timestamp**: 2026-10-02T13:26:00Z

---

## 1. Observation

### 1.1 Direct File Observations

#### Observation 1: `tests/helpers/test-client.ts` 503 Masking Catch Block
- **File**: `d:/DangQuangTung/Vivu/tests/helpers/test-client.ts`
- **Lines 71–101**:
  ```typescript
  71:     try {
  72:       const response = await fetch(url, init);
  73:       const rawBody = await response.text();
  74:       let data: any = rawBody;
  75:       try {
  76:         data = JSON.parse(rawBody);
  77:       } catch {
  78:         // Leave as string if not JSON
  79:       }
  80: 
  81:       return {
  82:         status: response.status,
  83:         ok: response.ok,
  84:         data,
  85:         rawBody,
  86:       };
  87:     } catch (err: any) {
  88:       // Return structured response even on connection error to allow assertions
  89:       return {
  90:         status: 503,
  91:         ok: false,
  92:         data: {
  93:           error: {
  94:             code: 'SERVICE_UNAVAILABLE',
  95:             message: `Could not connect to ${url}: ${err.message}`,
  96:           },
  97:         } as any,
  98:         rawBody: err.message,
  99:       };
  100:     }
  ```
- **Finding**: When `fetch(url, init)` fails due to an offline server, the outer catch block synthesizes a simulated HTTP response with `status: 503`. Across 19 test files (e.g. `tests/tier1-features/auth.test.ts:28,44,59`), assertions contain `expect([200, 503]).toContain(res.status)`, masking offline unexecuted tests as passed.

#### Observation 2: `tests/helpers/fixtures.ts` Credential Inconsistency
- **File**: `d:/DangQuangTung/Vivu/tests/helpers/fixtures.ts`
- **Lines 7–18**:
  ```typescript
  7:     ADMIN: {
  8:       email: 'admin@busticket.vn',
  9:       password: 'Admin@123',
  10:       role: 'admin',
  11:       fullName: 'Quản trị viên',
  12:     },
  13:     INSPECTOR: {
  14:       email: 'inspector1@busticket.vn',
  15:       password: 'Insp@123',
  16:       role: 'inspector',
  17:       fullName: 'Nguyễn Văn Soát',
  18:     },
  ```
- **Comparison File**: `d:/DangQuangTung/Vivu/scripts/seed.js` lines 47–48 & 53–54:
  ```javascript
  47: const DEFAULT_ADMIN_HASH = '$2b$10$.cY6uE7da5f/g9Y3CRXISeb07ShM3O4sP92fSWCZTy/lajHQJg57W'; // Admin@123456
  48: const DEFAULT_INSP_HASH = '$2b$10$8Nj9A9Vmihn0I0w.btDMuuQtl5jLig2ZkGBgUoC0XhAefcnB0T2R2';  // Inspector@123456
  53: const adminHash = await bcrypt.hash('Admin@123456', 10);
  54: const inspectorHash = await bcrypt.hash('Inspector@123456', 10);
  ```
- **Comparison File**: `d:/DangQuangTung/Vivu/scripts/verify-db.js` lines 142–155:
  ```javascript
  142: const adminMatch = bcrypt.compareSync('Admin@123456', adminUser.password_hash);
  143: logPass('Admin password matches bcrypt hash for "Admin@123456"');
  ...
  153: const inspMatch = bcrypt.compareSync('Inspector@123456', inspUser.password_hash);
  154: logPass('Inspector password matches bcrypt hash for "Inspector@123456"');
  ```
- **Finding**: Fixtures specify `Admin@123` and `Insp@123`, whereas database seed hashes correspond to `Admin@123456` and `Inspector@123456`.

#### Observation 3: `tests/adversarial/db-stress.test.ts` Column Casing Verification
- **File**: `d:/DangQuangTung/Vivu/tests/adversarial/db-stress.test.ts`
- **Reviewed Queries**:
  - Line 119, 157, 194, 206, 234: `INSERT INTO users (id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at)` -> `created_at, updated_at, full_name, password_hash, is_active`
  - Line 266: `INSERT INTO users (id, email, full_name, role, password_hash, is_active, created_at, updated_at)` -> `created_at, updated_at, full_name, password_hash, is_active`
  - Line 287: `' UNION SELECT id, password_hash, email, full_name, role, 1, 0, 1, SYSUTCDATETIME(), SYSUTCDATETIME() FROM users --` -> `password_hash, email, full_name, role`
  - Line 317: `SELECT id, route_name FROM bus_routes WHERE route_name LIKE @search` -> `route_name`
  - Line 386 & 393: `SELECT route_code FROM bus_routes WHERE route_code = @num` -> `route_code`
  - Line 405: `INSERT INTO users (... created_at, updated_at)` -> `created_at, updated_at`
  - Line 411: `UPDATE users SET full_name = 'Temp Updated' WHERE email = @email` -> `full_name`
  - Line 426: `INSERT INTO users (... created_at, updated_at)` -> `created_at, updated_at`
- **Finding**: All 13 SQL queries in `db-stress.test.ts` have been verified to use snake_case column names strictly conforming to `scripts/schema.sql`. The original 7 syntax errors observed by Reviewer M1.1 (`createdAt`, `routeName`, `routeNumber`) have been fully resolved.

---

## 2. Logic Chain

1. **Integrity Violation in Test Client (Observation 1)**:
   - Returning HTTP 503 from `TestClient.request()` when `fetch()` throws transforms an unhandled connection exception into a fake successful response object.
   - Assertions using `expect([200, 503]).toContain(res.status)` evaluate to true when no server is running.
   - Removing lines 71 and 87–100 causes `fetch(url, init)` to reject authentically if the server is offline. This restores test integrity: an offline server fails API tests as intended, preventing false pass reporting.
2. **Credential Divergence Between Seed and Test Fixtures (Observation 2)**:
   - `scripts/seed.js` hashes `'Admin@123456'` and `'Inspector@123456'` into `users.password_hash`.
   - `tests/helpers/fixtures.ts` sets `ADMIN.password = 'Admin@123'` and `INSPECTOR.password = 'Insp@123'`.
   - In M2, `POST /api/auth/login` uses `bcrypt.compare(password, password_hash)`. Calling login with `Admin@123` or `Insp@123` will return HTTP 401.
   - Synchronizing lines 9 and 15 of `tests/helpers/fixtures.ts` to `'Admin@123456'` and `'Inspector@123456'` ensures seamless authentication in M2.
3. **Database Schema Conformance (Observation 3)**:
   - SQL Server tables created in `scripts/schema.sql` define columns in `snake_case` (`full_name`, `password_hash`, `created_at`, `updated_at`, `route_name`, `route_code`).
   - All SQL statements in `tests/adversarial/db-stress.test.ts` have been inspected and confirmed to use exact snake_case columns.
   - As observed by Reviewer M1.2, this suite passes 19/19 tests without connection starvation or syntax errors.

---

## 3. Caveats

1. **Running API Tests Offline**: Once the 503 catch block in `test-client.ts` is removed, running Vitest globally (`npx vitest run`) without a running Next.js instance on port 3001 will cause the 19 HTTP test files to fail with `TypeError: fetch failed`. In M1, only the database test suites (`tests/adversarial/db-stress.test.ts` and `tests/tier2-boundary/boundary-schema-constraints.test.ts`) are within scope. The HTTP test suites belong to M2 through M5 and require `npm run dev -p 3001` or `npm run start -p 3001`.
2. **vitest.config.ts Path Alias**: Reviewer M1.2 noted `@/*` path alias is not yet mapped in `vitest.config.ts`. Tests currently use relative imports (`../../lib/db`, `../helpers/fixtures`), which functions correctly. Adding `@` alias in `vitest.config.ts` is recommended for future convenience.
3. **Plain Object Serialization in `lib/db.ts`**: This issue is assigned to peer agent `explorer_m1_it2_1` (`lib/db.ts` `bindParameters`). Our scope focuses exclusively on `test-client.ts`, `fixtures.ts`, and `db-stress.test.ts`.

---

## 4. Conclusion

The test suite remediation strategy is fully defined, verified, and ready for Worker M1.it2 execution:
1. **`tests/helpers/test-client.ts`**: Delete lines 71 and 87–100 (the outer try/catch block returning 503) so offline requests reject authentically with standard fetch errors.
2. **`tests/helpers/fixtures.ts`**: Update line 9 (`password: 'Admin@123456'`) and line 15 (`password: 'Inspector@123456'`) to synchronize with `scripts/seed.js`.
3. **`tests/adversarial/db-stress.test.ts`**: Confirmed 100% compliant with SQL Server snake_case schema across all 13 queries.

### Proposed Code Diffs for Worker M1.it2:

#### Diff 1: `tests/helpers/fixtures.ts`
```diff
--- a/tests/helpers/fixtures.ts
+++ b/tests/helpers/fixtures.ts
@@ -9,7 +9,7 @@ export const FIXTURES = {
     ADMIN: {
       email: 'admin@busticket.vn',
-      password: 'Admin@123',
+      password: 'Admin@123456',
       role: 'admin',
       fullName: 'Quản trị viên',
     },
@@ -15,7 +15,7 @@ export const FIXTURES = {
     INSPECTOR: {
       email: 'inspector1@busticket.vn',
-      password: 'Insp@123',
+      password: 'Inspector@123456',
       role: 'inspector',
       fullName: 'Nguyễn Văn Soát',
     },
```

#### Diff 2: `tests/helpers/test-client.ts`
```diff
--- a/tests/helpers/test-client.ts
+++ b/tests/helpers/test-client.ts
@@ -71,30 +71,14 @@ export class TestClient {
-    try {
-      const response = await fetch(url, init);
-      const rawBody = await response.text();
-      let data: any = rawBody;
-      try {
-        data = JSON.parse(rawBody);
-      } catch {
-        // Leave as string if not JSON
-      }
-
-      return {
-        status: response.status,
-        ok: response.ok,
-        data,
-        rawBody,
-      };
-    } catch (err: any) {
-      // Return structured response even on connection error to allow assertions
-      return {
-        status: 503,
-        ok: false,
-        data: {
-          error: {
-            code: 'SERVICE_UNAVAILABLE',
-            message: `Could not connect to ${url}: ${err.message}`,
-          },
-        } as any,
-        rawBody: err.message,
-      };
-    }
+    const response = await fetch(url, init);
+    const rawBody = await response.text();
+    let data: any = rawBody;
+    try {
+      data = JSON.parse(rawBody);
+    } catch {
+      // Leave as string if not JSON
     }
+
+    return {
+      status: response.status,
+      ok: response.ok,
+      data,
+      rawBody,
+    };
```

---

## 5. Verification Method

To independently verify the fixes:

1. **Verify Test Client Authenticity**:
   - Inspect `tests/helpers/test-client.ts` lines 70–88: Ensure no `catch` block returns `status: 503`.
   - Run a test against an unstarted port:
     ```powershell
     npx vitest run tests/tier1-features/auth.test.ts
     ```
     *Expected*: Fails authentically with `fetch failed` when server is not running, confirming 503 masking is eliminated.

2. **Verify Fixture Synchronization**:
   - Inspect `tests/helpers/fixtures.ts` lines 9 and 15:
     ```powershell
     Select-String -Path tests/helpers/fixtures.ts -Pattern "Admin@123456", "Inspector@123456"
     ```
     *Expected*: Both patterns match lines 9 and 15.

3. **Verify Database Stress Suite Integrity**:
   - Run database stress test suite:
     ```powershell
     npx vitest run tests/adversarial/db-stress.test.ts tests/tier2-boundary/boundary-schema-constraints.test.ts
     ```
     *Expected*: 100% passed (2 test files, all tests pass with exit code 0).

4. **Verify Live Database Conformance**:
   ```powershell
   node scripts/verify-db.js
   ```
   *Expected*: 43/43 checks passed, exit code 0.
