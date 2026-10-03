# Dispatch Assignment: Explorer M1.3 (Authoritative Seed Data & DB Client Connection Pool)

- **Identity**: teamwork_preview_explorer
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3
- **Authoritative Docs**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY FIRST)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` (Lines 406-448)
  - Survey reports: `d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/analysis.md`

## Scope & Objective
Investigate and produce the exact database connection pool and seeding blueprint for Milestone 1:
1. Database Client (`lib/db.ts`):
   - Design connection pool using `mssql` (`tedious`).
   - Connection string/config: user `vivu_admin`, password `VivuAdmin@2026!`, server `localhost`, port `1433`, database `bus_ticketing_system`, options `trustServerCertificate: true`, pool max 10.
   - Helper functions: `query<T>(sql, params)`, `execute(sql, params)`, `getPool()`.
2. Authoritative Seed Data script (e.g. `scripts/seed-db.ts` or `scripts/seed.js`):
   - Admin account: `admin@busticket.vn` / bcrypt hash for `Admin@123456`, role `ADMIN`.
   - Inspector account: `inspector1@busticket.vn` / bcrypt hash for `Inspector@123456`, role `INSPECTOR`.
   - Bus Route: Route 01 (Long Biên - Bến xe Hà Đông), distance 18.5 km, duration 55 min, frequency 10 min, fare 7,000 VND.
   - 5 Bus Stops: `Bến xe Long Biên` (21.0425, 105.8502), `Hồ Hoàn Kiếm` (21.0285, 105.8542), `Ga Hà Nội` (21.0245, 105.8412), `Ngã Tư Sở` (21.0025, 105.8182), `Bến xe Hà Đông` (20.9725, 105.7782).
   - Route Stops: linked in sequence 1 to 5.
   - 2 Buses: `29B-123.45` (capacity 60), `29B-678.90` (capacity 60) assigned to Route 01.
   - Schedules: 06:00:00 departure.
   - 5 Ticket Types:
     - `SINGLE_RIDE` (standard: 7,000 VND, student: 3,000 VND)
     - `DAILY_PASS` (standard: 30,000 VND)
     - `MONTHLY_PASS` (standard: 200,000 VND, student: 100,000 VND)
3. Design a verification check script (e.g. `scripts/verify-db.ts`) that asserts all 11 tables and all seed rows exist.

## Output
Write detailed analysis to `analysis.md` and handoff to `handoff.md` in `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/`.


## 2026-10-02T12:37:51Z
You are Explorer M1.3 (teamwork_preview_explorer).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md
Read d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md (Lines 406-448)

Focus:
Investigate and design:
1. lib/db.ts: Connection pool using mssql, connection pooling parameters, error handling, query/execute helpers.
2. Authoritative Seed Data script (scripts/seed.js): Admin, Inspector, Route 01, 5 stops in order, 2 buses, schedules 06:00, 5 ticket types.
3. Database verification script (scripts/verify-db.js): Verifies all 11 tables and all seed rows.
Write analysis to analysis.md and handoff to handoff.md in your working directory and notify parent.
