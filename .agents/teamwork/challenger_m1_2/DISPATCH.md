# Dispatch Assignment: Challenger M1.2 (Schema Constraints & Boundary Violation Testing)

- **Identity**: teamwork_preview_challenger (Challenger M1.2)
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/challenger_m1_2
- **Mandatory References**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY FIRST)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md`
  - Worker M1 handoff: `d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_1/handoff.md`

## Adversarial Verification Instructions
1. Write and execute test scripts to challenge schema boundaries and relational constraints:
   - Foreign key integrity: verify inserting child record with non-existent parent foreign key fails.
   - Cascade verification: verify deleting a route correctly cascades to `route_stops`, but deleting a stop DOES NOT cascade (NO ACTION).
   - Unique constraints: verify duplicate `email` in `users`, duplicate `code` in `bus_routes`, duplicate `(route_id, stop_sequence)` in `route_stops` are rejected.
   - Status check: verify check constraints or valid enum values.
2. Provide explicit empirical evidence and verdict: `APPROVE` (correctness confirmed) or `REJECT` (issues found).

## 2026-10-02T13:06:52Z
You are Challenger M1.2 (teamwork_preview_challenger).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/challenger_m1_2
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/challenger_m1_2/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md
Read d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md
Read Worker M1 handoff: d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_1/handoff.md

Empirically challenge database schema constraints: verify foreign key rejections on invalid parents, verify cascade delete on route_id but NO ACTION on stop_id, verify unique constraints.
Provide your explicit empirical verdict: APPROVE or REJECT in handoff.md and notify parent.
