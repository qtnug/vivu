# Dispatch Assignment: Worker M1.it3 (Comprehensive Audit Remediation & Live DB Stabilization)

- **Identity**: teamwork_preview_worker (Worker M1.it3)
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_it3
- **Mandatory References**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY FIRST)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - FULL FORENSIC AUDIT EVIDENCE: `d:/DangQuangTung/Vivu/.agents/teamwork/auditor_m1_it2_1_rep/handoff.md`
  - Blueprint 1 (SQL Server Health & Timeouts): `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_1/analysis.md`
  - Blueprint 2 (Harness Stability & Pool Pacing): `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_2/analysis.md`
  - Blueprint 3 (503 Patch): `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_3/analysis.md` & `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_3/eradicate_503.patch`

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Tasks
1. **Restore SQL Server Connection & Disable AUTO_CLOSE**:
   - Try restarting `MSSQL$SQLEXPRESS` service: `powershell -Command "Restart-Service -Name 'MSSQL\`$SQLEXPRESS' -Force"` or `net stop MSSQL$SQLEXPRESS && net start MSSQL$SQLEXPRESS`.
   - If privilege allows, verify connection on port 1433.
   - If service cannot be restarted directly via CLI, run a node/powershell script with `connectionTimeout: 120000` (120s) to allow the 98-second crash recovery to complete cleanly and execute:
     `ALTER DATABASE [bus_ticketing_system] SET AUTO_CLOSE OFF WITH NO_WAIT; ALTER DATABASE [bus_ticketing_system] SET RECOVERY SIMPLE;`
2. **Tune `lib/db.ts` & `scripts/verify-db.js`**:
   - In `lib/db.ts`: set `connectionTimeout: 30000`, `requestTimeout: 30000`, pool timeouts 30000ms. Add retry with exponential backoff on connection creation. Catch exceptions in `closePool()`.
   - In `scripts/verify-db.js`: set `connectionTimeout: 30000` and add 4-attempt exponential backoff retry loop.
3. **Stabilize Test Harness**:
   - In `tests/tier2-boundary/boundary-schema-constraints.test.ts`: guard `afterAll` with `if (pool) { try { if (pool.connected) await pool.close(); } catch {} }`. Add 35s timeout and retry in `beforeAll`.
   - In `tests/adversarial/db-stress.test.ts`: batch concurrency into 25-query batches with yields, add 500ms connection drain delay before `closePool()`.
   - In `vitest.config.ts`: enforce `fileParallelism: false` for the `db` project.
4. **Eradicate 503 Assertions**:
   - Apply `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_3/eradicate_503.patch` across all 10 API test files so all 54 masked assertions are replaced with strict authentic HTTP assertions.
5. **Run Verification**:
   - Run `node scripts/verify-db.js` (must pass 43/43).
   - Run `npm run test:db` (must pass 100% on live SQL Server).
   - Run `npm run typecheck` and `npm run lint` (0 errors).
   - Run `npm run build` (exit code 0).
6. **Handoff**:
   - Document execution evidence and write report to `handoff.md`, then notify parent.

## 2026-10-02T17:23:42Z
You are Worker M1.it3 (teamwork_preview_worker).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_it3
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_it3/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md
Read the FULL FORENSIC AUDIT EVIDENCE: d:/DangQuangTung/Vivu/.agents/teamwork/auditor_m1_it2_1_rep/handoff.md
Read blueprints:
- d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_1/analysis.md
- d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_2/analysis.md
- d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_3/analysis.md
- d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_3/eradicate_503.patch

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Tasks:
1. Restore SQL Server connection health: try restarting MSSQL$SQLEXPRESS service (or connect with 120s timeout to allow crash recovery to finish) and execute ALTER DATABASE [bus_ticketing_system] SET AUTO_CLOSE OFF WITH NO_WAIT; SET RECOVERY SIMPLE;.
2. Update lib/db.ts: connectionTimeout 30000ms, requestTimeout 30000ms, exponential backoff retry in getDbPool(), closePool() exception guard.
3. Update scripts/verify-db.js: connectionTimeout 30000ms, 4-attempt exponential backoff retry.
4. Stabilize test harness: guard pool.close() in boundary-schema-constraints.test.ts:60, batch concurrency in db-stress.test.ts, enforce fileParallelism: false in vitest.config.ts for db project.
5. Apply eradicate_503.patch across all 10 API test files to completely eliminate all 54 occurrences of 503 test masking.
6. Run node scripts/verify-db.js (43/43 pass).
7. Run npm run test:db (100% pass on live SQL Server).
8. Run npm run typecheck, npm run lint, npm run build (0 errors).
9. Write handoff.md and notify parent.

