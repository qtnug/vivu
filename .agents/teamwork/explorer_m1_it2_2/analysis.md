# Comprehensive Analysis: Test Suites Fix Strategy (M1 Iteration 2.2)

- **Agent**: `explorer_m1_it2_2` (teamwork_preview_explorer)
- **Role**: Test Suite Analyst & Fix Strategist
- **Working Directory**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it2_2`
- **Target Recipient**: Parent Orchestrator (`891098e1-52e3-4582-a42d-340f57c72e75`), Worker M1.it2
- **Timestamp**: 2026-10-02T13:25:00Z
- **Reference Mandate**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (R4, R6)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/GATE_STATUS.md` (Remediation Items 1, 4, 5)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/reviewer_m1_1/handoff.md`
  - `d:/DangQuangTung/Vivu/.agents/teamwork/reviewer_m1_2/handoff.md`

---

## Executive Summary

During Milestone 1 gate reviews, Reviewer M1.1 and Reviewer M1.2 issued `REQUEST_CHANGES` verdicts due to three specific test harness discrepancies:
1. **Critical Integrity Violation**: `tests/helpers/test-client.ts` contained a try/catch block that trapped network fetch failures when Next.js was offline and synthesized an artificial HTTP `503 Service Unavailable` response. Combined with assertions checking `expect([200, 503]).toContain(res.status)`, this allowed 110 API test cases to pass unconditionally without verifying any live endpoints.
2. **Major Authentication Fixture Mismatch**: `tests/helpers/fixtures.ts` specified `Admin@123` and `Insp@123`, whereas `scripts/seed.js` and `scripts/verify-db.js` populated SQL Server with hashes for `Admin@123456` and `Inspector@123456`. This discrepancy would guarantee HTTP 401 login failures in Milestone 2.
3. **Minor Database Column Casing Defect**: `tests/adversarial/db-stress.test.ts` originally threw 7 SQL Server syntax errors due to JavaScript camelCase column names (`createdAt`, `routeName`, `routeNumber`) instead of the authoritative schema snake_case columns (`created_at`, `route_name`, `route_code`).

This report details the exact forensic analysis, before/after code snippets, unified diff patches, and independent verification procedures for all three files to enable Worker M1.it2 to remediate the test harness cleanly.

---

## 1. Deep Dive: `tests/helpers/test-client.ts`

### 1.1 Problem Analysis
In `tests/helpers/test-client.ts` (lines 71–101):
```typescript
    try {
      const response = await fetch(url, init);
      const rawBody = await response.text();
      let data: any = rawBody;
      try {
        data = JSON.parse(rawBody);
      } catch {
        // Leave as string if not JSON
      }

      return {
        status: response.status,
        ok: response.ok,
        data,
        rawBody,
      };
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

#### Why This Is an Integrity Violation:
- **Masking Offline State**: When no Next.js server is running on `http://localhost:3001` (standard during database-only M1 work), Node's native `fetch` throws a connection error (`TypeError: fetch failed` / `ECONNREFUSED`).
- **Fabricated HTTP Status**: The catch block converts a transport-level network exception into a faux HTTP application response (`status: 503`).
- **Self-Certifying Assertion Trap**: Test suites across `tests/tier1-features/`, `tests/tier2-boundary/`, `tests/tier3-interactions/`, and `tests/tier4-scenarios/` implemented fallback logic:
  ```typescript
  if (res.status === 200) {
    // Assertions on response data
  } else {
    expect([200, 503]).toContain(res.status); // PASSES UNCONDITIONALLY
  }
  ```
  Consequently, all 110 tests reported "PASS", giving a false illusion of complete API verification when zero endpoints existed or responded.

### 1.2 Fix Strategy
Remove the outer `try/catch` block entirely. 
- When an API endpoint is called, `fetch(url, init)` must execute directly.
- If the server is offline or unreachable, `fetch` will throw an authentic error (`TypeError: fetch failed`), correctly terminating the test with an unhandled rejection.
- If the server is online, genuine HTTP responses (200, 201, 400, 401, 404, 500) will be processed normally.
- The inner JSON parse try/catch (`try { data = JSON.parse(rawBody); } catch {}`) is preserved to prevent crashes when servers return plain text or HTML error pages.

### 1.3 Exact Code Replacement

#### Target File: `tests/helpers/test-client.ts` (Lines 71–101)

**Before (Lines 71–101)**:
```typescript
    try {
      const response = await fetch(url, init);
      const rawBody = await response.text();
      let data: any = rawBody;
      try {
        data = JSON.parse(rawBody);
      } catch {
        // Leave as string if not JSON
      }

      return {
        status: response.status,
        ok: response.ok,
        data,
        rawBody,
      };
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

**After**:
```typescript
    const response = await fetch(url, init);
    const rawBody = await response.text();
    let data: any = rawBody;
    try {
      data = JSON.parse(rawBody);
    } catch {
      // Leave as string if not JSON
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
      rawBody,
    };
```

---

## 2. Deep Dive: `tests/helpers/fixtures.ts`

### 2.1 Problem Analysis
In `tests/helpers/fixtures.ts` (lines 6–18):
```typescript
export const FIXTURES = {
  USERS: {
    ADMIN: {
      email: 'admin@busticket.vn',
      password: 'Admin@123',
      role: 'admin',
      fullName: 'Quản trị viên',
    },
    INSPECTOR: {
      email: 'inspector1@busticket.vn',
      password: 'Insp@123',
      role: 'inspector',
      fullName: 'Nguyễn Văn Soát',
    },
```

#### Comparison with Authoritative Database Seed:
1. `scripts/seed.js` (lines 47–48 & 53–54):
   ```javascript
   const DEFAULT_ADMIN_HASH = '$2b$10$.cY6uE7da5f/g9Y3CRXISeb07ShM3O4sP92fSWCZTy/lajHQJg57W'; // Admin@123456
   const DEFAULT_INSP_HASH = '$2b$10$8Nj9A9Vmihn0I0w.btDMuuQtl5jLig2ZkGBgUoC0XhAefcnB0T2R2';  // Inspector@123456
   const adminHash = await bcrypt.hash('Admin@123456', 10);
   const inspectorHash = await bcrypt.hash('Inspector@123456', 10);
   ```
2. `scripts/verify-db.js` (lines 142–155):
   ```javascript
   const adminMatch = bcrypt.compareSync('Admin@123456', adminUser.password_hash);
   const inspMatch = bcrypt.compareSync('Inspector@123456', inspUser.password_hash);
   ```
3. Live Database Verification:
   Reviewer M1.1 & M1.2 executed direct bcrypt verification against SQL Server `users` table:
   - `admin@busticket.vn` matches `Admin@123456`: `true`
   - `inspector1@busticket.vn` matches `Inspector@123456`: `true`

#### Downstream Impact:
In Milestone 2, all authentication tests calling `POST /api/auth/login` with `FIXTURES.USERS.ADMIN.password` or `FIXTURES.USERS.INSPECTOR.password` would receive HTTP 401 UNAUTHORIZED, causing cascading test suite failure.

### 2.2 Fix Strategy
Synchronize `FIXTURES.USERS.ADMIN.password` and `FIXTURES.USERS.INSPECTOR.password` to match `scripts/seed.js` exactly:
- `ADMIN.password`: `'Admin@123456'`
- `INSPECTOR.password`: `'Inspector@123456'`

### 2.3 Exact Code Replacement

#### Target File: `tests/helpers/fixtures.ts` (Lines 7–18)

**Before (Lines 7–18)**:
```typescript
    ADMIN: {
      email: 'admin@busticket.vn',
      password: 'Admin@123',
      role: 'admin',
      fullName: 'Quản trị viên',
    },
    INSPECTOR: {
      email: 'inspector1@busticket.vn',
      password: 'Insp@123',
      role: 'inspector',
      fullName: 'Nguyễn Văn Soát',
    },
```

**After**:
```typescript
    ADMIN: {
      email: 'admin@busticket.vn',
      password: 'Admin@123456',
      role: 'admin',
      fullName: 'Quản trị viên',
    },
    INSPECTOR: {
      email: 'inspector1@busticket.vn',
      password: 'Inspector@123456',
      role: 'inspector',
      fullName: 'Nguyễn Văn Soát',
    },
```

---

## 3. Deep Dive: `tests/adversarial/db-stress.test.ts`

### 3.1 Forensic History of Defect
During Iteration 1, Reviewer M1.1 executed `npx vitest run` and encountered 7 failing tests in `tests/adversarial/db-stress.test.ts`:
1. `rolls back all modifications when an error is thrown inside withTransaction` -> `RequestError: Invalid column name 'createdAt'`
2. `successfully commits operations when no error is thrown inside withTransaction` -> `RequestError: Invalid column name 'createdAt'`
3. `handles SQL constraint violation inside transaction gracefully without crashing pool` -> `RequestError: Invalid column name 'createdAt'`
4. `safely handles injection payloads in LIKE clauses with parameters` -> `RequestError: Invalid column name 'routeName'`
5. `queryOne returns first element when found, null when empty` -> `RequestError: Invalid column name 'routeNumber'`
6. `execute returns correct affected rows count` -> `RequestError: Invalid column name 'createdAt'`
7. `executeReturning outputs the inserted row` -> `RequestError: Invalid column name 'createdAt'`

### 3.2 Authoritative Schema Mapping
In Microsoft SQL Server DDL (`scripts/schema.sql`):
- `users` table:
  - `full_name NVARCHAR(255) NOT NULL` (NOT `fullName`)
  - `password_hash NVARCHAR(255)` (NOT `passwordHash`)
  - `is_active BIT NOT NULL DEFAULT 1` (NOT `isActive`)
  - `created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` (NOT `createdAt`)
  - `updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` (NOT `updatedAt`)
- `bus_routes` table:
  - `route_code VARCHAR(20) NOT NULL UNIQUE` (NOT `routeNumber`)
  - `route_name NVARCHAR(255) NOT NULL` (NOT `routeName`)

### 3.3 Audit of All SQL Statements in `tests/adversarial/db-stress.test.ts`
Our exhaustive line-by-line inspection confirms the exact queries in the file:

| Location | SQL Operation | Columns Checked | Status |
|---|---|---|---|
| Lines 118–122 | `INSERT INTO users` | `id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at` | ✅ Strict snake_case |
| Lines 156–160 | `INSERT INTO users` | `id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at` | ✅ Strict snake_case |
| Lines 193–196 | `INSERT INTO users` | `id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at` | ✅ Strict snake_case |
| Lines 205–208 | `INSERT INTO users` | `id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at` | ✅ Strict snake_case |
| Lines 233–237 | `INSERT INTO users ... OUTPUT INSERTED.id` | `id, email, phone, full_name, role, password_hash, is_active, created_at, updated_at` | ✅ Strict snake_case |
| Lines 266–269 | `INSERT INTO users` | `id, email, full_name, role, password_hash, is_active, created_at, updated_at` | ✅ Strict snake_case |
| Line 287 | `UNION SELECT ... FROM users` | `id, password_hash, email, full_name, role` | ✅ Strict snake_case |
| Line 299 | `SELECT id, email FROM users` | `id, email` | ✅ Strict snake_case |
| Line 317 | `SELECT id, route_name FROM bus_routes WHERE route_name LIKE @search` | `id, route_name` | ✅ Strict snake_case (Fixed from `routeName`) |
| Line 386 | `SELECT route_code FROM bus_routes WHERE route_code = @num` | `route_code` | ✅ Strict snake_case (Fixed from `routeNumber`) |
| Line 393 | `SELECT route_code FROM bus_routes WHERE route_code = @num` | `route_code` | ✅ Strict snake_case (Fixed from `routeNumber`) |
| Lines 404–419 | `INSERT INTO users`, `UPDATE users SET full_name = ...`, `DELETE FROM users` | `id, email, phone, full_name, created_at, updated_at` | ✅ Strict snake_case (Fixed from `createdAt`) |
| Lines 425–430 | `INSERT INTO users ... OUTPUT INSERTED.id, INSERTED.email` | `id, email, phone, full_name, created_at, updated_at` | ✅ Strict snake_case (Fixed from `createdAt`) |

**Status Confirmation**:
The column names in `tests/adversarial/db-stress.test.ts` have been verified to conform 100% to the SQL Server schema. In Reviewer M1.2's run, `tests/adversarial/db-stress.test.ts` executed all 19 stress & concurrency tests with exit code 0.

---

## 4. Unified Remediation Patch

The following unified diff contains the complete, verified changes required across `tests/helpers/test-client.ts` and `tests/helpers/fixtures.ts`:

```diff
diff --git a/tests/helpers/fixtures.ts b/tests/helpers/fixtures.ts
index 72abc12..83fde44 100644
--- a/tests/helpers/fixtures.ts
+++ b/tests/helpers/fixtures.ts
@@ -6,13 +6,13 @@ export const FIXTURES = {
   USERS: {
     ADMIN: {
       email: 'admin@busticket.vn',
-      password: 'Admin@123',
+      password: 'Admin@123456',
       role: 'admin',
       fullName: 'Quản trị viên',
     },
     INSPECTOR: {
       email: 'inspector1@busticket.vn',
-      password: 'Insp@123',
+      password: 'Inspector@123456',
       role: 'inspector',
       fullName: 'Nguyễn Văn Soát',
     },
diff --git a/tests/helpers/test-client.ts b/tests/helpers/test-client.ts
index 389b1c2..92d04a1 100644
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
+    }
+
+    return {
+      status: response.status,
+      ok: response.ok,
+      data,
+      rawBody,
+    };
   }
 }
```

---

## 5. Architectural Test Partitioning & Verification Strategy

### 5.1 Test Suite Roles Across Milestones
- **Milestone 1 Scope (Foundation & Database Architecture)**:
  - Active targets: SQL Server database, `scripts/init-db.js`, `scripts/seed.js`, `scripts/verify-db.js`, `lib/db.ts`.
  - Legitimate M1 test suites:
    1. `tests/adversarial/db-stress.test.ts` (tests pool saturation, deadlock resistance, ACID transactions, SQL injection defense).
    2. `tests/tier2-boundary/boundary-schema-constraints.test.ts` (tests table foreign keys, check constraints, cascade deletions).
  - Both suites connect directly to SQL Server `localhost:1433` and do not require Next.js HTTP server.
- **Milestones 2–5 Scope (APIs, Portals, E2E)**:
  - Active targets: `app/api/*`, `app/(passenger)/*`, `app/inspector/*`, `app/admin/*`.
  - 19 HTTP test suites (`tier1-features/`, `tier2-boundary/`, `tier3-interactions/`, `tier4-scenarios/`).
  - Once 503 masking is removed, executing HTTP tests requires Next.js running (`npm run dev -p 3001` or `npm run build && npm start -p 3001`). This ensures 100% authentic API verification without false positives.

### 5.2 Verification Procedures for M1 Iteration 2
1. **Verify Database Integrity**:
   ```powershell
   node scripts/verify-db.js
   ```
   *Expected*: All 43 checks pass, exit code 0.
2. **Verify Adversarial Schema Stress Tests**:
   ```powershell
   node scripts/test-schema-adversarial.js
   ```
   *Expected*: All 39 boundary checks pass, exit code 0.
3. **Verify Database Stress Suite with Vitest**:
   ```powershell
   npx vitest run tests/adversarial/db-stress.test.ts tests/tier2-boundary/boundary-schema-constraints.test.ts
   ```
   *Expected*: All tests pass (100%), exit code 0.
4. **Verify TypeScript Compilation**:
   ```powershell
   npm run typecheck
   ```
   *Expected*: `tsc --noEmit` exits with code 0.
5. **Verify Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Next.js build succeeds with Turbopack, exit code 0.
