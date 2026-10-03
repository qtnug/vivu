# Project: Vivu Bus Management & Electronic Ticketing Platform

## Architecture
- **Framework**: Next.js 15+ (App Router) with React, TypeScript, Tailwind CSS, Lucide React.
- **Backend & Database**: Next.js Route Handlers (`app/api/*`) connected to Microsoft SQL Server 2025 Express on `localhost:1433` (`bus_ticketing_system`) using `mssql` (`tedious`) driver with connection pooling.
- **Portals**:
  - Passenger Portal (`/`, `/routes/*`, `/booking`, `/payment/*`, `/tickets`, `/feedback`)
  - Inspector Portal (`/inspector/*` - mobile-optimized)
  - Admin Portal (`/admin/*` - analytics & management)
- **Security**: JWT Authentication (`jsonwebtoken`), password hashing (`bcryptjs`), role segregation (`PASSENGER`, `INSPECTOR`, `ADMIN`).
- **Payment & QR**: Dynamic VietQR generation, SePay Webhook with Apikey verification & idempotent processing, Cryptographic Ticket QR JWT payload.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F01: SQL Server DDL Schema | 11 tables with relational integrity, constraints, cascade rules | M1 | Spec Miner 1 |
| 2 | F02: Authoritative Seed Data | Admin, Inspector, Route 01, 5 stops, buses, schedule, 5 ticket types | M1 | Spec Miner 1 |
| 3 | F03: DB Connection Pool & Helpers | Robust mssql pool and query helper in `lib/db.ts` | M1 | Explorer 1 |
| 4 | F04: Next.js Scaffold & Dependencies | App Router, Tailwind, TypeScript, package.json dependencies | M1 | Explorer 1 |
| 5 | F05: Auth APIs (Login & Register) | JWT token pair, password hashing, role claims | M2 | Spec Miner 1 |
| 6 | F06: Auth Refresh API & Middleware | Token refresh, role segregation (Passenger, Inspector, Admin) | M2 | Spec Miner 1 |
| 7 | F07: Routes & Stops Public APIs | `GET /api/routes`, `GET /api/stops`, route details | M2 | Spec Miner 1 |
| 8 | F08: Route Detail & Timetable API | `GET /api/routes/[id]` with ordered stops and schedule times | M2 | Spec Miner 1 |
| 9 | F09: Route Search API | `GET /api/routes/search` with coordinate Haversine formula | M2 | Spec Miner 1 |
| 10 | F10: Ticket Types Public API | `GET /api/ticket-types` listing standard and student prices | M2 | Spec Miner 1 |
| 11 | F11: Order Creation API | `POST /api/orders` (guest & auth, single/daily/monthly) | M2 | Spec Miner 1 |
| 12 | F12: Dynamic VietQR Payment Details | `GET /api/orders/[id]` with VietQR string and countdown | M2 | Spec Miner 1 |
| 13 | F13: 15-Minute Expiry Logic | Expiration tracking, lazy expiry on read/verify | M2 | Spec Miner 1 |
| 14 | F14: SePay Webhook Endpoint | `POST /api/webhooks/sepay` with Apikey authorization | M2 | Spec Miner 1 |
| 15 | F15: SePay Webhook Idempotency | Idempotent handling, transferAmount matching | M2 | Spec Miner 1 |
| 16 | F16: Ticket Generation with JWT QR | Atomically create tickets with signed JWT payloads | M2 | Spec Miner 1 |
| 17 | F17: "My Tickets" API | `GET /api/tickets/my-tickets` with status filtering | M2 | Spec Miner 1 |
| 18 | F18: Inspector Ticket Verify API | `POST /api/tickets/verify`, dual input, HTTP 200 contract, USED status | M2 | Spec Miner 1 |
| 19 | F19: Passenger Complaint API | `POST /api/complaints` for feedback submission | M2 | Spec Miner 1 |
| 20 | F20: Screen 1 - Passenger Home | Route search by start/end stop, recent routes | M3 | Spec Miner 2 |
| 21 | F21: Screen 2 - Route Detail & Map | Ordered stop timeline, schedule, timetable | M3 | Spec Miner 2 |
| 22 | F22: Screen 3 - Ticket Booking | Ticket type, quantity, activation date, passenger info | M3 | Spec Miner 2 |
| 23 | F23: Screen 4 - VietQR Payment Page | QR display, 15-min timer, polling payment status | M3 | Spec Miner 2 |
| 24 | F24: Screen 5 - "My Tickets" Page | Ticket cards, status tags, view QR JWT modal | M3 | Spec Miner 2 |
| 25 | F25: Screen 6 - Complaint Form | Feedback submission with ticket code, route, content | M3 | Spec Miner 2 |
| 26 | F26: Anti-AI-Slop Styling (Passenger) | Professional public transit UI, high contrast, clean UX | M3 | Spec Miner 2 |
| 27 | F27: Screen 7 - Inspector QR Scanner | Mobile camera scanner, manual code input, big Green/Red | M4 | Spec Miner 2 |
| 28 | F28: Screen 8 - Inspector History | Shift scan history, timestamp, ticket details | M4 | Spec Miner 2 |
| 29 | F29: Screen 9 - Admin Dashboard | Revenue charts, ticket sales, top routes, peak hours | M4 | Spec Miner 2 |
| 30 | F30: Screen 10 - Admin Routes & Stops | CRUD routes & stops, stop reordering on route | M4 | Spec Miner 2 |
| 31 | F31: Screen 11 - Admin Buses & Schedules | CRUD buses, assign routes, schedule departure times | M4 | Spec Miner 2 |
| 32 | F32: Screen 12 - Admin Ticket Types | CRUD ticket types and pricing rules | M4 | Spec Miner 2 |
| 33 | F33: Screen 13 - Admin Orders & Logs | Order management, SePay transaction logs | M4 | Spec Miner 2 |
| 34 | F34: Screen 14 - Admin Staff & Complaints | Inspector accounts CRUD, complaint resolution | M4 | Spec Miner 2 |
| 35 | F35: Admin REST APIs | `/api/admin/*` endpoints backing all Admin screens | M4 | Spec Miner 1 |
| 36 | F36: Anti-AI-Slop Styling (Admin/Insp) | Clean data tables, status badges, action verbs | M4 | Spec Miner 2 |
| 37 | F37: Test Infrastructure & Runner | Vitest test runner setup, test database / API client | M5 / Test Track | Original Request |
| 38 | F38: Tier 1 Feature Tests (>=5 per feat)| Comprehensive API & UI functional verification | M5 / Test Track | Original Request |
| 39 | F39: Tier 2 Boundary & Corner Cases | Zero amounts, expired tickets, invalid QR, edge cases | M5 / Test Track | Original Request |
| 40 | F40: Tier 3 Cross-Feature Tests | Full lifecycle (booking -> payment -> ticket -> scan) | M5 / Test Track | Original Request |
| 41 | F41: Tier 4 Real-World Application Scenarios | Complete end-to-end multi-role scenarios | M5 / Test Track | Original Request |
| 42 | F42: Tier 5 Adversarial Coverage Hardening | White-box stress testing, race conditions, edge cases | M5 | Original Request |
| 43 | F43: Project Build & Lint Verification | Clean `npm run build` with zero errors | M5 | Original Request |
| 44 | F44: Handover Documentation (5 docs) | 5 comprehensive handover documents in `docs/` | M6 | Original Request |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Foundation & Database Architecture | Project scaffold, SQL Server schema (11 tables), Seed data, DB client pool | none | IN_PROGRESS |
| M2 | Authentication & Core REST APIs | Auth JWT, Routes/Stops APIs, Orders, SePay Webhook, Ticket verification, Complaints | M1 | PLANNED |
| M3 | Passenger Portal (Screens 1-6) | Home, Route Detail, Booking, VietQR Payment, My Tickets, Complaint, Anti-AI-Slop UI | M2 | PLANNED |
| M4 | Inspector & Admin Portals (Screens 7-14) | Inspector mobile scanner & history, Admin Dashboard, CRUD management screens, Admin APIs | M2 | PLANNED |
| M5 | E2E Test Suite Pass & Adversarial Hardening | 100% pass on Tiers 1-4 tests from E2E Track, Tier 5 Adversarial Hardening, clean build | M3, M4, Test Track | PLANNED |
| M6 | Complete Handover Documentation | 5 comprehensive docs in `docs/` (architecture, deployment, api, manual, test) | M5 | PLANNED |

## Interface Contracts
### Database (`lib/db.ts`) ↔ Backend APIs (`app/api/*`)
- `getDbPool(): Promise<mssql.ConnectionPool>`
- `query<T>(sqlText: string, params?: Record<string, any>): Promise<T[]>`
- `execute(sqlText: string, params?: Record<string, any>): Promise<number>`
- Connection config: host `localhost`, port `1433`, user `vivu_admin`, password `VivuAdmin@2026!`, database `bus_ticketing_system`, `trustServerCertificate: true`.

### Backend APIs ↔ Frontend Portals
- **Auth**: `POST /api/auth/login` -> `{ token, user: { id, email, fullName, role } }`.
- **Order creation**: `POST /api/orders` `{ ticketTypeId, quantity, activationDate, passengerName, passengerPhone, passengerEmail }` -> `{ orderId, orderCode, totalAmount, expiresAt, qrData }`.
- **Payment Verification**: `GET /api/orders/[id]` -> `{ id, orderCode, status, totalAmount, tickets: [...] }`.
- **SePay Webhook**: `POST /api/webhooks/sepay` headers: `Authorization: Apikey <TOKEN>` body: `{ gateway, transactionDate, accountNumber, code, content, transferType, transferAmount, referenceCode }` -> `{ success: true, message }`.
- **Ticket Verification**: `POST /api/tickets/verify` body: `{ qrPayload?: string, ticketCode?: string }` -> `{ valid: boolean, ticket?: { ... }, reason?: string }` (always HTTP 200).

## Code Layout
```
d:/DangQuangTung/Vivu/
├── app/
│   ├── (passenger)/         # Screens 1-6
│   │   ├── page.tsx          # Screen 1: Home & Search
│   │   ├── routes/[id]/      # Screen 2: Route Details & Stops
│   │   ├── booking/          # Screen 3: Ticket Booking
│   │   ├── payment/[id]/     # Screen 4: VietQR Payment & Timer
│   │   ├── tickets/          # Screen 5: My Tickets & QR JWT
│   │   └── feedback/         # Screen 6: Complaints Form
│   ├── inspector/            # Screens 7-8
│   │   ├── scan/             # Screen 7: QR Scanner Camera & Manual
│   │   └── history/          # Screen 8: Shift Inspection History
│   ├── admin/                # Screens 9-14
│   │   ├── dashboard/        # Screen 9: Analytics Dashboard
│   │   ├── routes/           # Screen 10: Routes & Stops CRUD
│   │   ├── buses/            # Screen 11: Buses & Schedules CRUD
│   │   ├── ticket-types/     # Screen 12: Ticket Types & Pricing
│   │   ├── orders/           # Screen 13: Orders & SePay Logs
│   │   ├── staff/            # Screen 14: Inspector Staff Management
│   │   └── complaints/       # Screen 14: Complaints Resolution
│   ├── api/                  # REST APIs
│   │   ├── auth/             # Login, Register, Refresh
│   │   ├── routes/           # Search, List, Detail
│   │   ├── stops/            # Bus stops list
│   │   ├── ticket-types/     # Ticket types list
│   │   ├── orders/           # Create order, Get order status
│   │   ├── webhooks/sepay/   # SePay Idempotent Webhook
│   │   ├── tickets/          # My tickets, Verify ticket
│   │   ├── complaints/       # Submit complaint
│   │   └── admin/            # Admin CRUD & Analytics
│   ├── layout.tsx
│   └── globals.css
├── components/               # Shared UI components (Buttons, Modals, Navbars)
├── lib/                      # Utilities: db.ts, auth.ts, qr.ts, jwt.ts
├── scripts/                  # Seed scripts, DB migration scripts
├── tests/                    # E2E & API test suites
└── docs/                     # 5 Handover documents
```
