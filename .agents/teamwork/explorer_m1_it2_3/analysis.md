# Analysis: Test Execution Strategy & Architectural Partitioning (Milestone 1 vs Milestone 2/M5)

- **Agent**: `explorer_m1_it2_3` (teamwork_preview_explorer)
- **Roles**: explorer, test architect
- **Working Directory**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it2_3`
- **Target Recipient**: Parent Orchestrator (`891098e1-52e3-4582-a42d-340f57c72e75`)
- **Date**: 2026-10-02
- **Milestone Context**: Milestone 1 Remediation (Iteration 2.3)

---

## 1. Executive Summary

During Milestone 1 Iteration 1 gate verification, the test suite encountered a fundamental architectural conflict between the **Milestone-Driven Implementation Track (Track 1)** and the **Ahead-of-Time E2E Testing Track (Track 2)**:
1. **The Root Dilemma**: Track 2 pre-authored 21 test files covering Tiers 1 through 4 (Auth, Orders, Webhook, Ticket verification, Admin CRUD, E2E journeys). Because Milestone 1 is strictly scoped to **Foundation & Database Architecture**, the Next.js REST API endpoints (`app/api/*`) were not implemented yet by design (they are scheduled for Milestone 2 and Milestone 4).
2. **The Masking Anti-Pattern**: To prevent test runner crashes during M1, Track 2 introduced a catch block in `tests/helpers/test-client.ts` that returned HTTP 503 on connection failure, and inserted fallback assertions `expect([200, 503]).toContain(res.status)` across 19 test files. Reviewers rightfully rejected this self-certifying mechanism.
3. **The Solution**: 
   - Strict **Test Suite Partitioning**: Explicitly isolate pure database engine/schema tests (Milestone 1) from REST API integration tests (Milestone 2/4) and full lifecycle E2E scenarios (Milestone 5).
   - Complete **Removal of 503 Masking**: Transition all API tests to deterministic HTTP status code assertions (`expect(res.status).toBe(200/201)`), backed by a pre-flight server readiness check.
   - **Milestone-Scoped NPM Runners & Vitest Configuration**: Establish dedicated commands (`npm run test:db`, `npm run test:api`, `npm run test:e2e`, `npm run test:all`) and configure Vitest projects so that M1 gate evaluation runs genuine database tests without false passes or inappropriate cross-milestone test execution.

---

## 2. Root Cause Analysis: The Track 1 vs Track 2 Impedance Mismatch

### 2.1 The Scope Boundary Breakdown
According to `orchestrator_1/PROJECT.md` and `orchestrator_1/plan.md`:
- **Milestone 1 Scope**: Project scaffold, SQL Server schema (11 tables), Seed data, DB client pool (`lib/db.ts`), Domain models (`types/db.ts`).
  - No Next.js API route handlers exist or should exist in M1 (`app/api/` does not exist).
  - No background dev server is running during unit/integration test runs.
- **Milestone 2 Scope**: Authentication (`/api/auth/*`), JWT middleware, Routes & Stops APIs (`/api/routes/*`), Orders API (`/api/orders/*`), SePay Webhook (`/api/webhooks/sepay`), Ticket verification (`/api/tickets/*`), Complaints (`/api/complaints/*`).
- **Milestone 4 Scope**: Admin REST APIs (`/api/admin/*`) and inspector staff management.
- **Milestone 5 Scope**: 100% pass on all 21 test files covering Tiers 1-4 + Tier 5 adversarial stress testing.

### 2.2 How the Monolithic Test Runner Caused Gate Failure
When reviewers ran `npx vitest run` in Iteration 1:
- `vitest.config.ts` was configured with `include: ['tests/**/*.test.ts']`.
- Vitest executed all 21 test files indiscriminately.
- 19 test files made calls to `http://localhost:3001/api/...`. Because no server was active and no route handlers existed:
  - `test-client.ts` caught `fetch` errors and returned `{ status: 503 }`.
  - The assertions `expect([200, 503]).toContain(res.status)` passed conditionally, masking the offline state.
- Meanwhile, the only two files actually executing against SQL Server were:
  - `tests/tier2-boundary/boundary-schema-constraints.test.ts` (Passed).
  - `tests/adversarial/db-stress.test.ts` (Failed 7 tests due to camelCase column names like `createdAt`, `routeName`, `routeNumber`).
- Reviewers flagged both the real database test failures and the deceptive 503 passing tests.

---

## 3. Test Suite Partitioning Matrix

The project's 21 test files divide into 3 distinct functional domains across the project lifecycle:

| Domain | Files | Test Count | Direct Dependencies | Target Milestone | Execution Nature |
|---|---|---|---|---|---|
| **Domain A: Database Engine & Relational Schema** | `tests/adversarial/db-stress.test.ts`<br>`tests/tier2-boundary/boundary-schema-constraints.test.ts` | 88 tests | SQL Server on `localhost:1433`<br>`lib/db.ts`<br>`mssql` | **Milestone 1** | **Direct DB Execution**<br>No web server needed.<br>Runs via Node/Vitest. |
| **Domain B: Core REST APIs & Endpoints** | `tests/tier1-features/auth.test.ts`<br>`routes-stops.test.ts`<br>`ticket-types.test.ts`<br>`orders.test.ts`<br>`sepay-webhook.test.ts`<br>`ticket-verify.test.ts`<br>`complaints.test.ts`<br>`tests/tier2-boundary/boundary-orders.test.ts`<br>`boundary-webhook.test.ts`<br>`boundary-qr-verify.test.ts`<br>`boundary-expiry.test.ts` | 55 tests | SQL Server + Running Next.js server (`http://localhost:3001`)<br>Route handlers in `app/api/*` | **Milestone 2** | **HTTP Integration**<br>Next.js server must be active.<br>Zero 503 tolerance. |
| **Domain C: Admin CRUD, Security RBAC & E2E Scenarios** | `tests/tier1-features/admin-crud.test.ts`<br>`tests/tier2-boundary/boundary-security.test.ts`<br>`tests/tier3-interactions/route-stop-reorder-impact.test.ts`<br>`tests/tier3-interactions/booking-payment-scan-lifecycle.test.ts`<br>`tests/tier3-interactions/monthly-pass-lifecycle.test.ts`<br>`tests/tier4-scenarios/scenario-admin-operations.test.ts`<br>`tests/tier4-scenarios/scenario-guest-single-ride.test.ts`<br>`tests/tier4-scenarios/scenario-student-monthly.test.ts` | 42 tests | Full System (SQL Server + Next.js server + Admin APIs + Inspector Portal APIs) | **Milestone 4 (Admin) & Milestone 5 (E2E)** | **System E2E Lifecycle**<br>Multi-role user journeys.<br>Complete flow verification. |

---

## 4. Remediation Plan: Eliminating False 503 Masking

### 4.1 Step 1: Clean Up `tests/helpers/test-client.ts`
Remove the 503 synthetic catch block. Connection errors must never masquerade as an HTTP 503 response.

```typescript
// Proposed implementation in tests/helpers/test-client.ts
try {
  const response = await fetch(url, init);
  const rawBody = await response.text();
  let data: any = rawBody;
  try {
    data = JSON.parse(rawBody);
  } catch {
    // Leave as raw text if not JSON
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
    rawBody,
  };
} catch (err: any) {
  // DO NOT MASK AS 503. Fail clearly and informatively.
  throw new Error(
    `[TestClient Connection Error] Unable to connect to ${url}: ${err.message}.\n` +
    `Ensure the Next.js server is running on http://localhost:3001 before executing API tests.`
  );
}
```

### 4.2 Step 2: Remove Ambiguous Assertions in Test Files
In all 19 API/E2E test files, remove:
```typescript
// BAD: Self-certifying mask
if (res.status === 200) {
  expect(res.data).toHaveProperty(...);
} else {
  expect([200, 503]).toContain(res.status);
}
```
Replace with:
```typescript
// GOOD: Deterministic, unequivocal assertion
expect(res.status).toBe(200);
expect(res.data).toHaveProperty(...);
```

### 4.3 Step 3: Implement Pre-Flight Server Readiness Check
To protect developers and CI from a barrage of 100+ connection error stack traces when the server is inadvertently left offline, create a lightweight pre-flight hook in `tests/helpers/server-check.ts`:

```typescript
export async function ensureServerReady(baseUrl = 'http://localhost:3001'): Promise<void> {
  try {
    const res = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(2000) });
  } catch (err: any) {
    throw new Error(
      `\n========================================================================\n` +
      `🚨 PRE-FLIGHT CHECK FAILED: Next.js server is not reachable at ${baseUrl}\n` +
      `   Start the application server before running API or E2E tests:\n` +
      `     Terminal 1: npm run dev\n` +
      `     Terminal 2: npm run test:api\n` +
      `========================================================================\n`
    );
  }
}
```

---

## 5. Proposed Test Runner Architecture

### 5.1 Proposed `vitest.config.ts` (Vitest Projects)
By leveraging Vitest Projects, tests are modularly grouped without creating multiple configuration files:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 20000,
    pool: 'threads',
    projects: [
      {
        name: 'db',
        test: {
          include: [
            'tests/adversarial/db-stress.test.ts',
            'tests/tier2-boundary/boundary-schema-constraints.test.ts',
          ],
        },
      },
      {
        name: 'api',
        test: {
          include: [
            'tests/tier1-features/**/*.test.ts',
            'tests/tier2-boundary/**/*.test.ts',
          ],
          exclude: [
            'tests/tier2-boundary/boundary-schema-constraints.test.ts',
          ],
        },
      },
      {
        name: 'e2e',
        test: {
          include: [
            'tests/tier3-interactions/**/*.test.ts',
            'tests/tier4-scenarios/**/*.test.ts',
          ],
        },
      },
    ],
  },
});
```

### 5.2 Proposed `package.json` Scripts
Update `package.json` scripts to provide clear, milestone-oriented commands:

```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "db:init": "node scripts/init-db.js",
    "db:seed": "node scripts/seed.js",
    "db:verify": "node scripts/verify-db.js",
    
    "test": "vitest run --project db",
    "test:db": "vitest run --project db",
    "test:api": "vitest run --project api",
    "test:e2e": "vitest run --project e2e",
    "test:all": "vitest run",
    "test:watch": "vitest"
  }
}
```

> **Key Rule for Milestone 1**: 
> In Milestone 1, `npm test` and `npm run test:db` run `--project db`, ensuring that **only** the Milestone 1 database tests (`db-stress.test.ts` and `boundary-schema-constraints.test.ts`) are evaluated. 
> In Milestone 2, `npm run test:api` validates the newly created REST endpoints against the running server.
> In Milestone 5, `npm run test:all` executes all projects (all 21 test files) to guarantee 100% full-platform verification.

---

## 6. Milestone Gate Verification Matrix

| Milestone | Gate Verification Commands | Required Outcome | Infrastructure Dependencies |
|---|---|---|---|
| **M1: Database & Foundation** | 1. `node scripts/verify-db.js`<br>2. `npm run test:db`<br>3. `npm run typecheck`<br>4. `npm run lint`<br>5. `npm run build` | - 43/43 database catalog checks PASS<br>- 100% pass on 88 direct database tests<br>- 0 TypeScript errors, 0 lint errors<br>- Build exit code 0 | SQL Server (`localhost:1433`) only. |
| **M2: Core REST APIs** | 1. `npm run test:db`<br>2. `npm run test:api`<br>3. `npm run typecheck`<br>4. `npm run lint` | - 100% pass on DB tests<br>- 100% pass on Core API tests with genuine HTTP responses (200, 201, 400, etc.)<br>- Zero 503 masked assertions | SQL Server + Next.js server (`localhost:3001`). |
| **M4: Admin & Inspector Portals** | 1. `npm run test:api`<br>2. `npm run test:admin`<br>3. `npm run build` | - 100% pass on Admin CRUD & RBAC tests<br>- Next.js build passes with 14 functional screens | SQL Server + Next.js server (`localhost:3001`). |
| **M5: E2E Pass & Hardening** | 1. `npm run test:all`<br>2. `npm run build` | - **100% pass across all 21 test files** (124+ tests)<br>- 0 skips, 0 failures, 0 masked fallbacks | SQL Server + Next.js server (`localhost:3001`). |

---

## 7. Concrete Next Steps for Worker M1 (Iteration 2 Remediator)

1. **Keep `tests/adversarial/db-stress.test.ts` & `tests/tier2-boundary/boundary-schema-constraints.test.ts`** as the sole test suite for M1.
2. **Ensure snake_case column names** in `db-stress.test.ts` (`created_at`, `route_name`, `route_code`).
3. **Configure Vitest Projects in `vitest.config.ts`** and add `"test:db": "vitest run --project db"` to `package.json`.
4. **Run `npm run test:db`** and verify exit code 0 before requesting reviewer gate approval.
5. In M2, worker implements `/api/*` endpoints, removes 503 fallbacks from `test-client.ts` and API test files, and runs `npm run test:api`.
