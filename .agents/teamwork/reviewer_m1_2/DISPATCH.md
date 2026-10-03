# Dispatch Assignment: Reviewer M1.2 (Relational Integrity & Build Conformance)

- **Identity**: teamwork_preview_reviewer (Reviewer M1.2)
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/reviewer_m1_2
- **Mandatory References**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY FIRST)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md`
  - Worker M1 handoff: `d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_1/handoff.md`

## Verification Instructions
1. Inspect SQL Server schema: verify all 11 tables exist in `bus_ticketing_system` on `localhost:1433`.
2. Verify cascade rules: confirm only `route_stops.route_id` and `tickets.order_id` are `ON DELETE CASCADE`. All others must be `NO ACTION`.
3. Check seed records: verify bcrypt hashes for `admin@busticket.vn` and `inspector1@busticket.vn` match required passwords (`Admin@123456`, `Inspector@123456`).
4. Execute verification commands:
   - `node scripts/verify-db.js`
   - `npm run build`
   - `npx vitest run` (since TEST_READY.md exists)
5. Provide explicit gate verdict: `APPROVE` or `REQUEST_CHANGES` in `handoff.md`.


## 2026-10-02T13:06:52Z
You are Reviewer M1.2 (teamwork_preview_reviewer).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/reviewer_m1_2
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/reviewer_m1_2/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md
Read d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md
Read Worker M1 handoff: d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_1/handoff.md

Verify SQL Server schema, table structures, foreign key cascade rules, seed records and bcrypt hashes, and run build & test commands.
Provide your explicit gate verdict: APPROVE or REQUEST_CHANGES in handoff.md and notify parent.
