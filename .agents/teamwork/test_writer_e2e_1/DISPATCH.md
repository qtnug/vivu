# Dispatch Assignment: E2E Test Writer 1 (Dual Track: Requirement-Driven Opaque-Box Test Suite)

- **Identity**: teamwork_preview_test_writer
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/test_writer_e2e_1
- **Authoritative Docs**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY FIRST)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md` (Full Feature Inventory & Architecture)
  - `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` (Authoritative specifications)

## Scope & Objective
You lead the E2E Testing Track. You must design and construct a comprehensive, requirement-driven, opaque-box test suite for the Vivu platform.
Do NOT modify implementation source code. Your outputs are test infrastructure, test cases in `tests/`, `TEST_INFRA.md`, and `TEST_READY.md`.

### Methodology & Structure
Cover all 4 tiers based on the Feature Inventory in `PROJECT.md`:
1. **Tier 1 - Feature Coverage (>=5 per feature)**:
   - Happy-path and representative tests for every feature: Routes, Stops, Timetable, Orders (guest & auth), VietQR details, SePay Webhook, Ticket Verification, Complaints, Admin CRUD.
2. **Tier 2 - Boundary & Corner Cases (>=5 per feature)**:
   - Limit cases, zero/negative quantities, student discount verification, expired orders (15-min lazy expiry), duplicate webhook transactions, invalid QR tokens, expired tickets, used tickets, non-existent tickets.
3. **Tier 3 - Cross-Feature Combinations (pairwise)**:
   - Complete lifecycle: Order booking -> VietQR payment simulation -> SePay webhook -> Ticket generation with QR JWT -> Inspector QR verification -> Mark USED -> Re-scan rejection.
4. **Tier 4 - Real-World Application Scenarios**:
   - Realistic multi-role workflows: Passenger guest buying single ride -> SePay payment -> boarding scan; Monthly pass purchase; Inspector scanning in offline/online scenarios; Admin updating routes and checking analytics.

### Deliverables
1. `TEST_INFRA.md` at workspace root `d:/DangQuangTung/Vivu/TEST_INFRA.md`.
2. Executable test suites in `tests/` (e.g. `tests/api/auth.test.ts`, `tests/api/routes.test.ts`, `tests/api/orders.test.ts`, `tests/api/webhook.test.ts`, `tests/api/tickets.test.ts`, `tests/api/admin.test.ts`, `tests/e2e/transit-lifecycle.test.ts`) configured with Vitest / Jest runner.
3. When test suite is ready, publish `d:/DangQuangTung/Vivu/TEST_READY.md` containing runner command and tier-by-tier coverage breakdown.
4. Write handoff report in `handoff.md`.

## 2026-10-02T12:37:51Z
You are E2E Test Writer 1 (teamwork_preview_test_writer).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/test_writer_e2e_1
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/test_writer_e2e_1/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md (Feature Inventory & Architecture)
Read d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md (Authoritative full spec)

Focus:
1. Build E2E Test Infrastructure: Create d:/DangQuangTung/Vivu/TEST_INFRA.md following the standard template.
2. Implement automated test suites under d:/DangQuangTung/Vivu/tests/ covering all 4 Tiers:
   - Tier 1: Feature Coverage (>=5 per feature across Auth, Routes, Stops, Orders, VietQR, SePay Webhook, Ticket Verification, Complaints, Admin CRUD)
   - Tier 2: Boundary & Corner Cases (>=5 per feature: zero amount, 15-min lazy expiry, invalid QR, used ticket re-scan, unauthorized role)
   - Tier 3: Cross-Feature Interactions (Complete booking -> payment -> ticket QR -> inspector scan lifecycle)
   - Tier 4: Real-World Scenarios (Passenger guest purchase, Monthly pass, Multi-role administration)
3. Set up Vitest test runner configuration and npm test command.
4. When ready, publish d:/DangQuangTung/Vivu/TEST_READY.md with runner instructions and coverage metrics.
5. Write your handoff report to handoff.md in your working directory and notify parent.
