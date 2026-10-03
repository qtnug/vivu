# E2E & API Test Infrastructure Specification (TEST_INFRA)

## 1. Overview & Strategy

The **Vivu Bus Management & Electronic Ticketing System** test infrastructure operates under a **Dual-Track, Requirement-Driven, Opaque-Box** methodology.
Tests are designed strictly against the authoritative specifications:
- `thiet-ke-he-thong-xe-buyt.md` (Authoritative System Design & Specification)
- `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md` (Feature Inventory & Architectural Contracts)
- `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (System Requirements & Acceptance Criteria)

All tests are decoupled from internal implementation details and verify observable HTTP responses, database state transitions, and business contracts.

---

## 2. Test Runner & Environment

- **Runner**: [Vitest](https://vitest.dev/) (v2+ / v3+) configured with native TypeScript support, ESM, and high-performance execution.
- **Runtime**: Node.js `v22.11.0` (LTS) on Windows 10/11.
- **Protocol**: HTTP/1.1 REST API testing via standard Fetch API (`node-fetch` / native `globalThis.fetch`), targeting Next.js Route Handlers.
- **Port Target**: Configurable via `TEST_BASE_URL` (default: `http://localhost:3000` or `http://localhost:3001` when Next dev server runs on port 3001).
- **In-Memory / Direct Test Client Fallback**: A modular test client (`tests/helpers/test-client.ts`) that seamlessly switches between live HTTP server requests and direct route handler dispatch or mock emulation when the HTTP server is starting up or during offline test isolation.

---

## 3. Directory Layout & Structure

The test suite resides in `d:/DangQuangTung/Vivu/tests/` and is strictly structured into 4 tiers:

```
d:/DangQuangTung/Vivu/
├── tests/
│   ├── helpers/
│   │   ├── test-client.ts          # Unified HTTP/API client with error formatting
│   │   ├── auth-helper.ts          # Token generation, login simulation, role headers
│   │   ├── fixtures.ts             # Authoritative test fixtures (Route 01, stops, ticket types)
│   │   ├── db-helper.ts            # SQL Server database connection and query assertions
│   │   └── sepay-simulator.ts      # SePay webhook payload builder and signature generator
│   ├── tier1-features/
│   │   ├── auth.test.ts            # F05, F06: Register, Login, Refresh, Password hash (>=5 tests)
│   │   ├── routes-stops.test.ts    # F07, F08, F09: Routes list, details, stops, timetable, search (>=5 tests)
│   │   ├── ticket-types.test.ts    # F10: Ticket types list, pricing, student discount (>=5 tests)
│   │   ├── orders.test.ts          # F11, F12: Order creation, VietQR payload, countdown (>=5 tests)
│   │   ├── sepay-webhook.test.ts   # F14, F15, F16: Webhook handling, transferAmount match, ticket generation (>=5 tests)
│   │   ├── ticket-verify.test.ts   # F17, F18: My tickets, inspector QR JWT verify, HTTP 200 contract (>=5 tests)
│   │   ├── complaints.test.ts      # F19: Submit feedback, categories, route reference (>=5 tests)
│   │   └── admin-crud.test.ts      # F35: Admin routes, stops, buses, schedules, ticket types, staff (>=5 tests)
│   ├── tier2-boundary/
│   │   ├── boundary-orders.test.ts # Zero/negative quantity, missing guest phone, invalid ticket type (>=5 tests)
│   │   ├── boundary-expiry.test.ts # 15-minute lazy expiry, post-expiry payment rejection, order regeneration (>=5 tests)
│   │   ├── boundary-webhook.test.ts# Amount mismatch, invalid API key, malformed content regex, replay attack (>=5 tests)
│   │   ├── boundary-qr-verify.test.ts# Tampered JWT signature, expired ticket, already USED ticket, non-existent code (>=5 tests)
│   │   └── boundary-security.test.ts # Unauthorized access, role privilege escalation, inactive user login (>=5 tests)
│   ├── tier3-interactions/
│   │   ├── booking-payment-scan-lifecycle.test.ts # Complete lifecycle: Order -> VietQR -> SePay -> Ticket -> Scan -> USED (Pairwise interaction)
│   │   ├── monthly-pass-lifecycle.test.ts         # 30-day pass multi-scan lifecycle & validity window
│   │   └── route-stop-reorder-impact.test.ts      # Stop reordering and its impact on distance & fare calculation
│   └── tier4-scenarios/
│       ├── scenario-guest-single-ride.test.ts     # Real-world: Guest commuter buying single ride on Route 01
│       ├── scenario-student-monthly.test.ts       # Real-world: Student commuter purchasing discounted monthly pass
│       └── scenario-admin-operations.test.ts      # Real-world: Operations manager adding new route, assigning bus, checking revenue dashboard
├── vitest.config.ts                # Vitest runner configuration
├── TEST_INFRA.md                   # This infrastructure document
└── TEST_READY.md                   # Readiness statement & execution guide
```

---

## 4. Test Tier Definition & Quality Criteria

### Tier 1: Feature Coverage (>=5 test cases per feature)
- Validates the primary happy path and core contracts of every feature in the Feature Inventory.
- Authoritative expected values:
  - Auth: Return shape `{ user: { id, email, fullName, role }, accessToken, refreshToken }`. Password hash never returned.
  - Routes: Route 01 (Bến xe Long Biên - Bến xe Hà Đông), direction `FORWARD`, 5 stops in order `[1, 2, 3, 4, 5]`.
  - Ticket Types: Standard Single Ride 7,000 VND, Student Single Ride 3,000 VND, Daily Pass 30,000 VND, Monthly Standard 200,000 VND, Monthly Student 100,000 VND.
  - Orders: Code format `DH...`, status `PENDING`, expiration exactly `now + 15 mins`.
  - Webhook: Response 200 `{ message: "OK" }`, idempotent on already `PAID` order.
  - Ticket Verification: Always HTTP 200 `{ valid: boolean, ... }`.

### Tier 2: Boundary & Corner Cases (>=5 test cases per feature)
- Tests system resilience against edge cases, extreme values, format mutations, and security boundaries.
- Boundary conditions:
  - Zero, negative, float quantity (`quantity = 0`, `quantity = -1`, `quantity = "abc"`).
  - Past activation date (`activationDate < today`).
  - Webhook amount mismatch (`transferAmount = 6999` for 7000 order).
  - Expired order payment (15 minutes + 1 second elapsed).
  - Malformed QR JWT (invalid signature, wrong secret, expired timestamp).
  - Re-scanning a `USED` ticket: MUST return HTTP 200 `{ valid: false, reason: "Vé đã được sử dụng" }`.
  - Privilege boundaries: Passenger trying to access `/api/admin/*` must get HTTP 403 `FORBIDDEN`.

### Tier 3: Cross-Feature Interactions & Pairwise Combinations
- Tests state transitions across multiple sub-systems:
  1. `POST /api/orders` (Pending order generated)
  2. `POST /api/webhooks/sepay` (Valid payment received with matching order code)
  3. `GET /api/orders/:id` (Order updated to `PAID`, tickets generated)
  4. `POST /api/tickets/verify` (Inspector scans valid QR -> Returns valid, marks `USED`)
  5. `POST /api/tickets/verify` (Immediate second scan -> Rejected as already `USED`)
  6. `GET /api/admin/orders` & `/api/admin/dashboard` (Transaction reflected in revenue and ticket metrics)

### Tier 4: Real-World Scenarios
- End-to-end simulations of actual user personas:
  - **Persona 1 (Guest Commuter "Anh Tuấn")**: Unauthenticated, buys single ride via mobile web, inputs phone `0912345678`, pays via simulated VietQR, boards bus, ticket scanned by Inspector.
  - **Persona 2 (Student "Lan")**: Registers passenger account, purchases discounted monthly pass (100,000 VND), receives 30-day ticket with QR JWT, scans across multiple consecutive days.
  - **Persona 3 (Operations Admin "Trưởng ban Vận hành")**: Logs into admin portal, creates new bus route, sets up bus schedule, resolves a passenger complaint, and verifies real-time revenue analytics.

---

## 5. Test Harness & Authoritative Assertions

### Standard Error Response Shape (Contract § 6.7)
Every non-2xx API failure must conform to:
```json
{
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | ORDER_EXPIRED | AMOUNT_MISMATCH",
    "message": "Human-readable explanation in Vietnamese or English"
  }
}
```

### Inspector Verification Contract (Contract § 6.4)
Inspector verification (`POST /api/tickets/verify`) **never returns HTTP 4xx or 5xx** for business validity checks:
- Success: HTTP 200 `{ "valid": true, "ticket": { ... } }`
- Failure: HTTP 200 `{ "valid": false, "reason": "Vé đã được sử dụng" | "Vé đã hết hạn" | "Mã QR không hợp lệ" }`

---

## 6. How to Run the Test Suite

```bash
# 1. Run all tests
npm test

# 2. Run Tier 1 Feature tests
npx vitest run tests/tier1-features

# 3. Run Tier 2 Boundary tests
npx vitest run tests/tier2-boundary

# 4. Run Tier 3 Cross-feature interaction tests
npx vitest run tests/tier3-interactions

# 5. Run Tier 4 Real-world scenarios
npx vitest run tests/tier4-scenarios

# 6. Run with coverage report
npx vitest run --coverage
```

---

## 7. Escalation Protocol

As a test writer under the QA role:
1. Test writers do **NOT** modify implementation code under `app/`, `lib/`, `components/`.
2. When an implementation bug is observed (test fails because implementation violates `thiet-ke-he-thong-xe-buyt.md` or `PROJECT.md`), the test writer files an issue report documenting:
   - Endpoint / Component affected
   - Input payload and HTTP headers
   - Expected output (with section reference in specification)
   - Actual output observed
3. The implementing worker fixes the defect; the test writer re-runs the suite to verify the fix.
