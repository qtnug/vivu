# Dispatch Assignment: Forensic Auditor M1 (Integrity Verification)

- **Identity**: teamwork_preview_auditor (Forensic Auditor M1)
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/auditor_m1_1
- **Mandatory References**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY FIRST)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md`
  - Worker M1 handoff: `d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_1/handoff.md`

## Forensic Audit Instructions
Perform comprehensive forensic integrity verification on all code produced in Milestone 1:
1. Static analysis of `lib/db.ts`, `scripts/init-db.js`, `scripts/seed.js`, `scripts/verify-db.js`, `package.json`:
   - Check for hardcoded test assertions, fake database connections, or mock bypasses.
   - Verify that `lib/db.ts` genuinely connects to SQL Server via `mssql` (`tedious`).
   - Verify that `scripts/init-db.js` genuinely issues T-SQL DDL commands against SQL Server.
   - Verify that `scripts/seed.js` genuinely hashes passwords with `bcryptjs` and inserts records.
2. Runtime verification:
   - Query SQL Server catalog views directly (`sys.tables`, `sys.foreign_keys`, `sys.indexes`) to ensure tables and constraints physically exist in the database file on disk, not just simulated.
   - Query user records and verify password hash formats.
3. Binary Verdict:
   - If ANY cheating, mock facade, dummy bypass, or integrity violation is found -> `INTEGRITY VIOLATION`.
   - If all implementations are genuine, authentic, and verified -> `CLEAN`.
Write complete evidence report and verdict in `handoff.md`.

## 2026-10-02T13:06:52Z
You are Forensic Auditor M1 (teamwork_preview_auditor).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/auditor_m1_1
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/auditor_m1_1/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md
Read d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md
Read Worker M1 handoff: d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_1/handoff.md

Perform forensic integrity audit: static code inspection for mocks/stubs/fake data, runtime verification of actual SQL Server catalog objects, tables, indexes, constraints, and password hashes.
Provide your explicit binary audit verdict: CLEAN or INTEGRITY VIOLATION in handoff.md and notify parent.
