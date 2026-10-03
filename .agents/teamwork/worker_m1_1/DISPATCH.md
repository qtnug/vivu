# Dispatch Assignment: Worker M1 (Foundation & Database Architecture Implementation)

- **Identity**: teamwork_preview_worker (Worker M1)
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_1
- **Mandatory References**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MANDATORY FIRST)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md`
  - Explorer Blueprint M1.1: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_1/analysis.md`
  - Explorer Blueprint M1.2: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2/analysis.md`
  - Explorer Blueprint M1.3: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/analysis.md`

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Scope of Work & Exclusive File Ownership
You own:
- Project configs: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.js`, `postcss.config.js`, `.env.local`
- Starter app files: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/utils.ts`
- Database layer: `lib/db.ts`
- Database scripts: `scripts/init-db.js`, `scripts/seed.js`, `scripts/verify-db.js`

Do NOT modify `tests/` (owned by E2E Test Writer) or `.agents/` outside your working directory.

## Implementation Steps
1. **Scaffold Next.js App Router**:
   - Write `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.js`, `postcss.config.js`, `.env.local`.
   - Write starter `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, and `lib/utils.ts`.
   - Run `npm install` (using npm 10.9.0 / Node 22.11.0).
2. **Database Data Access Layer**:
   - Implement `lib/db.ts` with connection pooling, dual-cached pool singleton to prevent Next.js HMR connection leaks, typed queries, and transactions.
3. **Database Schema Creation (11 Tables)**:
   - Implement `scripts/init-db.js` matching `proposed_init-db.js` from `explorer_m1_2`.
   - Run `node scripts/init-db.js` to create all 11 tables, constraints, cascade rules, and 21 indexes on `localhost:1433` `bus_ticketing_system`.
4. **Authoritative Seed Data**:
   - Implement `scripts/seed.js` matching `proposed_seed.js` from `explorer_m1_3`.
   - Run `node scripts/seed.js` to populate master seed data (Admin, Inspector with bcrypt hashes, Route 01, 5 stops in order, 2 buses, schedules, 5 ticket types with valid hex UUIDs).
5. **Verification**:
   - Implement `scripts/verify-db.js` and run `node scripts/verify-db.js`.
   - Run `npm run build` to verify clean compilation with zero TypeScript/lint errors.
6. **Handoff**:
   - Write complete report to `handoff.md` with command execution logs and verification evidence.


## 2026-10-02T12:51:17Z
You are Worker M1 (teamwork_preview_worker).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_1
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_1/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md
Read d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md
Read the three explorer blueprints:
- d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_1/analysis.md
- d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2/analysis.md
- d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Responsibilities:
1. Write project config files (package.json, tsconfig.json, next.config.ts, tailwind.config.js, postcss.config.js, .env.local).
2. Write initial starter files (app/layout.tsx, app/page.tsx, app/globals.css, lib/utils.ts).
3. Run npm install cleanly.
4. Implement lib/db.ts with mssql connection pool singleton.
5. Implement scripts/init-db.js and execute it to create all 11 tables, constraints, cascade rules, and indexes on SQL Server (localhost:1433, database bus_ticketing_system).
6. Implement scripts/seed.js and execute it to seed all authoritative master data.
7. Implement and run scripts/verify-db.js.
8. Run npm run build to verify zero compile/build errors.
9. Write handoff.md with execution proof and test results, then notify parent.
