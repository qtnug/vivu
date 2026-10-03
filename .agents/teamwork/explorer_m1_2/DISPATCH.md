# Dispatch Assignment: Explorer M1.2 (SQL Server DDL Schema, Constraints & Migration Scripts)

- **Identity**: teamwork_preview_explorer
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2
- **Authoritative Docs**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY FIRST)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` (Lines 218-450)
  - Survey reports: `d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/analysis.md`

## Scope & Objective
Investigate and produce the exact database schema implementation blueprint for Milestone 1:
1. Verify the exact T-SQL DDL script for all 11 tables (`users`, `bus_routes`, `bus_stops`, `route_stops`, `buses`, `schedules`, `ticket_types`, `orders`, `tickets`, `payment_transactions`, `complaints`).
2. Strictly check the SQL Server multiple cascade path rules: only `route_stops.route_id` and `tickets.order_id` use `ON DELETE CASCADE`. All others must be `NO ACTION` (default).
3. Indexes: `idx_route_stops_route`, `idx_route_stops_stop`, `idx_orders_user`, `idx_orders_status`, `idx_tickets_code`, `idx_tickets_user`, `idx_tickets_status`, `idx_transactions_order`, `idx_complaints_status`.
4. Migration/Init runner script: design an automated Node.js script (e.g. `scripts/init-db.ts` or `scripts/migrate.js`) that connects to `localhost:1433`, runs DDL idempotently (e.g. `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '...')`), creates all tables and indexes.

## Output
Write detailed analysis to `analysis.md` and handoff to `handoff.md` in `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2/`.


## 2026-10-02T12:37:51Z
You are Explorer M1.2 (teamwork_preview_explorer).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md
Read d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md (Lines 218-450)

Focus:
Investigate and design the exact SQL Server DDL schema implementation:
- 11 tables DDL matching thiet-ke-he-thong-xe-buyt.md
- Strict adherence to SQL Server cascade rules: only route_stops.route_id and tickets.order_id use ON DELETE CASCADE. All others NO ACTION.
- Indexes creation script
- Design an automated Node.js migration/init script (e.g. scripts/init-db.js) that can be run reliably by Worker to create the schema on localhost:1433 bus_ticketing_system.
Write analysis to analysis.md and handoff to handoff.md in your working directory and notify parent.
