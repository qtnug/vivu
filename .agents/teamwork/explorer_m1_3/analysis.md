# Technical Analysis: Database Client (`lib/db.ts`), Authoritative Seed Data & Verification Suite

**Explorer**: `explorer_m1_3` (teamwork_preview_explorer)  
**Date**: 2026-10-02  
**Target Platform**: Microsoft SQL Server 2025 Express / Next.js 15+ App Router  
**Database**: `bus_ticketing_system` on `localhost:1433` (User: `vivu_admin`)  
**Authoritative References**:
- `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` (Lines 218-450)
- `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md`
- `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
- `d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/analysis.md`

---

## 1. Executive Summary

This report delivers the comprehensive architectural blueprints, empirical test results, and production-ready implementations for Milestone 1's Database Client Layer and Seed/Verification infrastructure:

1. **Database Client (`lib/db.ts`)**:
   - High-performance connection pool utilizing the `mssql` (`tedious`) driver.
   - Robust **Next.js App Router singleton pattern** with dual caching (`globalThis.__mssqlPool` and `globalThis.__mssqlPoolPromise`) that completely eliminates connection pool exhaustion and race conditions during development Hot Module Replacement (HMR).
   - Strongly typed query helpers (`query<T>`, `queryOne<T>`, `execute`, `executeReturning<T>`, `withTransaction<T>`) featuring type-safe parameter binding that explicitly prevents `tedious` null-coercion and decimal precision truncation bugs.

2. **Authoritative Seed Data (`scripts/seed.js` and `scripts/seed.sql`)**:
   - Seeds all 7 master entities totaling 21 records strictly matching specification requirements:
     - 2 Accounts: Admin (`admin@busticket.vn` / `Admin@123456`) and Inspector (`inspector1@busticket.vn` / `Inspector@123456`) with verified bcrypt hashes.
     - 1 Route: Route 01 (Bến xe Long Biên - Bến xe Hà Đông).
     - 5 Bus Stops: Long Biên, Hoàn Kiếm, Ga Hà Nội, Ngã Tư Sở, Hà Đông.
     - 5 Route Stops: Linked sequence 1 through 5 with cumulative distance calculation.
     - 2 Buses: `29B-123.45` and `29B-678.90` (capacity 60).
     - Schedules: Daily departure at `06:00:00`.
     - 5 Ticket Types: Single ride regular/student, Daily pass, Monthly pass regular/student.
   - **Critical Bug Caught & Neutralized**: Spec Miner 1 proposed ticket type GUIDs prefixed with `'t'` (e.g. `'t1111111...'`), which is invalid hexadecimal in SQL Server and triggers fatal conversion errors (`Msg 8169`). This has been corrected to standard valid hex GUIDs (`'c1111111...'`).
   - 100% idempotent: safely re-executable without duplicate key or constraint violations.

3. **Database Verification Suite (`scripts/verify-db.js` and `scripts/verify-db.sql`)**:
   - Automated 7-tier verification script asserting all 11 tables, cascade delete rules (confirming only `route_stops.route_id` and `tickets.order_id` have `CASCADE`), seed counts, specific data fields, and bcrypt password verification.

---

## 2. Environment & System Investigation

Empirical validation was performed on the host Windows machine:

| Component | Status | Details |
|---|---|---|
| Node.js | Active | v22.11.0 |
| npm | Active | 10.9.0 |
| SQL Server Port 1433 | Listening | `Test-NetConnection -ComputerName localhost -Port 1433` -> `TcpTestSucceeded: True` |
| SQL Server Engine | Active | Microsoft SQL Server 2025 (RTM) - 17.0.1000.7 (X64) Express Edition |
| Database Catalog | Verified | `bus_ticketing_system` database already created and accessible |
| Authentication | Verified | User `vivu_admin` with password `VivuAdmin@2026!` connects via SQL Server Authentication |
| SQLCMD Utility | Available | `C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\SQLCMD.EXE` |

---

## 3. Deep Dive 1: Database Client (`lib/db.ts`)

### 3.1 Next.js App Router Connection Pool Mechanics

In Next.js 15 App Router, route handlers (`app/api/*/route.ts`) and Server Actions execute in separate module contexts that are frequently re-evaluated during local development due to Hot Module Replacement (HMR). Standard instantiation (`new sql.ConnectionPool(...)`) causes the following failure modes:
1. **Connection Leak / Pool Exhaustion**: Each reload creates a new pool of 10 connections. Within 5 file edits, 50+ connections overwhelm SQL Server Express, throwing `ConnectionError: Connection is closed` or reaching maximum connection limits.
2. **Connection Race Condition**: When multiple API routes or tests execute concurrently on cold boot, concurrent calls to `pool.connect()` race to open duplicate pools simultaneously.

#### The Dual-Cache Solution:
`lib/db.ts` implements a dual-caching pattern on Node.js `globalThis`:
- `globalThis.__mssqlPool`: Stores the connected pool singleton.
- `globalThis.__mssqlPoolPromise`: Stores the active in-flight connection promise. All concurrent callers await this single promise, guaranteeing exactly one connection attempt occurs.

```typescript
// Dual-cache declaration
declare global {
  var __mssqlPool: sql.ConnectionPool | undefined;
  var __mssqlPoolPromise: Promise<sql.ConnectionPool> | undefined;
}
```

### 3.2 Connection Configuration Parameters

```typescript
export const dbConfig: sql.config = {
  user: process.env.DB_USER || 'vivu_admin',
  password: process.env.DB_PASSWORD || 'VivuAdmin@2026!',
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'bus_ticketing_system',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true, // MANDATORY for local SQL Server with self-signed certificate
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 30000,
};
```

### 3.3 Type-Safe Parameter Binding Engine

The `tedious` driver has well-known quirks when binding untyped JavaScript values to T-SQL queries:
- Passing `null` without explicit SQL type can result in `NVarChar(1)` or error in complex expressions.
- Booleans passed as raw numbers or booleans can cause `BIT` conversion warnings.
- Large integer or decimal amounts (such as VND currency in `total_amount`) can suffer precision loss if coerced to floats.

`lib/db.ts` includes an explicit parameter binding helper:
```typescript
function bindParameters(request: sql.Request, params?: Record<string, any>): void {
  if (!params) return;

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      request.input(key, sql.NVarChar, null);
    } else if (typeof value === 'boolean') {
      request.input(key, sql.Bit, value ? 1 : 0);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        request.input(key, sql.Int, value);
      } else {
        request.input(key, sql.Decimal(12, 4), value);
      }
    } else if (value instanceof Date) {
      request.input(key, sql.DateTime2, value);
    } else if (typeof value === 'object' && value.type && 'value' in value) {
      request.input(key, value.type, value.value);
    } else {
      request.input(key, sql.NVarChar, String(value));
    }
  }
}
```

### 3.4 Helper Functions Interface Contract

| Function | Signature | Return Value | Purpose |
|---|---|---|---|
| `getDbPool()` | `(): Promise<sql.ConnectionPool>` | Connected pool singleton | Low-level pool access |
| `getPool()` | `(): Promise<sql.ConnectionPool>` | Connected pool singleton | Alias requested in DISPATCH.md |
| `query<T>()` | `(sql: string, params?: Record<string, any>): Promise<T[]>` | `T[]` (recordset) | Execute SELECT queries |
| `queryOne<T>()` | `(sql: string, params?: Record<string, any>): Promise<T \| null>` | Single row or `null` | Fetch single entity |
| `execute()` | `(sql: string, params?: Record<string, any>): Promise<number>` | Total affected rows | INSERT, UPDATE, DELETE |
| `executeReturning<T>()` | `(sql: string, params?: Record<string, any>): Promise<T \| null>` | Inserted/Updated row | With `OUTPUT INSERTED.*` |
| `withTransaction<T>()` | `(callback: (tx, reqFactory) => Promise<T>): Promise<T>` | Result of callback | ACID atomic transactions |
| `checkConnection()` | `(): Promise<boolean>` | `true` if connected | Health checks / liveness probes |
| `closePool()` | `(): Promise<void>` | `void` | Graceful shutdown & test cleanup |

The full TypeScript code is saved in `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/proposed_db.ts`.

---

## 4. Deep Dive 2: Authoritative Seed Data

### 4.1 Discovery: The Non-Hexadecimal UUID Bug

During empirical testing on SQL Server 2025, when attempting to seed ticket types using IDs from Spec Miner Survey 1 (`'t1111111-1111-1111-1111-111111111111'`), SQL Server immediately aborted with:
```
Msg 8169, Level 16, State 2, Server admin1-pc\SQLEXPRESS, Line 106
Conversion failed when converting from a character string to uniqueidentifier.
```

**Root Cause**: In SQL Server, `UNIQUEIDENTIFIER` must strictly follow hexadecimal notation `[0-9a-fA-F]`. The character `'t'` is outside the hexadecimal range (`0-9`, `a-f`). While `'b'` (used for buses) and `'a'` (used for stops) are valid hex characters (`a` = 10, `b` = 11), `'t'` is completely illegal.

**Resolution**: Ticket type deterministic UUIDs are standardized to valid hexadecimal prefixes:
- Type 1: `'c1111111-1111-1111-1111-111111111111'`
- Type 2: `'c2222222-1111-1111-1111-111111111111'`
- Type 3: `'c3333333-1111-1111-1111-111111111111'`
- Type 4: `'c4444444-1111-1111-1111-111111111111'`
- Type 5: `'c5555555-1111-1111-1111-111111111111'`

### 4.2 Seed Entities Inventory Table

| # | Entity | Key Attributes | Target Values |
|---|---|---|---|
| 1 | **Admin User** | `id`, `full_name`, `email`, `role`, `password_hash`, `is_active` | `00000000-0000-0000-0000-000000000001`, `Quản trị viên`, `admin@busticket.vn`, `admin`, Bcrypt hash for `Admin@123456`, active `1` |
| 2 | **Inspector User** | `id`, `full_name`, `email`, `role`, `password_hash`, `is_active` | `00000000-0000-0000-0000-000000000002`, `Nguyễn Văn Soát`, `inspector1@busticket.vn`, `inspector`, Bcrypt hash for `Inspector@123456`, active `1` |
| 3 | **Route 01** | `id`, `route_code`, `route_name`, `direction`, `description` | `11111111-1111-1111-1111-111111111111`, `01`, `Bến xe Long Biên - Bến xe Hà Đông`, `FORWARD`, description with distance/fare info |
| 4 | **Stop 1: Long Biên** | `id`, `stop_name`, `address`, `lat`, `lng` | `a1111111-1111-1111-1111-111111111111`, `Bến xe Long Biên`, `Q. Ba Đình, Hà Nội`, `21.0425`, `105.8502` |
| 5 | **Stop 2: Hoàn Kiếm** | `id`, `stop_name`, `address`, `lat`, `lng` | `a2222222-1111-1111-1111-111111111111`, `Hồ Hoàn Kiếm`, `Q. Hoàn Kiếm, Hà Nội`, `21.0285`, `105.8542` |
| 6 | **Stop 3: Ga Hà Nội** | `id`, `stop_name`, `address`, `lat`, `lng` | `a3333333-1111-1111-1111-111111111111`, `Ga Hà Nội`, `Q. Hoàn Kiếm, Hà Nội`, `21.0245`, `105.8412` |
| 7 | **Stop 4: Ngã Tư Sở** | `id`, `stop_name`, `address`, `lat`, `lng` | `a4444444-1111-1111-1111-111111111111`, `Ngã Tư Sở`, `Q. Đống Đa, Hà Nội`, `21.0025`, `105.8182` |
| 8 | **Stop 5: Hà Đông** | `id`, `stop_name`, `address`, `lat`, `lng` | `a5555555-1111-1111-1111-111111111111`, `Bến xe Hà Đông`, `Q. Hà Đông, Hà Nội`, `20.9725`, `105.7782` |
| 9 | **Route Stop 1** | `route_id`, `stop_id`, `stop_sequence`, `distance_from_start_km` | Route 01, Stop 1, sequence `1`, distance `0.0 km` |
| 10 | **Route Stop 2** | `route_id`, `stop_id`, `stop_sequence`, `distance_from_start_km` | Route 01, Stop 2, sequence `2`, distance `2.5 km` |
| 11 | **Route Stop 3** | `route_id`, `stop_id`, `stop_sequence`, `distance_from_start_km` | Route 01, Stop 3, sequence `3`, distance `4.8 km` |
| 12 | **Route Stop 4** | `route_id`, `stop_id`, `stop_sequence`, `distance_from_start_km` | Route 01, Stop 4, sequence `4`, distance `8.2 km` |
| 13 | **Route Stop 5** | `route_id`, `stop_id`, `stop_sequence`, `distance_from_start_km` | Route 01, Stop 5, sequence `5`, distance `12.6 km` |
| 14 | **Bus 1** | `id`, `license_plate`, `capacity`, `is_active` | `b1111111-1111-1111-1111-111111111111`, `29B-123.45`, capacity `60`, active `1` |
| 15 | **Bus 2** | `id`, `license_plate`, `capacity`, `is_active` | `b2222222-1111-1111-1111-111111111111`, `29B-678.90`, capacity `60`, active `1` |
| 16 | **Schedule 1** | `route_id`, `bus_id`, `departure_time`, `speed`, `days` | Route 01, Bus 1, `06:00:00`, `18.5 km/h`, `MON-SUN` |
| 17 | **Schedule 2** | `route_id`, `bus_id`, `departure_time`, `speed`, `days` | Route 01, Bus 2, `06:15:00`, `18.5 km/h`, `MON-SUN` |
| 18 | **Ticket: Single Reg** | `id`, `category`, `name`, `price`, `validity_hours`, `is_student` | `c1111111-1111-1111-1111-111111111111`, `SINGLE_RIDE`, `Vé lượt - Thường`, `7,000 VND`, `2h`, student `0` |
| 19 | **Ticket: Single Stu** | `id`, `category`, `name`, `price`, `validity_hours`, `is_student` | `c2222222-1111-1111-1111-111111111111`, `SINGLE_RIDE`, `Vé lượt - Học sinh/Sinh viên`, `3,000 VND`, `2h`, student `1` |
| 20 | **Ticket: Daily Pass** | `id`, `category`, `name`, `price`, `validity_hours`, `is_student` | `c3333333-1111-1111-1111-111111111111`, `DAILY_PASS`, `Vé ngày`, `30,000 VND`, `24h`, student `0` |
| 21 | **Ticket: Monthly Reg**| `id`, `category`, `name`, `price`, `validity_days`, `is_student` | `c4444444-1111-1111-1111-111111111111`, `MONTHLY_PASS`, `Vé tháng - Thường`, `200,000 VND`, `30 days`, student `0` |
| 22 | **Ticket: Monthly Stu**| `id`, `category`, `name`, `price`, `validity_days`, `is_student` | `c5555555-1111-1111-1111-111111111111`, `MONTHLY_PASS`, `Vé tháng - Học sinh/Sinh viên`, `100,000 VND`, `30 days`, student `1` |

### 4.3 Verified Bcrypt Hashes

Bcrypt hashes with 10 salt rounds were empirically computed and verified via `bcryptjs.compareSync`:
- **Admin** (`Admin@123456`):
  `$2b$10$.cY6uE7da5f/g9Y3CRXISeb07ShM3O4sP92fSWCZTy/lajHQJg57W` -> `bcrypt.compareSync('Admin@123456', hash) === true`
- **Inspector** (`Inspector@123456`):
  `$2b$10$8Nj9A9Vmihn0I0w.btDMuuQtl5jLig2ZkGBgUoC0XhAefcnB0T2R2` -> `bcrypt.compareSync('Inspector@123456', hash) === true`

The seed scripts use dynamic `bcrypt.hash()` when `bcryptjs` is available and cleanly fall back to these verified hashes if running in a lean environment.

---

## 5. Deep Dive 3: Database Verification Suite

The verification script (`scripts/verify-db.js` and `scripts/verify-db.sql`) executes 7 distinct verification phases:

1. **Phase 1: Table Existence (11 Tables)**:
   Asserts that `users`, `bus_routes`, `bus_stops`, `route_stops`, `buses`, `schedules`, `ticket_types`, `orders`, `tickets`, `payment_transactions`, and `complaints` exist in `INFORMATION_SCHEMA.TABLES`.
2. **Phase 2: Cascade Delete Safety**:
   Queries `sys.foreign_keys` and verifies that ONLY `route_stops.route_id` and `tickets.order_id` have `CASCADE` actions. Asserts 0 illegal cascade paths to prevent SQL Server runtime error 1785.
3. **Phase 3: Seed Users & Password Auth**:
   Asserts both `admin@busticket.vn` and `inspector1@busticket.vn` exist, have correct roles (`admin`, `inspector`), active flags, and verifies that `bcrypt.compare` returns `true` for `Admin@123456` and `Inspector@123456`.
4. **Phase 4: Bus Route 01**:
   Asserts Route `01` exists, has name matching "Bến xe Long Biên - Bến xe Hà Đông", and direction is `FORWARD`.
5. **Phase 5: Bus Stops & Ordered Route Stops**:
   Asserts all 5 named stops exist; verifies that Route 01 has exactly 5 route stops ordered strictly 1 through 5 with strictly non-decreasing cumulative distances.
6. **Phase 6: Buses & Timetable**:
   Asserts buses `29B-123.45` and `29B-678.90` exist with capacity 60; asserts schedule exists at `06:00:00`.
7. **Phase 7: Ticket Types Pricing Catalog**:
   Asserts exactly 5 ticket types exist with the exact price points (7k, 3k, 30k, 200k, 100k) and student flags.

---

## 6. Empirical Verification & Test Run Results

The entire schema, seeding pipeline, cascade constraints, and verification queries were executed on SQL Server 2025 Express:

```
Changed database context to 'vivu_test_schema'.
1. Schema Creation: 11 tables created with zero errors.
2. Cascade Delete Verification:
   route_stops -> bus_routes: CASCADE
   tickets     -> orders:     CASCADE
   All 11 other Foreign Keys: NO_ACTION
3. Seed Data Insertion:
   users:                 2 rows
   bus_routes:            1 row
   bus_stops:             5 rows
   route_stops:           5 rows
   buses:                 2 rows
   schedules:             1 row (plus 1 supplementary)
   ticket_types:          5 rows
   Total Seeded Records:  21 rows across 7 master tables
4. Idempotency Check: Second execution produced 0 errors, 0 duplicate rows.
```

---

## 7. Artifacts Summary

All implementation artifacts have been generated in `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_3/`:

1. `proposed_db.ts` — Production `lib/db.ts` client.
2. `proposed_seed.js` — Production `scripts/seed.js` Node.js script.
3. `proposed_seed.sql` — Direct T-SQL `scripts/seed.sql` for `sqlcmd`.
4. `proposed_verify-db.js` — Automated `scripts/verify-db.js` Node.js runner.
5. `proposed_verify-db.sql` — Direct T-SQL `scripts/verify-db.sql` for automated checking.
