# BRIEFING — 2026-10-02T12:48:00Z

## Mission
Investigate and design `lib/db.ts` (mssql connection pool and helpers), authoritative seed data script (`scripts/seed.js` or `scripts/seed-db.ts`), and database verification script (`scripts/verify-db.js`).

## 🔒 My Identity
- Archetype: teamwork_preview_explorer
- Roles: explorer, investigator, designer
- Working directory: d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3
- Original parent: 891098e1-52e3-4582-a42d-340f57c72e75
- Milestone: M1 (Milestone 1 - DB Client, Authoritative Seed Data, Verification Script)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly into project source code (deliver complete design blueprints, scripts, and verification logic in analysis.md & handoff.md)
- Target database: SQL Server (mssql / tedious) on localhost:1433, db: bus_ticketing_system, user: vivu_admin
- Authoritative requirements from ORIGINAL_REQUEST.md, PROJECT.md, and thiet-ke-he-thong-xe-buyt.md must be strictly adhered to
- Output must be self-contained in analysis.md and handoff.md

## Current Parent
- Conversation ID: 891098e1-52e3-4582-a42d-340f57c72e75
- Updated: 2026-10-02T12:48:00Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`, `thiet-ke-he-thong-xe-buyt.md` (lines 218-450)
  - `spec_miner_survey_1/analysis.md`, `explorer_m1_1/DISPATCH.md`, `explorer_m1_2/DISPATCH.md`, `explorer_m1_2/test_schema.sql`
  - SQL Server 2025 Express on `localhost:1433` (tested live via `sqlcmd`)
- **Key findings**:
  1. SQL Server is active on localhost:1433, user `vivu_admin`, database `bus_ticketing_system` exists.
  2. DDL 11 tables tested and verified in test schema (`vivu_test_schema`). Cascade rules verified: only `route_stops.route_id` and `tickets.order_id` have `CASCADE`.
  3. **Critical Bug Caught in Spec Miner Report**: `spec_miner_survey_1` used `'t1111111-...'` for ticket type IDs. 't' is non-hex, causing SQL Server error `Msg 8169: Conversion failed when converting from a character string to uniqueidentifier`. Fixed with valid hex UUIDs `'c1111111-...'`.
  4. Bcrypt password hashes for `Admin@123456` and `Inspector@123456` computed and empirically verified with `bcryptjs`.
  5. Full `lib/db.ts` client designed with global singleton caching for Next.js App Router HMR to prevent pool leaks, promise deduplication, and transactions.
  6. Idempotent seed script (`scripts/seed.js` and `scripts/seed.sql`) and verification scripts (`scripts/verify-db.js` and `scripts/verify-db.sql`) designed and tested.
- **Unexplored areas**: None within M1.3 scope.

## Key Decisions Made
- `lib/db.ts` uses cached singleton pattern on `globalThis.__mssqlPool` and `globalThis.__mssqlPoolPromise` to guarantee zero pool leaks during Next.js App Router hot reloads.
- Parameter binding handles null, boolean (BIT), integer (INT), decimal (DECIMAL), Date (DATETIME2) explicitly to avoid tedious driver precision issues.
- Ticket type fixed UUIDs use valid hex characters `c1111111-...` through `c5555555-...`.
- Dual delivery for scripts: Node.js scripts (`scripts/seed.js`, `scripts/verify-db.js`) and T-SQL scripts (`scripts/seed.sql`, `scripts/verify-db.sql`) for both Node.js runners and direct `sqlcmd` execution.

## Artifact Index
- `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/DISPATCH.md` — Assignment
- `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/BRIEFING.md` — Working memory
- `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/progress.md` — Liveness heartbeat
- `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/proposed_db.ts` — Production-grade `lib/db.ts`
- `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/proposed_seed.js` — Standalone idempotent `scripts/seed.js`
- `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/proposed_seed.sql` — Pure T-SQL `scripts/seed.sql`
- `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/proposed_verify-db.js` — Automated `scripts/verify-db.js`
- `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/proposed_verify-db.sql` — T-SQL `scripts/verify-db.sql`
- `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/analysis.md` — Comprehensive analysis report
- `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/handoff.md` — Self-contained 5-component handoff report
