# Dispatch Assignment: Worker M1.it2 (Remediation & Milestone 1 Verification)

- **Identity**: teamwork_preview_worker (Worker M1.it2)
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_it2
- **Mandatory References**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY FIRST)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - Gate issues: `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/GATE_STATUS.md`
  - Blueprint 1: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it2_1/analysis.md`
  - Blueprint 2: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it2_2/analysis.md`
  - Blueprint 3: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it2_3/analysis.md`

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## File Ownership
- `types/db.ts`
- `lib/db.ts`
- `tests/helpers/test-client.ts`
- `tests/helpers/fixtures.ts`
- `vitest.config.ts`, `package.json`

## Implementation Steps
1. **Create `types/db.ts`**:
   - Implement complete TypeScript interfaces and types for all 11 database models matching the blueprint in `explorer_m1_it2_1/analysis.md`.
2. **Fix `lib/db.ts` Parameter Binding**:
   - In `bindParameters`, replace `String(value)` for plain objects/arrays with `JSON.stringify(value)` as detailed in `explorer_m1_it2_1/analysis.md`.
3. **Fix Test Integrity in `tests/helpers/test-client.ts`**:
   - Remove the catch block that returns `{ status: 503 }` (lines 71, 87-100) so tests make genuine HTTP calls without masking offline servers, as detailed in `explorer_m1_it2_2/analysis.md`.
4. **Fix Password Sync in `tests/helpers/fixtures.ts`**:
   - Synchronize test credentials to `Admin@123456` and `Inspector@123456`.
5. **Configure Runner Partitioning**:
   - Update `package.json` and `vitest.config.ts` per `explorer_m1_it2_3/analysis.md` to add `"test:db": "vitest run tests/adversarial tests/tier2-boundary/boundary-schema-constraints.test.ts"`.
6. **Execute Verification**:
   - Run `node scripts/verify-db.js` (must pass 43/43).
   - Run `npm run test:db` (must pass all database integration & stress tests on live SQL Server).
   - Run `npm run typecheck` and `npm run lint` (0 errors).
   - Run `npm run build` (exit code 0).
7. **Write Handoff**:
   - Document all command outputs and changes in `handoff.md` and notify parent.


## 2026-10-02T13:32:40Z
[Message] timestamp=2026-10-02T13:32:40Z sender=891098e1-52e3-4582-a42d-340f57c72e75 priority=MESSAGE_PRIORITY_HIGH content=You are Worker M1.it2 (teamwork_preview_worker).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_it2
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_it2/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/GATE_STATUS.md
Read blueprints:
- d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it2_1/analysis.md
- d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it2_2/analysis.md
- d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it2_3/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Tasks:
1. Create types/db.ts for all 11 database models.
2. Fix lib/db.ts bindParameters for plain objects (JSON.stringify).
3. Fix tests/helpers/test-client.ts (remove 503 catch fallback masking).
4. Fix tests/helpers/fixtures.ts (sync Admin@123456 & Inspector@123456).
5. Update package.json and vitest.config.ts for runner partitioning ("test:db").
6. Run node scripts/verify-db.js (43/43 pass).
7. Run npm run test:db (all database & boundary tests pass against live SQL Server).
8. Run npm run typecheck & npm run lint (0 errors).
9. Run npm run build (clean compile).
10. Write handoff.md and notify parent.
