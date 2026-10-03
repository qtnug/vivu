# Handoff Report: Explorer M1.it2.3 (Test Execution Strategy & Partitioning)

- **Agent**: `explorer_m1_it2_3` (teamwork_preview_explorer)
- **Roles**: explorer, test architect
- **Working Directory**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it2_3`
- **Target Recipient**: Parent Orchestrator (`891098e1-52e3-4582-a42d-340f57c72e75`)
- **Timestamp**: 2026-10-02T13:28:00Z
- **Milestone**: Milestone 1 Remediation (Iteration 2.3)
- **Status**: COMPLETE (Hard Handoff)

---

## 1. Observation

1. **Current Gate Status & Reviewer Feedback**:
   - In `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/GATE_STATUS.md` lines 15-20:
     ```markdown
     ### Issues to Remediate:
     1. [CRITICAL] Fix self-certifying 503 fallback masking in tests/helpers/test-client.ts and test assertions so offline failures are not falsely accepted as passing.
     ...
     5. [MINOR] Fix camelCase column names (createdAt -> created_at) in tests/adversarial/db-stress.test.ts.
     ```
   - In `d:/DangQuangTung/Vivu/.agents/teamwork/reviewer_m1_1/handoff.md` lines 105-121:
     Reviewer ran `npx vitest run`:
     ```
     Test Files  1 failed | 19 passed (20)
          Tests  7 failed | 117 passed (124)
     FAIL tests/adversarial/db-stress.test.ts
     ```
   - In `d:/DangQuangTung/Vivu/.agents/teamwork/reviewer_m1_1/handoff.md` lines 141-146 & 162-164:
     Reviewer observed:
     > *"In tests/helpers/test-client.ts lines 87-100: Fetch connection errors (when Next.js server is not running on port 3001) catch fetch error and return { status: 503, ok: false, ... }."*
     > *"In virtually all 19 test files (110 test cases), assertions contain fallback checks: if (res.status === 200) { ... } else { expect([200, 503]).toContain(res.status); } ... This causes all 110 tests to pass unconditionally when no server or API is running."*

2. **Absence of API Route Handlers in Milestone 1 Scope**:
   - Inspection of `d:/DangQuangTung/Vivu/app/` reveals only `globals.css`, `layout.tsx`, and `page.tsx`.
   - The directory `d:/DangQuangTung/Vivu/app/api/` does not exist.
   - In `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md` lines 61-69:
     - **Milestone 1**: Foundation & Database Architecture (Project scaffold, SQL Server schema 11 tables, Seed data, DB client pool).
     - **Milestone 2**: Authentication & Core REST APIs (Auth JWT, Routes/Stops APIs, Orders, SePay Webhook, Ticket verification, Complaints).
     - **Milestone 4**: Inspector & Admin Portals + Admin REST APIs (`/api/admin/*`).
     - **Milestone 5**: E2E Test Suite Pass & Adversarial Hardening.

3. **Current Test File Inventory (21 Test Files)**:
   - **Database-Only Tests (2 files)**:
     - `tests/adversarial/db-stress.test.ts` (directly imports `lib/db.ts`, connects to SQL Server)
     - `tests/tier2-boundary/boundary-schema-constraints.test.ts` (directly imports `mssql`, tests FK/Check constraints)
   - **API / E2E Tests (19 files)**:
     - `tests/tier1-features/*.test.ts` (8 files: `admin-crud`, `auth`, `complaints`, `orders`, `routes-stops`, `sepay-webhook`, `ticket-types`, `ticket-verify`)
     - `tests/tier2-boundary/*.test.ts` (5 files: `boundary-expiry`, `boundary-orders`, `boundary-qr-verify`, `boundary-security`, `boundary-webhook`)
     - `tests/tier3-interactions/*.test.ts` (3 files: `booking-payment-scan-lifecycle`, `monthly-pass-lifecycle`, `route-stop-reorder-impact`)
     - `tests/tier4-scenarios/*.test.ts` (3 files: `scenario-admin-operations`, `scenario-guest-single-ride`, `scenario-student-monthly`)

4. **Monolithic Vitest and Package.json Configuration**:
   - In `d:/DangQuangTung/Vivu/package.json` line 11:
     `"test": "vitest run"`
   - In `d:/DangQuangTung/Vivu/vitest.config.ts` line 7:
     `include: ['tests/**/*.test.ts']`

---

## 2. Logic Chain

1. **Why the M1 Gate Invalidation Occurred**:
   - The parallel E2E Testing Track created test suites for all project tiers (Tiers 1-4) upfront.
   - Because `package.json` and `vitest.config.ts` included all tests under `tests/**/*.test.ts`, running `npx vitest run` in Milestone 1 evaluated tests for features scheduled for Milestone 2 and Milestone 4 (which have no `/api/*` endpoints yet).
   - To make `vitest run` not crash, the test author introduced the 503 fallback hack in `test-client.ts` and `expect([200, 503])` assertions in test files.
   - Reviewers detected that this created a self-certifying loop where offline failures were masked as passes.

2. **Why Simply Removing 503 Without Partitioning Breaks M1**:
   - If 503 masking is removed immediately while `vitest run` still scans `tests/**/*.test.ts`, Vitest will attempt to execute 19 API test files against `/api/auth/*`, `/api/orders/*`, etc.
   - Because those route handlers belong to Milestone 2 and do not exist in Milestone 1, all 19 test files will fail with connection errors or 404s.
   - This would improperly block Milestone 1 completion on code that is explicitly out of scope for Milestone 1.

3. **The Necessary Solution: Architectural Test Partitioning**:
   - **Milestone 1 Scope**: Strictly the database engine, schema constraints, connection pool, and seed data.
     - Files: `tests/adversarial/db-stress.test.ts` + `tests/tier2-boundary/boundary-schema-constraints.test.ts`.
     - Mechanism: Direct connection to SQL Server via `lib/db.ts` / `mssql`. No Next.js server needed.
   - **Milestone 2 Scope**: Core REST APIs.
     - Files: `tests/tier1-features/` (auth, routes, orders, webhook, ticket verify, complaints) + `tests/tier2-boundary/` (except schema).
     - Mechanism: Requires Next.js server running on `localhost:3001`. Strict HTTP assertions (200, 201, 400). Zero 503 fallbacks.
   - **Milestone 5 Scope**: Full System E2E verification.
     - Files: All 21 test files (Tiers 1-5).
     - Mechanism: Complete integration against live SQL Server and running Next.js application server.

4. **Runner Configuration Proposal**:
   - Configure Vitest Projects in `vitest.config.ts`:
     - Project `db`: includes `tests/adversarial/db-stress.test.ts`, `tests/tier2-boundary/boundary-schema-constraints.test.ts`.
     - Project `api`: includes `tests/tier1-features/**/*.test.ts`, `tests/tier2-boundary/**/*.test.ts` (excluding `boundary-schema-constraints.test.ts`).
     - Project `e2e`: includes `tests/tier3-interactions/**/*.test.ts`, `tests/tier4-scenarios/**/*.test.ts`.
   - Update `package.json`:
     - `"test:db": "vitest run --project db"`
     - `"test:api": "vitest run --project api"`
     - `"test:e2e": "vitest run --project e2e"`
     - `"test:all": "vitest run"`
     - `"test": "vitest run --project db"` (during M1)

---

## 3. Caveats

1. **Test Port Alignment**: API tests default to `http://localhost:3001` (`NEXT_PUBLIC_APP_URL` / `API_BASE_URL`). Next.js dev server must be run with `-p 3001` (`npm run dev`) during M2/M5 API test execution.
2. **Database Cleanliness Between Runs**: `tests/adversarial/db-stress.test.ts` and `boundary-schema-constraints.test.ts` create test records with unique prefixes and perform teardown. Before running M1 tests, ensure SQL Server is running and seeded (`npm run db:init && npm run db:seed`).
3. **No Code Modification Undertaken**: In adherence to explorer read-only constraints, all proposals are documented in `analysis.md` and `handoff.md` for Worker M1 to apply.

---

## 4. Conclusion

1. **Clear Division of Responsibility**:
   - **Milestone 1**: Test SQL Server directly via `lib/db.ts` using `tests/adversarial/db-stress.test.ts` and `tests/tier2-boundary/boundary-schema-constraints.test.ts`. Gate validation is satisfied when `npm run test:db` (and `node scripts/verify-db.js`) passes 100%.
   - **Milestone 2**: Implement REST APIs (`app/api/*`), eliminate the 503 fallback from `test-client.ts`, convert test assertions to strict status codes, start the Next.js server, and execute `npm run test:api`.
   - **Milestone 5**: Execute `npm run test:all` across all 21 test files for 100% full-platform verification.

2. **Actionable Implementation Steps for Worker M1**:
   - Update `package.json` scripts:
     ```json
     "test": "vitest run --project db",
     "test:db": "vitest run --project db",
     "test:api": "vitest run --project api",
     "test:e2e": "vitest run --project e2e",
     "test:all": "vitest run",
     ```
   - Update `vitest.config.ts` to define the 3 projects (`db`, `api`, `e2e`).
   - Fix snake_case column names in `tests/adversarial/db-stress.test.ts` (`created_at`, `route_name`, `route_code`).
   - Run `npm run test:db` to verify 100% pass on all 88 database assertions.

---

## 5. Verification Method

To independently verify this strategy:

1. **Verify Database-Only Execution (M1 Scope)**:
   ```powershell
   npx vitest run tests/adversarial/db-stress.test.ts tests/tier2-boundary/boundary-schema-constraints.test.ts
   ```
   *Expected Result*: All database tests run directly against SQL Server without requiring Next.js server or encountering 503 errors.

2. **Inspect Files for 503 Masking Pattern**:
   ```powershell
   Select-String -Path "tests/**/*.ts" -Pattern "503"
   ```
   *Observation*: Confirms the 19 files using 503 masking belong to API/E2E tiers, whereas `db-stress.test.ts` and `boundary-schema-constraints.test.ts` do not use 503 masking.

3. **Verify Database Verification Script**:
   ```powershell
   node scripts/verify-db.js
   ```
   *Expected Result*: 43/43 database checks pass.

4. **Verify TypeScript & Build**:
   ```powershell
   npm run typecheck
   npm run lint
   npm run build
   ```
   *Expected Result*: 0 errors, exit code 0.
