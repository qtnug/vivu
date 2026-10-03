# Comprehensive Analysis: Eradication of Remaining 503 Assertions Across API Test Suites

- **Agent**: Explorer M1 Iteration 3.3 (`teamwork_preview_explorer`)
- **Roles**: explorer
- **Working Directory**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_3`
- **Target Target Files**: 14 test files in `tests/`
- **Patch Artifact**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_3/eradicate_503.patch`

---

## 1. Executive Summary

Reviewer M1.it2.2 identified that while `tests/helpers/test-client.ts` removed its internal synthetic 503 catch-block, **54 occurrences** of `expect([..., 503]).toContain(res.status)` and `if (res.status !== 503)` persisted across test files in `tests/`. This condition allowed tests to pass vacuously whenever an endpoint returned 503 or when the test bypassed property assertions inside conditional guards.

An exhaustive scan across all directories in `tests/` (`tier1-features/`, `tier2-boundary/`, `tier3-interactions/`, `tier4-scenarios/`, `adversarial/`, `helpers/`) verified:
- **Exact Count of 503 References**: **54 occurrences** across **14 test files**.
- **Breakdown by Test Tier**:
  - `tests/tier1-features/`: **29 occurrences** across 8 files (`admin-crud`, `auth`, `complaints`, `orders`, `routes-stops`, `sepay-webhook`, `ticket-types`, `ticket-verify`).
  - `tests/tier2-boundary/`: **24 occurrences** across 5 files (`boundary-expiry`, `boundary-orders`, `boundary-qr-verify`, `boundary-security`, `boundary-webhook`).
  - `tests/tier3-interactions/`: **1 occurrence** in 1 file (`route-stop-reorder-impact`).
  - `tests/tier4-scenarios/`: 0 occurrences (clean authentic assertions).
  - `tests/adversarial/`: 0 occurrences (clean authentic assertions).
  - `tests/helpers/`: 0 occurrences (testClient authentically throws on connection error).
- **Teardown Defect**: In `tests/tier2-boundary/boundary-schema-constraints.test.ts:60`, `await pool.close()` threw unhandled `TypeError: Cannot read properties of undefined (reading 'close')` when database connections failed in `beforeAll`.

---

## 2. Complete Inventory Catalog (54 Occurrences)

| # | Test File | Line | Original Code | Endpoint Contract & Intent | Strict Authentic Replacement |
|---|---|---|---|---|---|
| 1 | `tests/tier1-features/admin-crud.test.ts` | 28 | `expect([200, 401, 503]).toContain(res.status)` | `GET /api/admin/dashboard` (Authenticated Admin) | `expect(res.status).toBe(200)` |
| 2 | `tests/tier1-features/admin-crud.test.ts` | 49 | `expect([201, 401, 503]).toContain(res.status)` | `POST /api/admin/routes` (Create Route) | `expect(res.status).toBe(201)` |
| 3 | `tests/tier1-features/admin-crud.test.ts` | 70 | `expect([201, 401, 503]).toContain(res.status)` | `POST /api/admin/stops` (Create Stop) | `expect(res.status).toBe(201)` |
| 4 | `tests/tier1-features/admin-crud.test.ts` | 91 | `expect([201, 401, 503]).toContain(res.status)` | `POST /api/admin/staff` (Create Inspector) | `expect(res.status).toBe(201)` |
| 5 | `tests/tier1-features/admin-crud.test.ts` | 100 | `expect([200, 401, 503]).toContain(res.status)` | `GET /api/admin/orders?status=PENDING` | `expect(res.status).toBe(200)` |
| 6 | `tests/tier1-features/auth.test.ts` | 28 | `expect([201, 503]).toContain(res.status)` | `POST /api/auth/register` (New Passenger) | `expect(res.status).toBe(201)` |
| 7 | `tests/tier1-features/auth.test.ts` | 44 | `expect([200, 401, 503]).toContain(res.status)` | `POST /api/auth/login` (Passenger Login) | `expect(res.status).toBe(200)` |
| 8 | `tests/tier1-features/auth.test.ts` | 59 | `expect([200, 401, 503]).toContain(res.status)` | `POST /api/auth/login` (Inspector Login) | `expect(res.status).toBe(200)` |
| 9 | `tests/tier1-features/auth.test.ts` | 74 | `expect([200, 401, 503]).toContain(res.status)` | `POST /api/auth/login` (Admin Login) | `expect(res.status).toBe(200)` |
| 10 | `tests/tier1-features/auth.test.ts` | 96 | `expect([200, 401, 503]).toContain(refreshRes.status)` | `POST /api/auth/refresh` (Valid Refresh Token) | `expect(refreshRes.status).toBe(200)` |
| 11 | `tests/tier1-features/auth.test.ts` | 106 | `if (res.status !== 503) {` | `POST /api/auth/login` (Wrong Password) | Remove if guard; enforce `expect(res.status).toBe(401)` |
| 12 | `tests/tier1-features/complaints.test.ts` | 20 | `expect([201, 503]).toContain(res.status)` | `POST /api/complaints` (Guest Complaint) | `expect(res.status).toBe(201)` |
| 13 | `tests/tier1-features/complaints.test.ts` | 46 | `expect([201, 401, 503]).toContain(res.status)` | `POST /api/complaints` (Auth Passenger) | `expect(res.status).toBe(201)` |
| 14 | `tests/tier1-features/complaints.test.ts` | 56 | `if (res.status !== 503) {` | `POST /api/complaints` (Missing Category) | Remove if guard; enforce `expect(res.status).toBe(400)` |
| 15 | `tests/tier1-features/complaints.test.ts` | 70 | `if (res.status !== 503) {` | `POST /api/complaints` (Empty Content) | Remove if guard; enforce `expect(res.status).toBe(400)` |
| 16 | `tests/tier1-features/complaints.test.ts` | 86 | `expect([201, 503]).toContain(res.status)` | `POST /api/complaints` (No routeId general feedback) | `expect(res.status).toBe(201)` |
| 17 | `tests/tier1-features/orders.test.ts` | 35 | `expect([201, 503]).toContain(res.status)` | `POST /api/orders` (Guest Order) | `expect(res.status).toBe(201)` |
| 18 | `tests/tier1-features/orders.test.ts` | 63 | `expect([201, 401, 503]).toContain(res.status)` | `POST /api/orders` (Auth Passenger Order) | `expect(res.status).toBe(201)` |
| 19 | `tests/tier1-features/routes-stops.test.ts` | 18 | `expect([200, 503]).toContain(res.status)` | `GET /api/routes` (Active Routes List) | `expect(res.status).toBe(200)` |
| 20 | `tests/tier1-features/routes-stops.test.ts` | 29 | `expect([200, 503]).toContain(res.status)` | `GET /api/routes?search=01` (Search Query) | `expect(res.status).toBe(200)` |
| 21 | `tests/tier1-features/routes-stops.test.ts` | 46 | `expect([200, 503]).toContain(res.status)` | `GET /api/routes/[id]` (Detail & Timetable) | `expect(res.status).toBe(200)` |
| 22 | `tests/tier1-features/routes-stops.test.ts` | 62 | `expect([200, 503]).toContain(res.status)` | `GET /api/stops` (Stops List) | `expect(res.status).toBe(200)` |
| 23 | `tests/tier1-features/routes-stops.test.ts` | 82 | `expect([200, 503]).toContain(res.status)` | `GET /api/routes/search` (Coordinate search) | `expect(res.status).toBe(200)` |
| 24 | `tests/tier1-features/routes-stops.test.ts` | 89 | `if (res.status !== 503) {` | `GET /api/routes/[fakeId]` (Non-existent ID) | Remove if guard; enforce `expect(res.status).toBe(404)` |
| 25 | `tests/tier1-features/sepay-webhook.test.ts` | 29 | `expect([200, 201, 503]).toContain(orderRes.status)` | `POST /api/orders` precondition for webhook | `expect(orderRes.status).toBe(201)` |
| 26 | `tests/tier1-features/sepay-webhook.test.ts` | 114 | `if (res.status !== 503) {` | `POST /api/webhooks/sepay` (Missing Apikey) | Remove if guard; enforce `expect(res.status).toBe(401)` |
| 27 | `tests/tier1-features/ticket-types.test.ts` | 12 | `expect([200, 503]).toContain(res.status)` | `GET /api/ticket-types` (Active Ticket Types) | `expect(res.status).toBe(200)` |
| 28 | `tests/tier1-features/ticket-verify.test.ts` | 134 | `if (verifyRes.status !== 503) {` | `POST /api/tickets/verify` (Malformed JWT) | Remove if guard; enforce `expect(verifyRes.status).toBe(200)` |
| 29 | `tests/tier1-features/ticket-verify.test.ts` | 152 | `expect([200, 401, 503]).toContain(res.status)` | `GET /api/tickets/me` (My Tickets) | `expect(res.status).toBe(200)` |
| 30 | `tests/tier2-boundary/boundary-expiry.test.ts` | 31 | `if (res.status !== 503) {` | `POST /api/webhooks/sepay` (Expired Order Webhook) | Remove if guard; enforce `expect([400, 404]).toContain(res.status)` |
| 31 | `tests/tier2-boundary/boundary-expiry.test.ts` | 43 | `if (res.status !== 503) {` | `POST /api/orders/[id]/regenerate` | Remove if guard; enforce `expect([200, 201, 400, 404]).toContain(res.status)` |
| 32 | `tests/tier2-boundary/boundary-expiry.test.ts` | 61 | `if (regenRes.status !== 503) {` | `POST /api/orders/[activeId]/regenerate` | Remove if guard; enforce `expect([400, 409]).toContain(regenRes.status)` |
| 33 | `tests/tier2-boundary/boundary-expiry.test.ts` | 71 | `if (res.status !== 503) {` | `POST /api/orders/[fakeId]/regenerate` | Remove if guard; enforce `expect(res.status).toBe(404)` |
| 34 | `tests/tier2-boundary/boundary-orders.test.ts` | 18 | `if (res.status !== 503) {` | `POST /api/orders` (Quantity = 0) | Remove if guard; enforce `expect(res.status).toBe(400)` |
| 35 | `tests/tier2-boundary/boundary-orders.test.ts` | 33 | `if (res.status !== 503) {` | `POST /api/orders` (Negative quantity) | Remove if guard; enforce `expect(res.status).toBe(400)` |
| 36 | `tests/tier2-boundary/boundary-orders.test.ts` | 48 | `if (res.status !== 503) {` | `POST /api/orders` (Float quantity 1.5) | Remove if guard; enforce `expect(res.status).toBe(400)` |
| 37 | `tests/tier2-boundary/boundary-orders.test.ts` | 63 | `if (res.status !== 503) {` | `POST /api/orders` (Guest missing phone) | Remove if guard; enforce `expect(res.status).toBe(400)` |
| 38 | `tests/tier2-boundary/boundary-orders.test.ts` | 78 | `if (res.status !== 503) {` | `POST /api/orders` (Non-existent ticketTypeId) | Remove if guard; enforce `expect([400, 404]).toContain(res.status)` |
| 39 | `tests/tier2-boundary/boundary-orders.test.ts` | 93 | `if (res.status !== 503) {` | `POST /api/orders` (Activation date in past) | Remove if guard; enforce `expect(res.status).toBe(400)` |
| 40 | `tests/tier2-boundary/boundary-qr-verify.test.ts` | 24 | `if (res.status !== 503) {` | `POST /api/tickets/verify` (Forged JWT) | Remove if guard; enforce `expect(res.status).toBe(200)` |
| 41 | `tests/tier2-boundary/boundary-qr-verify.test.ts` | 34 | `if (res.status !== 503) {` | `POST /api/tickets/verify` (Garbage QR string) | Remove if guard; enforce `expect(res.status).toBe(200)` |
| 42 | `tests/tier2-boundary/boundary-qr-verify.test.ts` | 48 | `if (res.status !== 503) {` | `POST /api/tickets/verify` (Fake ticket code) | Remove if guard; enforce `expect(res.status).toBe(200)` |
| 43 | `tests/tier2-boundary/boundary-qr-verify.test.ts` | 58 | `if (res.status !== 503) {` | `POST /api/tickets/verify` (Empty payload) | Remove if guard; enforce `expect(res.status).toBe(400)` |
| 44 | `tests/tier2-boundary/boundary-qr-verify.test.ts` | 72 | `if (res.status !== 503) {` | `POST /api/tickets/verify` (Expired ticket) | Remove if guard; enforce `expect(res.status).toBe(200)` |
| 45 | `tests/tier2-boundary/boundary-security.test.ts` | 27 | `if (res.status !== 503) {` | `GET /api/admin/dashboard` (Passenger RBAC) | Remove if guard; enforce `expect(res.status).toBe(403)` |
| 46 | `tests/tier2-boundary/boundary-security.test.ts` | 35 | `if (res.status !== 503) {` | `POST /api/admin/routes` (Inspector RBAC) | Remove if guard; enforce `expect(res.status).toBe(403)` |
| 47 | `tests/tier2-boundary/boundary-security.test.ts` | 43 | `if (res.status !== 503) {` | `POST /api/tickets/verify` (Passenger RBAC) | Remove if guard; enforce `expect(res.status).toBe(403)` |
| 48 | `tests/tier2-boundary/boundary-security.test.ts` | 51 | `if (res.status !== 503) {` | `GET /api/admin/dashboard` (Unauthenticated) | Remove if guard; enforce `expect(res.status).toBe(401)` |
| 49 | `tests/tier2-boundary/boundary-security.test.ts` | 60 | `if (res.status !== 503) {` | `GET /api/routes?search=SQLi` (Sanitization) | Remove if guard; enforce `expect(res.status).toBe(200)` |
| 50 | `tests/tier2-boundary/boundary-webhook.test.ts` | 59 | `if (res.status !== 503) {` | `POST /api/webhooks/sepay` (No order code) | Remove if guard; enforce `expect([400, 404]).toContain(res.status)` |
| 51 | `tests/tier2-boundary/boundary-webhook.test.ts` | 68 | `if (res.status !== 503) {` | `POST /api/webhooks/sepay` (Fake order code) | Remove if guard; enforce `expect(res.status).toBe(404)` |
| 52 | `tests/tier2-boundary/boundary-webhook.test.ts` | 78 | `if (res.status !== 503) {` | `POST /api/webhooks/sepay` (Invalid Apikey) | Remove if guard; enforce `expect(res.status).toBe(401)` |
| 53 | `tests/tier2-boundary/boundary-webhook.test.ts` | 86 | `if (res.status !== 503) {` | `POST /api/webhooks/sepay` (Malformed body) | Remove if guard; enforce `expect(res.status).toBe(400)` |
| 54 | `tests/tier3-interactions/route-stop-reorder-impact.test.ts` | 28 | `if (res.status !== 503) {` | `PUT /api/admin/routes/:id/stops/reorder` | Remove if guard; enforce `expect([200, 204, 404]).toContain(res.status)` |

### Additional Bug Remediation: Database Teardown Crash
| File | Line | Defect | Solution |
|---|---|---|---|
| `tests/tier2-boundary/boundary-schema-constraints.test.ts` | 60 | `await pool.close();` throws `TypeError` if `pool` is undefined | Guard with `if (pool) { await pool.close(); }` |

---

## 3. Analysis of Assertion Patterns and Transformation Strategy

### Pattern A: `if (res.status === EXPECTED) { ... } else { expect([..., 503]).toContain(res.status); }`
- **Root Problem**: If the endpoint failed (returning 500, 503, or 401), the test branched into the `else` condition, where it asserted that the status belonged to a broad set of failure codes including 503. Because 503 was considered valid, the test passed without ever validating `res.data`.
- **Transformation Strategy**: Remove the `if-else` branch entirely. Directly assert `expect(res.status).toBe(EXPECTED)` followed immediately by assertions on `res.data`. If the server is offline or errors, the test fails loudly and authentically.

### Pattern B: `if (res.status !== 503) { expect(res.status).toBe(STATUS); ... }`
- **Root Problem**: If the response returned 503, the entire assertion block was bypassed. The test exited with 0 assertions executed and passed silently.
- **Transformation Strategy**: Remove the `if (res.status !== 503)` guard. The inner assertions now run unconditionally.

### Pattern C: Multi-step Dependent Requests Without Status Checks
- **Root Problem**: In tests that authenticate or create a parent entity first (e.g. `loginRes = await api.post(...)`), subsequent steps assumed valid response data without asserting the status of the setup step.
- **Transformation Strategy**: Prepend `expect(loginRes.status).toBe(200)` so that any failure in setup immediately fails the test at the exact source.

---

## 4. Verification and Impact

1. **Static Typing & Compilation**:
   - The unified diff maintains 100% TypeScript compatibility. No syntax errors or type discrepancies are introduced.
2. **Runner Independence**:
   - Database tests (`npm run test:db`) and API tests (`npm run test:api`) remain cleanly partitioned per `vitest.config.ts`.
   - Applying this patch ensures that `npm run test:api` will enforce strict HTTP 200/201/400/401/403/404 compliance against the live API server once REST APIs are implemented in Milestone 2.
   - Zero synthetic 503 codes remain in any test file.
