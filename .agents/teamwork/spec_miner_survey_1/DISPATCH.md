# Dispatch Assignment: Spec Miner Survey 1 (Backend, Database, APIs & Business Logic)

- **Identity**: teamwork_preview_spec_miner (Spec Miner Survey 1)
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1
- **Authoritative Docs**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MUST READ FIRST)
  - `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` (Full specification document)

## Objective
Extract, analyze, and document all Backend, Database, Security, and Business Logic requirements:
1. Complete Database Schema (DDL): all 10 tables (`users`, `bus_routes`, `bus_stops`, `route_stops`, `buses`, `schedules`, `ticket_types`, `orders`, `tickets`, `payment_transactions`, `complaints`), relationships, foreign keys, enums, indexes, and required initial Seed Data.
2. Complete REST API Specifications (Section 6 of thiet-ke-he-thong-xe-buyt.md):
   - Auth endpoints (JWT access/refresh, role-based claims: PASSENGER, INSPECTOR, ADMIN)
   - Bus Routes, Bus Stops, Timetables, Search endpoints
   - Order creation, Guest checkout vs Authenticated checkout, Pricing calculation
   - SePay Webhook integration (`POST /api/webhooks/sepay`): idempotent handling, transaction verification, ticket generation
   - Ticket verification API: QR code payload decoding, JWT signature verification, status transition (ACTIVE -> USED), handling EXPIRED/USED
   - Complaints submission & Admin review
   - Admin CRUD APIs for all resources
3. Business rules, edge cases, error codes, and validation rules.

## Output
Write your comprehensive analysis to `analysis.md` and summary handoff to `handoff.md` in your working directory `d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/`.
Report back when finished.


## 2026-10-02T12:24:50Z
You are Spec Miner Survey 1 (teamwork_preview_spec_miner).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md (Authoritative full spec)

Focus: Extract complete Backend, Database (all 10 tables, constraints, seed data), REST APIs (all endpoints, request/response formats, status codes, query params), Auth/Security rules, VietQR dynamic payment flow, idempotent SePay webhook, Ticket JWT QR token structure, and inspector validation logic.

Output: Write comprehensive findings to d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/analysis.md and summary handoff to d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/handoff.md.
Send a message to parent when completed.
