# Dispatch Assignment: Challenger M1.it2.2 Replacement (Domain Types Rigor & Test Authenticity Challenge)

- **Identity**: teamwork_preview_challenger (Challenger M1.it2.2 Replacement)
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/challenger_m1_it2_2_rep
- **Mandatory References**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY FIRST)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - Worker M1.it2 handoff: `d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_it2/handoff.md`

## Adversarial Verification Instructions
1. Challenge `types/db.ts`:
   - Verify every column in SQL Server schema (`scripts/schema.sql`) has an exact type representation in `types/db.ts`.
   - Write TypeScript type-level stress assertions to check for missing properties, incorrect nullability, or casing divergences.
2. Challenge `tests/helpers/test-client.ts`:
   - Empirically verify that calling `testClient` when the web server is offline rejects with an authentic network error instead of returning 503.
3. Deliver explicit empirical verdict: `APPROVE` or `REJECT` in `handoff.md` and notify parent.


## 2026-10-02T16:53:03Z
You are Challenger M1.it2.2 Replacement (teamwork_preview_challenger).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/challenger_m1_it2_2_rep
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/challenger_m1_it2_2_rep/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md
Read Worker M1.it2 handoff: d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_it2/handoff.md

Empirically challenge types/db.ts completeness against schema.sql and test-client.ts authentic failure when server is offline.
Provide your explicit empirical verdict: APPROVE or REJECT in handoff.md and notify parent.
