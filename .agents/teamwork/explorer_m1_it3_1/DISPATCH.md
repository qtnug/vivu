# Dispatch Assignment: Explorer M1 Iteration 3.1 (SQL Server Health Restoration & Connection Resilience)

- **Identity**: teamwork_preview_explorer (Explorer M1.it3.1)
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_1
- **Mandatory References**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY FIRST)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - FULL FORENSIC AUDIT EVIDENCE REPORT: `d:/DangQuangTung/Vivu/.agents/teamwork/auditor_m1_it2_1_rep/handoff.md` (READ IN FULL)
  - Reviewer report: `d:/DangQuangTung/Vivu/.agents/teamwork/reviewer_m1_it2_2_rep/handoff.md`
  - Challenger report: `d:/DangQuangTung/Vivu/.agents/teamwork/challenger_m1_it2_1_rep/handoff.md`

## Forensic Audit Evidence & Required Strategy
The Forensic Auditor reported INTEGRITY VIOLATION because `node scripts/verify-db.js` and `npm run test:db` failed with connection timeout (`Failed to connect to localhost:1433 in 15000ms`).
Diagnostics showed: SQL Server 2025 Express (`MSSQL$SQLEXPRESS`) suffered worker thread scheduler exhaustion following aggressive concurrency stress testing under low host RAM, causing prelogin TDS dispatcher hang across TCP, Shared Memory, and Named Pipes.

Your task:
1. Investigate the current status of the SQL Server service and instance on Windows.
2. Recommend the exact method to restore SQL Server health (e.g. restarting the service via available tools / command, clearing blocked connections, or restarting `MSSQL$SQLEXPRESS`).
3. Recommend connection configuration tuning in `lib/db.ts` and `scripts/verify-db.js`:
   - Connection pool size (e.g. max 10), connection timeout, request timeout, retry logic with exponential backoff on prelogin delays.
Write your analysis to `analysis.md` and handoff to `handoff.md`.


## 2026-10-02T17:13:58Z
You are Explorer M1 Iteration 3.1 (teamwork_preview_explorer).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_1
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_1/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md
Read the FULL FORENSIC AUDIT EVIDENCE: d:/DangQuangTung/Vivu/.agents/teamwork/auditor_m1_it2_1_rep/handoff.md

Focus:
Investigate SQL Server 2025 Express connection health on host.
Formulate concrete strategy to restore/restart the service and tune connection parameters in lib/db.ts and scripts/verify-db.js (connection retry, backoff, pool size, timeouts).
Write analysis to analysis.md and handoff to handoff.md, then notify parent.
