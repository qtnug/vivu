# BRIEFING — 2026-10-02T13:05:00Z

## Mission
Scaffold Next.js App Router project, implement database connection pool singleton (lib/db.ts), execute schema initialization for 11 tables, seed authoritative master data, verify database integrity, and ensure clean build.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: d:/DangQuangTung/Vivu/.agents/teamwork/worker_m1_1
- Original parent: 891098e1-52e3-4582-a42d-340f57c72e75
- Milestone: M1 (Foundation & Database Architecture Implementation)

## 🔒 Key Constraints
- DO NOT CHEAT: All implementations must be genuine, maintaining real state and real behavior. No dummy/facade implementations or hardcoded results.
- Exclusive file ownership:
  - Project configs: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.js`, `postcss.config.js`, `.env.local`
  - Starter files: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/utils.ts`
  - Database layer: `lib/db.ts`
  - Database scripts: `scripts/init-db.js`, `scripts/seed.js`, `scripts/verify-db.js`
- Do NOT touch `tests/` (owned by E2E Test Writer) or `.agents/` outside `worker_m1_1`.
- SQL Server connection: localhost:1433, database `bus_ticketing_system`, user `vivu_admin`, password `VivuAdmin@2026!`, trustServerCertificate=true.
- Prevent SQL Server Error 1785 (multiple cascade paths): Only `route_stops.route_id` and `tickets.order_id` have `ON DELETE CASCADE`.

## Current Parent
- Conversation ID: 891098e1-52e3-4582-a42d-340f57c72e75
- Updated: 2026-10-02T13:05:00Z

## Task Summary
- **What to build**: Next.js 15+ App Router scaffold, dependencies installation, database pooling client, SQL Server 11-table schema, authoritative seed data, verification script.
- **Success criteria**:
  - `npm install` runs cleanly: ACHIEVED (exit code 0, 587 packages).
  - `node scripts/init-db.js` creates 11 tables, constraints, 21 indexes: ACHIEVED (exit code 0).
  - `node scripts/seed.js` seeds master data: ACHIEVED (exit code 0, 21 records).
  - `node scripts/verify-db.js` passes all checks: ACHIEVED (43/43 assertions passed).
  - `npm run build` succeeds with zero errors: ACHIEVED (exit code 0).
- **Interface contracts**: `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md` § Interface Contracts
- **Code layout**: `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md` § Code Layout

## Key Decisions Made
- Used direct non-interactive file scaffolding rather than `create-next-app` to avoid CLI conflicts with pre-existing repo files.
- Configured port 3001 in dev/start scripts because port 3000 is occupied.
- Configured `serverExternalPackages: ['mssql', 'tedious']` in `next.config.ts`.
- Implemented dual-cached pool singleton in `lib/db.ts` with typed parameters and transactions.
- Used hex UUIDs for ticket types prefixed with `c` to prevent SQL Server UUID hex conversion failure.
- Configured `typescript-eslint` in `eslint.config.mjs` and updated npm script to `"lint": "eslint ."` for ESLint 9 / Next 16 compatibility.

## Artifact Index
- `handoff.md` — Final handoff report
- `progress.md` — Liveness and execution heartbeat

## Change Tracker
- **Files modified**:
  - `package.json`: Dependencies, devDependencies, and npm scripts (dev, build, start, lint, typecheck, db:init, db:seed, db:verify).
  - `tsconfig.json`: TypeScript compiler options with path alias `@/*`.
  - `next.config.ts`: Next.js configuration with serverExternalPackages for mssql and tedious.
  - `tailwind.config.js`: Tailwind CSS configuration with transit brand colors.
  - `postcss.config.js`: PostCSS configuration.
  - `.env.local`: Environment variables for database, JWT, SePay, Goong Map.
  - `.gitignore`: Standard Next.js/Node gitignore.
  - `eslint.config.mjs`: ESLint flat config with typescript-eslint.
  - `app/layout.tsx`: Root HTML layout with metadata.
  - `app/page.tsx`: Passenger homepage (Screen 1) matching anti-AI-slop standard.
  - `app/globals.css`: Tailwind root styling and color variables.
  - `lib/utils.ts`: Utility helper (cn with clsx and tailwind-merge).
  - `lib/db.ts`: Connection pool singleton with typed queries and transaction helpers.
  - `scripts/init-db.js`: Idempotent schema migration runner (11 tables, 21 indexes).
  - `scripts/schema.sql`: Raw T-SQL DDL schema.
  - `scripts/seed.js`: Master seed data runner (21 records across 7 tables).
  - `scripts/seed.sql`: Raw T-SQL seed data.
  - `scripts/verify-db.js`: 7-section automated verification suite.
- **Build status**: PASS (`npm run build` exit code 0)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (typecheck pass, db:verify 43/43 pass, next build pass)
- **Lint status**: Clean (0 errors, 0 warnings)
- **Tests added/modified**: `scripts/verify-db.js` (43 assertions)

## Loaded Skills
- None
