# Dispatch Assignment: Explorer M1 Iteration 3.2 (Test Harness Stability & Pool Pacing Strategy)

- **Identity**: teamwork_preview_explorer (Explorer M1.it3.2)
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_2
- **Mandatory References**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY FIRST)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - FULL FORENSIC AUDIT EVIDENCE REPORT: `d:/DangQuangTung/Vivu/.agents/teamwork/auditor_m1_it2_1_rep/handoff.md` (READ IN FULL)
  - Reviewer report: `d:/DangQuangTung/Vivu/.agents/teamwork/reviewer_m1_it2_2_rep/handoff.md`
  - Challenger report: `d:/DangQuangTung/Vivu/.agents/teamwork/challenger_m1_it2_1_rep/handoff.md`

## Forensic Audit Evidence & Required Strategy
Audit findings identified two harness stability defects:
1. `tests/tier2-boundary/boundary-schema-constraints.test.ts:60` unhandled `TypeError: Cannot read properties of undefined (reading 'close')` in `afterAll` when connection fails before `pool` is initialized.
2. `tests/adversarial/db-stress.test.ts` spawned 100 unpaced parallel queries and 50 unpaced delayed queries, exhausting the SQL Server Express thread scheduler and causing `CLOSE_WAIT` connection pileups.

Your task:
1. Design concrete patch for `boundary-schema-constraints.test.ts` guarding pool closure (`if (pool) { try { await pool.close(); } catch {} }`).
2. Design paced, sustainable concurrency testing in `db-stress.test.ts` (e.g. batching concurrency within SQL Server Express's thread capacity: 20-30 concurrent queries instead of 100, ensuring connection release after each batch, explicit connection closing).
3. Ensure all test hooks (`beforeAll`, `afterAll`, `beforeEach`) handle database connection retries or timeouts gracefully without unhandled crashes.

Write your analysis to `analysis.md` and handoff to `handoff.md`.

## 2026-10-02T17:13:58Z
You are Explorer M1 Iteration 3.2 (teamwork_preview_explorer).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_2
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it3_2/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md
Read the FULL FORENSIC AUDIT EVIDENCE: d:/DangQuangTung/Vivu/.agents/teamwork/auditor_m1_it2_1_rep/handoff.md

Focus:
Formulate fix strategy for test harness stability:
1. Guard pool closure in tests/tier2-boundary/boundary-schema-constraints.test.ts:60 (if pool await pool.close()).
2. Pace and batch concurrency in tests/adversarial/db-stress.test.ts to operate sustainably within SQL Server Express worker thread limits without causing CLOSE_WAIT pileup.
Write analysis to analysis.md and handoff to handoff.md, then notify parent.
