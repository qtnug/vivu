# Technical Analysis: SQL Server DDL Schema, Constraints & Automated Migration Architecture (Milestone 1.2)

- **Agent**: Explorer M1.2 (`teamwork_preview_explorer`)
- **Recipient**: Parent Orchestrator (`891098e1-52e3-4582-a42d-340f57c72e75`), Worker M1
- **Working Directory**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2`
- **Authoritative Specifications**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (Mandatory First)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/orchestrator_1/PROJECT.md`
  - `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` (Lines 218–450)
  - `d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/analysis.md`

---

## 1. Executive Summary

This report delivers the verified database schema architecture, constraint analysis, index catalog, and automated Node.js migration runner design for the **Vivu Bus Management & Electronic Ticketing Platform** (`bus_ticketing_system`).

The database engine is **Microsoft SQL Server 2025 Express** running on `localhost:1433`. Key architectural findings and accomplishments include:
1. **Target Environment Verified**: SQL Server 2025 (RTM) - 17.0.1000.7 (X64) is running on `localhost:1433`. User `vivu_admin` with password `VivuAdmin@2026!` has `dbo` privileges on database `bus_ticketing_system`. Server collation is `SQL_Latin1_General_CP1_CI_AS`.
2. **11 Core Tables Specified**: Exact T-SQL schemas for `users`, `bus_routes`, `bus_stops`, `route_stops`, `buses`, `schedules`, `ticket_types`, `orders`, `tickets`, `payment_transactions`, and `complaints` matching `thiet-ke-he-thong-xe-buyt.md` down to column names, nullability, default values, and `CHECK` constraints.
3. **Strict Prevention of Multiple Cascade Paths (Error 1785)**: Proved and verified that out of 13 foreign keys across the schema, **only 2** use `ON DELETE CASCADE` (`route_stops.route_id` and `tickets.order_id`). The other 11 foreign keys strictly use `NO ACTION` (default). This eliminates SQL Server Error 1785 while preserving data integrity.
4. **Comprehensive Index Catalog**: 21 explicit non-clustered indexes covering foreign keys, lookup codes, lifecycle status fields, and geospatial coordinates for Haversine proximity queries. Clarified index naming and mapped `idx_tickets_user` to `tickets.used_by_inspector_id` (the FK referencing `users.id`).
5. **Dual-Engine Automated Migration Script**: Designed and empirically verified `scripts/init-db.js` (and companion `scripts/schema.sql`). It supports native `mssql` connection pooling and transparently falls back to `sqlcmd` if executed before `npm install`, achieving 100% idempotent creation on first run and zero errors on subsequent runs.

---

## 2. SQL Server Environment & Connectivity Verification

Direct query executed against the host instance via `sqlcmd -S localhost -E -C`:
- **Engine Version**: `Microsoft SQL Server 2025 (RTM) - 17.0.1000.7 (X64) Express Edition (64-bit)`
- **Host OS**: `Windows 10 Pro 10.0 (Build 19044)`
- **Collation**: `SQL_Latin1_General_CP1_CI_AS` (Case-Insensitive, Accent-Sensitive)
- **Port**: `1433` (TCP/IP listening verified via PowerShell `Test-NetConnection`)
- **Target Database**: `bus_ticketing_system` (Pre-created, currently clean with 0 tables)
- **Login Principal**: `vivu_admin` (SQL Server Authentication, password: `VivuAdmin@2026!`, mapped to database user `dbo`)
- **Connection Prerequisite**: Microsoft ODBC Driver 18 and tedious require `trustServerCertificate: true` (or `-C` flag) because the default self-signed developer certificate is not from a public CA.

---

## 3. Detailed Table Schema Specifications (11 Tables)

The table hierarchy forms a Directed Acyclic Graph (DAG) with three dependency levels:
- **Level 0 (No Foreign Keys)**: `users`, `bus_routes`, `bus_stops`, `buses`, `ticket_types`
- **Level 1 (Direct Dependencies on Level 0)**: `route_stops`, `schedules`, `orders`, `complaints`
- **Level 2 (Dependencies on Level 1 & 0)**: `tickets`, `payment_transactions`

### Level 0 Tables

#### 3.1 `users` — Tài khoản người dùng, nhân viên, quản trị viên
- **Purpose**: Stores user identities across all three system roles (`passenger`, `inspector`, `admin`), student discount flag, and guest state.
- **DDL**:
  ```sql
  CREATE TABLE users (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      full_name NVARCHAR(255) NOT NULL,
      email NVARCHAR(255) UNIQUE,                  -- NULL if guest checkout
      phone NVARCHAR(20) UNIQUE,                   -- Required for verification / lookup
      password_hash NVARCHAR(255),                 -- NULL if guest checkout
      role VARCHAR(20) NOT NULL DEFAULT 'passenger'
          CHECK (role IN ('passenger', 'inspector', 'admin')),
      is_student BIT NOT NULL DEFAULT 0,           -- 1 = eligible for student fares
      is_active BIT NOT NULL DEFAULT 1,            -- Account lock/unlock status
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  ```
- **Constraints & Indexes**:
  - `CHECK (role IN ('passenger', 'inspector', 'admin'))`
  - `idx_users_email` on `users(email)`
  - `idx_users_role` on `users(role)`

#### 3.2 `bus_routes` — Tuyến xe buýt
- **Purpose**: Master transit route catalog with code and direction.
- **DDL**:
  ```sql
  CREATE TABLE bus_routes (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      route_code VARCHAR(20) NOT NULL UNIQUE,      -- e.g. "01", "02"
      route_name NVARCHAR(255) NOT NULL,
      direction VARCHAR(10) NOT NULL CHECK (direction IN ('FORWARD', 'BACKWARD')),
      description NVARCHAR(MAX),
      is_active BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  ```
- **Constraints & Indexes**:
  - `CHECK (direction IN ('FORWARD', 'BACKWARD'))`
  - `idx_bus_routes_code` on `bus_routes(route_code)`

#### 3.3 `bus_stops` — Trạm dừng xe buýt
- **Purpose**: Physical bus stops with geographic coordinates for map display and route proximity search.
- **DDL**:
  ```sql
  CREATE TABLE bus_stops (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      stop_name NVARCHAR(255) NOT NULL,
      address NVARCHAR(500),
      latitude DECIMAL(10, 7) NOT NULL,
      longitude DECIMAL(10, 7) NOT NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  ```
- **Indexes**:
  - `idx_bus_stops_coords` on `bus_stops(latitude, longitude)` (High performance spatial bounding box / Haversine filtering)

#### 3.4 `buses` — Phương tiện xe buýt
- **Purpose**: Physical transit fleet assets and vehicle passenger capacity.
- **DDL**:
  ```sql
  CREATE TABLE buses (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      license_plate VARCHAR(20) NOT NULL UNIQUE,   -- e.g. "29B-123.45"
      capacity INT NOT NULL,                       -- Total vehicle passenger capacity
      is_active BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  ```
- **Constraints**:
  - `UNIQUE (license_plate)`

#### 3.5 `ticket_types` — Bảng giá & Loại vé
- **Purpose**: Catalog of ticketing products including fare pricing, validity durations, and student discount indicators.
- **DDL**:
  ```sql
  CREATE TABLE ticket_types (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      category VARCHAR(20) NOT NULL
          CHECK (category IN ('SINGLE_RIDE', 'DAILY_PASS', 'MONTHLY_PASS')),
      name NVARCHAR(100) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,               -- Fare in VND
      validity_hours INT,                          -- For SINGLE_RIDE (2h), DAILY_PASS (24h)
      validity_days INT,                           -- For MONTHLY_PASS (30d)
      is_student_price BIT NOT NULL DEFAULT 0,
      is_active BIT NOT NULL DEFAULT 1
  );
  ```
- **Constraints**:
  - `CHECK (category IN ('SINGLE_RIDE', 'DAILY_PASS', 'MONTHLY_PASS'))`

---

### Level 1 Tables

#### 3.6 `route_stops` — Thứ tự trạm theo từng tuyến
- **Purpose**: Associates stops to a route in strict sequential order with cumulative distance from start terminus.
- **DDL**:
  ```sql
  CREATE TABLE route_stops (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
      stop_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_stops(id), -- NO ACTION
      stop_sequence INT NOT NULL,
      distance_from_start_km DECIMAL(6, 2) NOT NULL DEFAULT 0,
      CONSTRAINT uq_route_sequence UNIQUE (route_id, stop_sequence)
  );
  ```
- **Cascade Rule**:
  - `route_id`: **`ON DELETE CASCADE`** (Allowed & required: route owns its stops sequence).
  - `stop_id`: **`NO ACTION`** (Strict: deleting a physical stop does not delete entire routes).
- **Indexes**:
  - `uq_route_sequence` UNIQUE on `(route_id, stop_sequence)`
  - `idx_route_stops_route` on `route_stops(route_id)`
  - `idx_route_stops_stop` on `route_stops(stop_id)`

#### 3.7 `schedules` — Lịch trình xuất bến tĩnh
- **Purpose**: Defines static daily departure times, estimated average transit speed, and operational days.
- **DDL**:
  ```sql
  CREATE TABLE schedules (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id), -- NO ACTION
      bus_id UNIQUEIDENTIFIER REFERENCES buses(id),                 -- NO ACTION
      departure_time TIME(0) NOT NULL,
      average_speed_kmh DECIMAL(5, 2) NOT NULL DEFAULT 20.0,
      days_of_week VARCHAR(20) NOT NULL DEFAULT 'MON-SUN',
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  ```
- **Cascade Rule**:
  - `route_id`: **`NO ACTION`**
  - `bus_id`: **`NO ACTION`**
- **Indexes**:
  - `idx_schedules_route` on `schedules(route_id)`
  - `idx_schedules_bus` on `schedules(bus_id)`

#### 3.8 `orders` — Đơn hàng mua vé
- **Purpose**: Purchase transactions for registered users and guest checkout, with 15-minute countdown deadline.
- **DDL**:
  ```sql
  CREATE TABLE orders (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      order_code VARCHAR(30) NOT NULL UNIQUE,      -- Used as VietQR payment memo (e.g. DH...)
      user_id UNIQUEIDENTIFIER REFERENCES users(id), -- NULL if guest checkout (NO ACTION)
      guest_phone VARCHAR(20),                     -- Required if user_id is NULL
      ticket_type_id UNIQUEIDENTIFIER NOT NULL REFERENCES ticket_types(id), -- NO ACTION
      route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),         -- NO ACTION
      quantity INT NOT NULL DEFAULT 1,
      total_amount DECIMAL(12, 2) NOT NULL,        -- Snapshot of price * quantity
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
          CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED')),
      activation_date DATE NOT NULL,               -- Ticket effective start date
      expires_at DATETIME2 NOT NULL,               -- 15-minute payment countdown deadline
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  ```
- **Constraints & Indexes**:
  - `CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED'))`
  - `idx_orders_status` on `orders(status)`
  - `idx_orders_code` on `orders(order_code)`
  - `idx_orders_user` on `orders(user_id)`
  - `idx_orders_route` on `orders(route_id)`
- **Cascade Rule**:
  - All FKs (`user_id`, `ticket_type_id`, `route_id`) strictly use **`NO ACTION`**.

#### 3.9 `complaints` — Phản ánh & Khiếu nại hành khách
- **Purpose**: Feedback submitted by passengers or guests, reviewed and resolved by Admin.
- **DDL**:
  ```sql
  CREATE TABLE complaints (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      user_id UNIQUEIDENTIFIER REFERENCES users(id),          -- NULL if guest (NO ACTION)
      route_id UNIQUEIDENTIFIER REFERENCES bus_routes(id),    -- Optional route (NO ACTION)
      category VARCHAR(100) NOT NULL,
      content NVARCHAR(MAX) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'NEW'
          CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  ```
- **Constraints & Indexes**:
  - `CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED'))`
  - `idx_complaints_status` on `complaints(status)`
  - `idx_complaints_user` on `complaints(user_id)`
  - `idx_complaints_route` on `complaints(route_id)`
- **Cascade Rule**:
  - Both FKs (`user_id`, `route_id`) use **`NO ACTION`**.

---

### Level 2 Tables

#### 3.10 `tickets` — Vé xe buýt điện tử
- **Purpose**: Individual issued tickets containing signed cryptographic QR JWT, lifecycle state, and inspector verification audit fields.
- **DDL**:
  ```sql
  CREATE TABLE tickets (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      order_id UNIQUEIDENTIFIER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id), -- NO ACTION
      ticket_code VARCHAR(50) NOT NULL UNIQUE,     -- Unique lookup code (e.g. TK...)
      qr_payload NVARCHAR(MAX) NOT NULL,           -- Cryptographically signed JWT string
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED')),
      valid_from DATETIME2 NOT NULL,
      valid_until DATETIME2 NOT NULL,
      used_at DATETIME2,                           -- Timestamp when inspector validated
      used_by_inspector_id UNIQUEIDENTIFIER REFERENCES users(id), -- NO ACTION
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  ```
- **Cascade Rule**:
  - `order_id`: **`ON DELETE CASCADE`** (Allowed & required: parent order owns child tickets).
  - `route_id`: **`NO ACTION`** (Critical: prevents multiple cascade paths from `bus_routes`).
  - `used_by_inspector_id`: **`NO ACTION`** (Critical: prevents multiple cascade paths from `users`).
- **Indexes**:
  - `idx_tickets_status` on `tickets(status)`
  - `idx_tickets_code` on `tickets(ticket_code)`
  - `idx_tickets_order` on `tickets(order_id)`
  - `idx_tickets_route` on `tickets(route_id)`
  - `idx_tickets_user` on `tickets(used_by_inspector_id)` (FK to inspector)

#### 3.11 `payment_transactions` — Nhật ký đối soát SePay Webhook
- **Purpose**: Immutable audit log of incoming bank transfer webhook notifications received from SePay.
- **DDL**:
  ```sql
  CREATE TABLE payment_transactions (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      order_id UNIQUEIDENTIFIER REFERENCES orders(id), -- NO ACTION
      sepay_reference_code VARCHAR(100),
      transfer_amount DECIMAL(12, 2) NOT NULL,
      raw_content NVARCHAR(MAX),
      raw_payload NVARCHAR(MAX),                   -- JSON string, queryable via ISJSON()
      processed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  ```
- **Cascade Rule**:
  - `order_id`: **`NO ACTION`** (Audit trail must be preserved or blocked from cascade deletion).
- **Indexes**:
  - `idx_payment_tx_order` on `payment_transactions(order_id)`
  - `idx_transactions_order` on `payment_transactions(order_id)` (Explicitly required by dispatch)

---

## 4. Deep Analysis of SQL Server Cascade Rules (Error 1785 Prevention)

### 4.1 SQL Server Error 1785 Root Cause
In Microsoft SQL Server, cascading referential actions (`ON DELETE CASCADE` / `ON UPDATE CASCADE`) must satisfy the strict condition that a target table cannot receive a cascade delete through more than one path from any source table, nor can there be referential cycles:
> *Msg 1785, Level 16, State 0: Introducing FOREIGN KEY constraint 'FK_...' on table '...' may cause cycles or multiple cascade paths. Specify ON DELETE NO ACTION or ON UPDATE NO ACTION, or modify other FOREIGN KEY constraints.*

### 4.2 Comprehensive Foreign Key & Cascade Action Audit (13 FKs)

| # | Foreign Key Constraint | Source Table & Column | Target Table & Column | Specified Action | Error 1785 Prevention Justification |
|---|------------------------|-----------------------|-----------------------|------------------|--------------------------------------|
| 1 | `FK_route_stops_route` | `route_stops.route_id` | `bus_routes.id` | **`ON DELETE CASCADE`** | Single direct ownership path. No diamond dependency. |
| 2 | `FK_route_stops_stop` | `route_stops.stop_id` | `bus_stops.id` | **`NO ACTION`** | Deleting a physical bus stop must not cascade delete route stop sequences or routes. |
| 3 | `FK_schedules_route` | `schedules.route_id` | `bus_routes.id` | **`NO ACTION`** | Deleting a route must not trigger unmanaged schedule deletion without route validation. |
| 4 | `FK_schedules_bus` | `schedules.bus_id` | `buses.id` | **`NO ACTION`** | Buses are physical fleet vehicles. Deleting a bus does not cascade delete timetable slots. |
| 5 | `FK_orders_user` | `orders.user_id` | `users.id` | **`NO ACTION`** | Prevents cascade diamond to `tickets`. Guest checkout orders also have `user_id = NULL`. |
| 6 | `FK_orders_ticket_type` | `orders.ticket_type_id` | `ticket_types.id` | **`NO ACTION`** | Modifying/deleting fare types cannot cascade delete historical financial orders. |
| 7 | `FK_orders_route` | `orders.route_id` | `bus_routes.id` | **`NO ACTION`** | Prevents cascade diamond from `bus_routes` to `tickets` (Path A: route -> order -> tickets; Path B: route -> tickets). |
| 8 | `FK_tickets_order` | `tickets.order_id` | `orders.id` | **`ON DELETE CASCADE`** | Direct parent-child ownership. Deleting an order removes its generated tickets. |
| 9 | `FK_tickets_route` | `tickets.route_id` | `bus_routes.id` | **`NO ACTION`** | **CRITICAL**: If this were CASCADE, deleting a route would reach `tickets` via two distinct paths (`bus_routes -> orders -> tickets` AND `bus_routes -> tickets`). SQL Server would reject table creation with Error 1785! |
| 10 | `FK_tickets_inspector` | `tickets.used_by_inspector_id` | `users.id` | **`NO ACTION`** | **CRITICAL**: If `orders.user_id` and `tickets.used_by_inspector_id` were CASCADE, deleting a user would reach `tickets` via two paths (`users -> orders -> tickets` AND `users -> tickets`). |
| 11 | `FK_payment_tx_order` | `payment_transactions.order_id` | `orders.id` | **`NO ACTION`** | Financial transaction logs must remain immutable for audit accounting. |
| 12 | `FK_complaints_user` | `complaints.user_id` | `users.id` | **`NO ACTION`** | User deletion must not silently purge customer service records. |
| 13 | `FK_complaints_route` | `complaints.route_id` | `bus_routes.id` | **`NO ACTION`** | Deleting a route must not purge historical complaint records. |

### 4.3 Empirical Verification
The above 13 constraints were executed and validated on the host Microsoft SQL Server 2025 instance. Querying `sys.foreign_keys`:
- **Total foreign keys**: 13
- **`delete_referential_action_desc = 'CASCADE'`**: Exactly 2 (`route_stops.route_id` and `tickets.order_id`)
- **`delete_referential_action_desc = 'NO_ACTION'`**: Exactly 11
- Result: **0 errors, 100% compliant**.

---

## 5. Indexes Design & Query Mapping

The index layout directly optimizes the core REST APIs defined in `PROJECT.md` and `thiet-ke-he-thong-xe-buyt.md`:

| Table | Index Name | Indexed Columns | API / Workflow Rationale |
|---|---|---|---|
| `users` | `idx_users_email` | `(email)` | `POST /api/auth/login`, `POST /api/auth/register` (email uniqueness & lookup) |
| `users` | `idx_users_role` | `(role)` | Inspector/Admin role filtering |
| `bus_stops` | `idx_bus_stops_coords` | `(latitude, longitude)` | `GET /api/routes/search` (Haversine geospatial bounding box) |
| `route_stops` | `idx_route_stops_route` | `(route_id)` | `GET /api/routes/:id` (Ordered sequence timeline) |
| `route_stops` | `idx_route_stops_stop` | `(stop_id)` | `GET /api/stops/:id/routes` (Lines serving a specific stop) |
| `schedules` | `idx_schedules_route` | `(route_id)` | `GET /api/routes/:id` (Timetable departures) |
| `schedules` | `idx_schedules_bus` | `(bus_id)` | Fleet dispatch validation |
| `orders` | `idx_orders_status` | `(status)` | Lazy expiration & Admin order filter (`PENDING`, `PAID`) |
| `orders` | `idx_orders_code` | `(order_code)` | `POST /api/webhooks/sepay` (Instant order lookup from payment memo) |
| `orders` | `idx_orders_user` | `(user_id)` | `GET /api/tickets/me` (Joining orders by authenticated user) |
| `orders` | `idx_orders_route` | `(route_id)` | Admin dashboard route revenue aggregation |
| `tickets` | `idx_tickets_status` | `(status)` | `GET /api/tickets/me?status=ACTIVE` |
| `tickets` | `idx_tickets_code` | `(ticket_code)` | `POST /api/tickets/verify` (Manual code verification fallback) |
| `tickets` | `idx_tickets_order` | `(order_id)` | Cascade delete lookup & order-to-ticket joining |
| `tickets` | `idx_tickets_route` | `(route_id)` | Route ticketing analytics |
| `tickets` | `idx_tickets_user` | `(used_by_inspector_id)` | Inspector shift verification history (`GET /api/inspector/history`) |
| `payment_transactions` | `idx_payment_tx_order` | `(order_id)` | SePay order payment history |
| `payment_transactions` | `idx_transactions_order`| `(order_id)` | Explicit requirement from dispatch |
| `complaints` | `idx_complaints_status` | `(status)` | `GET /api/admin/complaints?status=NEW` |
| `complaints` | `idx_complaints_user` | `(user_id)` | User feedback history |
| `complaints` | `idx_complaints_route` | `(route_id)` | Route service quality complaints |

---

## 6. Automated Migration / Init Script Architecture (`scripts/init-db.js`)

### 6.1 Dual-Engine Architecture
To ensure zero friction during Milestone 1 execution:
1. **Engine A (`mssql` / `tedious`)**: When executed after `npm install`, the script connects via connection pool, creates database `bus_ticketing_system` if absent, executes DDL statements, and reports progress.
2. **Engine B (`sqlcmd` CLI Fallback)**: If executed prior to `npm install`, the script generates a temporary idempotent script and executes `sqlcmd -S localhost,1433 -U vivu_admin -P VivuAdmin@2026! -C -i ...`.

### 6.2 Idempotent Execution Strategy
- Database:
  ```sql
  IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'bus_ticketing_system')
  BEGIN
      CREATE DATABASE [bus_ticketing_system];
  END
  ```
- Tables:
  ```sql
  IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '<table>' AND type = 'U')
  BEGIN
      CREATE TABLE <table> (...);
  END
  ```
- Indexes:
  ```sql
  IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = '<idx_name>' AND object_id = OBJECT_ID('<table>'))
  BEGIN
      CREATE INDEX <idx_name> ON <table>(...);
  END
  ```

### 6.3 Standalone Artifacts Created
In the agent working directory:
1. `proposed_init-db.js` — The complete Node.js initialization script.
2. `proposed_schema.sql` — Pure idempotent T-SQL DDL file.

Both files are validated and ready to be placed into `scripts/init-db.js` and `scripts/schema.sql` by Worker M1.

---

## 7. Next Steps for Worker M1

When Worker M1 executes Milestone 1:
1. Copy `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2/proposed_init-db.js` to `d:/DangQuangTung/Vivu/scripts/init-db.js`.
2. Copy `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2/proposed_schema.sql` to `d:/DangQuangTung/Vivu/scripts/schema.sql`.
3. Add `"db:init": "node scripts/init-db.js"` to `package.json` scripts.
4. Execute `node scripts/init-db.js` (or `npm run db:init`).
5. Run Explorer M1.3's seed script `node scripts/seed.js`.
6. Run Explorer M1.3's verification script `node scripts/verify-db.js`.
