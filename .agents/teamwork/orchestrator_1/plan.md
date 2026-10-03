# Implementation & Orchestration Plan — Vivu Platform

## 1. Dual Track Architecture
- **Track 1: Implementation Track** (M1 -> M2 -> M3 & M4 -> M5 -> M6)
- **Track 2: E2E Testing Track** (Spawned in parallel, designs opaque-box test suites covering Tiers 1-4, creates `TEST_READY.md`)

## 2. Milestone Execution Strategy
- **M1: Foundation & Database Architecture**
  - Worker: Initializes Next.js project with TypeScript, Tailwind, Lucide icons, `mssql`, `bcryptjs`, `jsonwebtoken`, `zod`, `qrcode`, `html5-qrcode`.
  - Creates SQL Server schema for 11 tables (`users`, `bus_routes`, `bus_stops`, `route_stops`, `buses`, `schedules`, `ticket_types`, `orders`, `tickets`, `payment_transactions`, `complaints`).
  - Executes authoritative Seed Data script.
  - Verifies database connectivity and data seeding via verification script.
  - Reviewer & Auditor gate verification.

- **M2: Authentication & Core REST APIs**
  - Worker: Implements Auth APIs (`/api/auth/*`), JWT middleware, Routes & Stops APIs (`/api/routes/*`), Orders API (`/api/orders/*`), SePay Webhook (`/api/webhooks/sepay`) with idempotency & ticket generation, Ticket APIs (`/api/tickets/*`), Complaint API (`/api/complaints`).
  - Reviewer & Challenger & Auditor gate verification.

- **M3: Passenger Portal (Screens 1-6)**
  - Worker: Implements 6 Passenger screens bám sát Mục 7 chống AI Slop, VietQR modal with 15-min countdown, My tickets with QR JWT display.
  - Reviewer & Challenger & Auditor gate verification.

- **M4: Inspector & Admin Portals (Screens 7-14) + Admin REST APIs**
  - Worker: Implements Inspector mobile scanner & history, Admin Analytics Dashboard, CRUD screens, and `/api/admin/*` APIs.
  - Reviewer & Challenger & Auditor gate verification.

- **M5: E2E Test Suite Pass (Tiers 1-4) & Adversarial Hardening (Tier 5)**
  - Worker & QA: Runs 100% of E2E test suite from `TEST_READY.md`, fixes all bugs.
  - Challenger: Stress tests and edge-case verification.
  - Auditor & Clean build check (`npm run build`).

- **M6: Complete Handover Documentation**
  - Documentation Agent: Generates 5 handover docs in `docs/`.
  - Final acceptance and report victory to Sentinel.
