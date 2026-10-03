# BRIEFING — 2026-10-02T12:30:00Z

## Mission
Discover and document complete Backend, Database (all 10 tables, constraints, seed data), REST APIs, Security/Auth, VietQR payment flow, SePay webhook idempotency, Ticket JWT QR token structure, and inspector validation logic from authoritative specifications.

## 🔒 My Identity
- Archetype: teamwork_preview_spec_miner
- Roles: Specification Miner (Backend, Database, APIs, Security & Business Logic)
- Working directory: d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1
- Original parent: 891098e1-52e3-4582-a42d-340f57c72e75
- Milestone: Survey & Specification Mining

## 🔒 Key Constraints
- Read-only analysis: Do NOT implement anything
- Prioritize authoritative source: thiet-ke-he-thong-xe-buyt.md and ORIGINAL_REQUEST.md
- Full coverage of all 10 tables, columns, types, foreign keys, indexes, enums, seed data
- Complete REST API specifications: endpoints, methods, auth, request bodies, response bodies, status codes, query parameters
- SePay webhook idempotent flow & ticket creation logic
- Ticket JWT payload format, signing, and inspector validation flow
- Produce analysis.md and handoff.md in working directory
- Keep progress.md updated

## Current Parent
- Conversation ID: 891098e1-52e3-4582-a42d-340f57c72e75
- Updated: not yet

## Task Summary
- **What to build**: Comprehensive specification analysis document and handoff report
- **Success criteria**: Exhaustive extraction of database DDL/schema, REST APIs, payment webhooks, ticket QR JWT, auth roles, and business rules
- **Interface contracts**: thiet-ke-he-thong-xe-buyt.md
- **Code layout**: d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/

## Key Decisions Made
- Treat thiet-ke-he-thong-xe-buyt.md as the primary authoritative specification
- Cross-reference with ORIGINAL_REQUEST.md for overarching requirements
- Documented all 11 tables (including `complaints`), SQL Server multiple cascade path constraints (`NO ACTION`), seed records, 26 REST APIs, SePay idempotent webhook flow, and inspector validation HTTP 200 contract in `analysis.md` and `handoff.md`

## Artifact Index
- d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/analysis.md — Full extracted backend & database specifications (10 tables, 26 features, 20 edge cases)
- d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/handoff.md — 5-component handoff report
- d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/progress.md — Liveness heartbeat and step tracking
