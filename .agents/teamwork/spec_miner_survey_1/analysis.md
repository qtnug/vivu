# Vivu Bus Platform — Backend, Database, APIs & Business Logic Specification

**Spec Miner**: `spec_miner_survey_1` (teamwork_preview_spec_miner)  
**Date**: 2026-10-02  
**Authoritative Reference**: `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` & `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md`

---

## 1. Executive Summary

This document contains the complete technical specification for the Backend, Database, REST APIs, Security, VietQR Payment Engine, Ticket Lifecycle, and Inspector Verification Logic of the **Vivu** Electronic Bus Ticketing & Management Platform ("Nền tảng Quản lý Xe Buýt & Bán vé Điện tử Vivu").

The platform is designed around Vietnamese urban bus transit principles:
- **No seat reservation** (vé không chọn chỗ).
- **Static routing and simulated timetables** based on scheduled departure times and average speeds (no real-time GPS hardware dependency).
- **Single payment gateway**: SePay automated bank transfer reconciliation via VietQR and webhooks.
- **Three distinct operational roles**: Hành khách (`passenger`), Nhân viên soát vé (`inspector`), Quản trị viên (`admin`).

---

## 2. Complete Database Architecture & DDL (SQL Server / T-SQL)

The database engine is **Microsoft SQL Server**.
Key T-SQL mapping rules:
1. **Primary Keys**: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()`.
2. **Enumerations**: SQL Server does not have native ENUM types; implemented via `VARCHAR(...)` with `CHECK` constraints.
3. **Timestamps**: `DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()`.
4. **JSON Payloads**: `NVARCHAR(MAX)` queried via `ISJSON()` and `JSON_VALUE()`.
5. **Cascade Path Prevention**: SQL Server forbids multiple cascade paths on a single table. Only direct parent-child ownership (`route_stops.route_id` and `tickets.order_id`) uses `ON DELETE CASCADE`. All other foreign keys use `NO ACTION` (default). Deletion of master data with active child records is blocked at the application level.

### 2.1 Entity Relationship Diagram (Textual Representation)

```
users (1) ───────────< orders (N)
users (1) ───────────< tickets (N) [used_by_inspector_id]
users (1) ───────────< complaints (N)

bus_routes (1) ──────< route_stops (N) >────────── (1) bus_stops
bus_routes (1) ──────< schedules (N)   >────────── (1) buses
bus_routes (1) ──────< orders (N)
bus_routes (1) ──────< tickets (N)
bus_routes (1) ──────< complaints (N)

ticket_types (1) ────< orders (N)

orders (1) ──────────< tickets (N) [ON DELETE CASCADE]
orders (1) ──────────< payment_transactions (N)
```

---

### 2.2 Table Schemas (DDL & Column Attributes)

#### 1. `users` — Tài khoản người dùng & nhân viên
Stores user accounts across all three roles, plus student status and guest flag.
```sql
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    full_name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) UNIQUE,                  -- NULL if guest checkout
    phone NVARCHAR(20) UNIQUE,                   -- Required for verification
    password_hash NVARCHAR(255),                 -- NULL if guest checkout
    role VARCHAR(20) NOT NULL DEFAULT 'passenger'
        CHECK (role IN ('passenger', 'inspector', 'admin')),
    is_student BIT NOT NULL DEFAULT 0,           -- Flag for student discount eligibility
    is_active BIT NOT NULL DEFAULT 1,            -- Account active/locked status
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### 2. `bus_routes` — Tuyến xe buýt
Stores bus routes with directional orientation.
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

#### 3. `bus_stops` — Trạm dừng xe buýt
Stores physical stop locations with geographic coordinates.
```sql
CREATE TABLE bus_stops (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    stop_name NVARCHAR(255) NOT NULL,
    address NVARCHAR(500),
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_bus_stops_coords ON bus_stops(latitude, longitude);
```

#### 4. `route_stops` — Thứ tự trạm theo từng tuyến
Maps bus stops to bus routes with sequential ordering and cumulative distances.
```sql
CREATE TABLE route_stops (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    stop_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_stops(id), -- NO ACTION
    stop_sequence INT NOT NULL,                  -- 1-based order index
    distance_from_start_km DECIMAL(6, 2) NOT NULL DEFAULT 0,
    CONSTRAINT uq_route_sequence UNIQUE (route_id, stop_sequence)
);
CREATE INDEX idx_route_stops_route ON route_stops(route_id);
```

#### 5. `buses` — Phương tiện xe buýt
Stores physical bus vehicles and seating/standing capacity.
```sql
CREATE TABLE buses (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    license_plate VARCHAR(20) NOT NULL UNIQUE,   -- e.g. "29B-123.45"
    capacity INT NOT NULL,                       -- Total vehicle passenger capacity
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

#### 6. `schedules` — Lịch trình xuất bến tĩnh
Defines daily departure timetables and estimated average speed.
```sql
CREATE TABLE schedules (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),
    bus_id UNIQUEIDENTIFIER REFERENCES buses(id),
    departure_time TIME(0) NOT NULL,             -- e.g. "06:00:00"
    average_speed_kmh DECIMAL(5, 2) NOT NULL DEFAULT 20.0,
    days_of_week VARCHAR(20) NOT NULL DEFAULT 'MON-SUN', -- e.g. "MON-FRI"
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_schedules_route ON schedules(route_id);
```

#### 7. `ticket_types` — Bảng giá & loại vé
Catalog of ticketing products including discounts and validity windows.
```sql
CREATE TABLE ticket_types (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    category VARCHAR(20) NOT NULL
        CHECK (category IN ('SINGLE_RIDE', 'DAILY_PASS', 'MONTHLY_PASS')),
    name NVARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,               -- Price in VND
    validity_hours INT,                          -- for SINGLE_RIDE (e.g. 2h) / DAILY_PASS (e.g. 24h)
    validity_days INT,                           -- for MONTHLY_PASS (e.g. 30 days)
    is_student_price BIT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1
);
```

#### 8. `orders` — Đơn hàng mua vé
Tracks purchase transactions, countdown expiration, and guest checkout details.
```sql
CREATE TABLE orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_code VARCHAR(30) NOT NULL UNIQUE,      -- Used as VietQR payment memo (e.g. DH261002...)
    user_id UNIQUEIDENTIFIER REFERENCES users(id), -- NULL if guest checkout
    guest_phone VARCHAR(20),                     -- Required if user_id is NULL
    ticket_type_id UNIQUEIDENTIFIER NOT NULL REFERENCES ticket_types(id),
    route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),
    quantity INT NOT NULL DEFAULT 1,
    total_amount DECIMAL(12, 2) NOT NULL,        -- Calculated as price * quantity snapshot
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED')),
    activation_date DATE NOT NULL,               -- Date the ticket starts validity
    expires_at DATETIME2 NOT NULL,               -- Payment countdown deadline (15 minutes)
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_code ON orders(order_code);
CREATE INDEX idx_orders_user ON orders(user_id);
```

#### 9. `tickets` — Vé xe buýt điện tử
Individual issued tickets with cryptographic QR payload and lifecycle state.
```sql
CREATE TABLE tickets (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),
    ticket_code VARCHAR(50) NOT NULL UNIQUE,     -- Unique ticket code (e.g. TK-...)
    qr_payload NVARCHAR(MAX) NOT NULL,           -- Cryptographically signed JWT string
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED')),
    valid_from DATETIME2 NOT NULL,
    valid_until DATETIME2 NOT NULL,
    used_at DATETIME2,                           -- Timestamp when inspector validated
    used_by_inspector_id UNIQUEIDENTIFIER REFERENCES users(id),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_code ON tickets(ticket_code);
CREATE INDEX idx_tickets_order ON tickets(order_id);
```

#### 10. `payment_transactions` — Nhật ký đối soát SePay Webhook
Immutable audit log of all incoming bank transfer notifications from SePay.
```sql
CREATE TABLE payment_transactions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER REFERENCES orders(id),
    sepay_reference_code VARCHAR(100),           -- SePay transaction reference ID
    transfer_amount DECIMAL(12, 2) NOT NULL,     -- Amount credited
    raw_content NVARCHAR(MAX),                   -- Raw bank transfer memo
    raw_payload NVARCHAR(MAX),                   -- Complete incoming JSON string
    processed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_payment_tx_order ON payment_transactions(order_id);
```

#### 11. `complaints` — Phản ánh & khiếu nại của hành khách
Stores feedback submitted by passengers or guests, reviewed by Admin.
```sql
CREATE TABLE complaints (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER REFERENCES users(id), -- NULL if guest
    route_id UNIQUEIDENTIFIER REFERENCES bus_routes(id), -- Optional related route
    category VARCHAR(100) NOT NULL,              -- Service quality, vehicle, driver, etc.
    content NVARCHAR(MAX) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW'
        CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

---

### 2.3 Required Initial Seed Data

Authoritative initial seed data defined in the specification:

```sql
-- 1. Default Admin and Inspector accounts (passwords hashed with bcrypt)
INSERT INTO users (id, full_name, email, password_hash, role, is_student, is_active) VALUES
('00000000-0000-0000-0000-000000000001', N'Quản trị viên', 'admin@busticket.vn', '$2b$10$HASHEDPASSWORDADMIN', 'admin', 0, 1),
('00000000-0000-0000-0000-000000000002', N'Nguyễn Văn Soát', 'inspector1@busticket.vn', '$2b$10$HASHEDPASSWORDINSP', 'inspector', 0, 1);

-- 2. Master Route: Tuyến 01 Hà Nội (Long Biên - Hà Đông)
INSERT INTO bus_routes (id, route_code, route_name, direction, description, is_active) VALUES
('11111111-1111-1111-1111-111111111111', '01', N'Bến xe Long Biên - Bến xe Hà Đông', 'FORWARD', N'Tuyến trung tâm nội thành Hà Nội', 1);

-- 3. Master Bus Stops (5 key stops)
INSERT INTO bus_stops (id, stop_name, address, latitude, longitude) VALUES
('a1111111-1111-1111-1111-111111111111', N'Bến xe Long Biên', N'Q. Ba Đình, Hà Nội', 21.0423, 105.8550),
('a2222222-1111-1111-1111-111111111111', N'Hồ Hoàn Kiếm', N'Q. Hoàn Kiếm, Hà Nội', 21.0285, 105.8542),
('a3333333-1111-1111-1111-111111111111', N'Ga Hà Nội', N'Q. Hoàn Kiếm, Hà Nội', 21.0245, 105.8412),
('a4444444-1111-1111-1111-111111111111', N'Ngã Tư Sở', N'Q. Đống Đa, Hà Nội', 20.9999, 105.8217),
('a5555555-1111-1111-1111-111111111111', N'Bến xe Hà Đông', N'Q. Hà Đông, Hà Nội', 20.9718, 105.7772);

-- 4. Route Stop Mapping (ordered sequence with cumulative distances)
INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km) VALUES
('11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 1, 0.0),
('11111111-1111-1111-1111-111111111111', 'a2222222-1111-1111-1111-111111111111', 2, 2.5),
('11111111-1111-1111-1111-111111111111', 'a3333333-1111-1111-1111-111111111111', 3, 4.8),
('11111111-1111-1111-1111-111111111111', 'a4444444-1111-1111-1111-111111111111', 4, 8.2),
('11111111-1111-1111-1111-111111111111', 'a5555555-1111-1111-1111-111111111111', 5, 12.6);

-- 5. Buses
INSERT INTO buses (id, license_plate, capacity, is_active) VALUES
('b1111111-1111-1111-1111-111111111111', '29B-123.45', 60, 1),
('b2222222-1111-1111-1111-111111111111', '29B-678.90', 60, 1);

-- 6. Schedule
INSERT INTO schedules (route_id, bus_id, departure_time, average_speed_kmh, days_of_week) VALUES
('11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', '06:00:00', 18.5, 'MON-SUN');

-- 7. Standard Bus Ticket Types (5 standard pricing tiers)
INSERT INTO ticket_types (id, category, name, price, validity_hours, validity_days, is_student_price, is_active) VALUES
('t1111111-1111-1111-1111-111111111111', 'SINGLE_RIDE', N'Vé lượt - Thường', 7000.00, 2, NULL, 0, 1),
('t2222222-1111-1111-1111-111111111111', 'SINGLE_RIDE', N'Vé lượt - Học sinh/Sinh viên', 3000.00, 2, NULL, 1, 1),
('t3333333-1111-1111-1111-111111111111', 'DAILY_PASS', N'Vé ngày', 30000.00, 24, NULL, 0, 1),
('t4444444-1111-1111-1111-111111111111', 'MONTHLY_PASS', N'Vé tháng - Thường', 200000.00, NULL, 30, 0, 1),
('t5555555-1111-1111-1111-111111111111', 'MONTHLY_PASS', N'Vé tháng - Học sinh/Sinh viên', 100000.00, NULL, 30, 1, 1);
```

---

## 3. Authentication, Security & Role-Based Access Control

### 3.1 Token Strategy
- **Access Token**: JWT containing `{ userId, email, role, fullName }`, short expiration (e.g. 15 to 60 minutes).
- **Refresh Token**: Stored or cryptographically signed with longer expiration (e.g. 7 days).
- **Password Protection**: Passwords hashed with `bcrypt` (salt rounds: 10).
- **Unified Login**: A single endpoint `POST /api/auth/login` services all three roles. Role segregation is enforced through JWT role claims (`role: 'passenger' | 'inspector' | 'admin'`).

### 3.2 Role Matrix

| Endpoint Scope | Guest | Passenger | Inspector | Admin |
|---|---|---|---|---|
| View Routes, Stops, Timetables | Allowed | Allowed | Allowed | Allowed |
| Search Routes by GPS Coordinates | Allowed | Allowed | Allowed | Allowed |
| Create Order (Buy Tickets) | Allowed (guestPhone required) | Allowed (linked to userId) | Allowed | Allowed |
| Check Order Status (Polling) | Allowed | Allowed | Allowed | Allowed |
| Look Up Tickets | Allowed (`orderCode` + `phone`) | Allowed | Allowed | Allowed |
| View "My Tickets" (`/api/tickets/me`) | Forbidden | Allowed | Allowed | Allowed |
| Submit Complaint | Allowed | Allowed | Allowed | Allowed |
| SePay Webhook | Forbidden (Only SePay Apikey) | Forbidden | Forbidden | Forbidden |
| Verify & Scan Ticket (`/verify`) | Forbidden | Forbidden | Allowed | Allowed |
| Admin CRUD (Routes, Stops, Buses, Schedules, Tickets) | Forbidden | Forbidden | Forbidden | Allowed |
| Admin Staff Management | Forbidden | Forbidden | Forbidden | Allowed |
| Admin Dashboard Analytics | Forbidden | Forbidden | Forbidden | Allowed |
| Admin Complaint Management | Forbidden | Forbidden | Forbidden | Allowed |

---

## 4. Comprehensive REST API Specifications

### Standardized Error Format
All API error responses must adhere strictly to the JSON contract:
```json
{
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | ORDER_EXPIRED | AMOUNT_MISMATCH",
    "message": "Human-readable descriptive Vietnamese explanation"
  }
}
```

---

### 4.1 Authentication Endpoints (`/api/auth`)

#### `POST /api/auth/register`
- **Description**: Registers a new passenger user account.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "fullName": "Trần Văn Bình",
    "email": "binh@example.com",
    "phone": "0987654321",
    "password": "SecurePassword123"
  }
  ```
- **Validation**:
  - `email`: valid format, unique in `users`.
  - `phone`: valid Vietnamese phone, unique in `users`.
  - `password`: length >= 8 characters.
  - `fullName`: non-empty string.
- **Response (201 Created)**:
  ```json
  {
    "user": {
      "id": "e4f8...",
      "fullName": "Trần Văn Bình",
      "email": "binh@example.com",
      "phone": "0987654321",
      "role": "passenger",
      "isStudent": false,
      "isActive": true,
      "createdAt": "2026-10-02T12:00:00Z"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Errors**:
  - `400 VALIDATION_ERROR`: Missing fields or invalid format.
  - `409 CONFLICT`: Email or phone already registered.

#### `POST /api/auth/login`
- **Description**: Authenticates users for all 3 roles using email or phone + password.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@busticket.vn",
    "password": "Password123"
  }
  ```
  *(or `{ "phone": "0987654321", "password": "..." }`)*
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "00000000-0000-0000-0000-000000000001",
      "fullName": "Quản trị viên",
      "email": "admin@busticket.vn",
      "phone": null,
      "role": "admin",
      "isStudent": false,
      "isActive": true
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Errors**:
  - `401 UNAUTHORIZED`: Invalid credentials.
  - `403 FORBIDDEN`: Account locked (`is_active = false`).

#### `POST /api/auth/refresh`
- **Description**: Exchanges a valid refresh token for a fresh access token.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "accessToken": "eyJhbGciOi..."
  }
  ```
- **Errors**:
  - `401 UNAUTHORIZED`: Invalid or expired refresh token.

---

### 4.2 Bus Routes & Stops Endpoints (`/api/routes`)

#### `GET /api/routes`
- **Description**: Retrieves active bus routes.
- **Access**: Public
- **Query Parameters**:
  - `search` (optional string): filters by `route_code` or `route_name`.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "routeCode": "01",
      "routeName": "Bến xe Long Biên - Bến xe Hà Đông",
      "direction": "FORWARD",
      "description": "Tuyến trung tâm nội thành Hà Nội",
      "stopCount": 5,
      "isActive": true
    }
  ]
  ```

#### `GET /api/routes/:id`
- **Description**: Returns detailed route information including ordered stops and static timetable.
- **Access**: Public
- **Response (200 OK)**:
  ```json
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "routeCode": "01",
    "routeName": "Bến xe Long Biên - Bến xe Hà Đông",
    "direction": "FORWARD",
    "description": "Tuyến trung tâm nội thành Hà Nội",
    "stops": [
      {
        "id": "a1111111-1111-1111-1111-111111111111",
        "stopName": "Bến xe Long Biên",
        "address": "Q. Ba Đình, Hà Nội",
        "latitude": 21.0423,
        "longitude": 105.8550,
        "stopSequence": 1,
        "distanceFromStartKm": 0.0
      },
      {
        "id": "a2222222-1111-1111-1111-111111111111",
        "stopName": "Hồ Hoàn Kiếm",
        "address": "Q. Hoàn Kiếm, Hà Nội",
        "latitude": 21.0285,
        "longitude": 105.8542,
        "stopSequence": 2,
        "distanceFromStartKm": 2.5
      }
    ],
    "schedules": [
      {
        "id": "...",
        "busId": "b1111111-1111-1111-1111-111111111111",
        "licensePlate": "29B-123.45",
        "departureTime": "06:00:00",
        "averageSpeedKmh": 18.5,
        "daysOfWeek": "MON-SUN"
      }
    ]
  }
  ```
- **Errors**:
  - `404 NOT_FOUND`: Route does not exist or inactive.

#### `GET /api/routes/search`
- **Description**: Suggests bus routes connecting two geographic coordinate points.
- **Access**: Public
- **Query Parameters**:
  - `fromLat` (number), `fromLng` (number)
  - `toLat` (number), `toLng` (number)
- **Algorithm**:
  1. Searches for nearest bus stops within ~500m radius of `(fromLat, fromLng)` and `(toLat, toLng)`.
  2. Queries `route_stops` for routes containing both stops such that `fromStop.stopSequence < toStop.stopSequence`.
  3. Calculates estimated distance: `deltaDistance = toStop.distanceFromStartKm - fromStop.distanceFromStartKm`.
  4. Calculates estimated transit time: `timeMinutes = (deltaDistance / averageSpeedKmh) * 60`.
- **Response (200 OK)**:
  ```json
  [
    {
      "route": {
        "id": "11111111-1111-1111-1111-111111111111",
        "routeCode": "01",
        "routeName": "Bến xe Long Biên - Bến xe Hà Đông"
      },
      "fromStop": {
        "id": "a1111111-1111-1111-1111-111111111111",
        "stopName": "Bến xe Long Biên",
        "stopSequence": 1
      },
      "toStop": {
        "id": "a3333333-1111-1111-1111-111111111111",
        "stopName": "Ga Hà Nội",
        "stopSequence": 3
      },
      "distanceKm": 4.8,
      "estimatedDurationMinutes": 16
    }
  ]
  ```
- **Edge Case**: If no matching route is found, returns `[]` (empty list) with HTTP 200 (never 404/400).

---

### 4.3 Orders & Payment Endpoints (`/api/orders`)

#### `POST /api/orders`
- **Description**: Creates a new ticket order in `PENDING` status. Supports both authenticated passenger and guest checkout.
- **Access**: Public / Authenticated
- **Headers**: Optional `Authorization: Bearer <JWT>`
- **Request Body**:
  ```json
  {
    "ticketTypeId": "t1111111-1111-1111-1111-111111111111",
    "routeId": "11111111-1111-1111-1111-111111111111",
    "quantity": 2,
    "activationDate": "2026-10-02",
    "guestPhone": "0987654321"
  }
  ```
- **Validation**:
  - `ticketTypeId` must exist and be active.
  - `routeId` must exist and be active.
  - `quantity` >= 1.
  - `activationDate` cannot be in the past.
  - If no JWT provided: `guestPhone` is mandatory. If JWT provided: `userId` extracted from token.
- **Processing**:
  - `totalAmount = ticketType.price * quantity`.
  - Generates unique `orderCode` (format: `DH` + timestamp + 4 random chars, e.g. `DH202610029876`).
  - Sets `expiresAt = SYSUTCDATETIME() + 15 minutes`.
  - Sets `status = 'PENDING'`.
- **Response (201 Created)**:
  ```json
  {
    "order": {
      "id": "c1a2...",
      "orderCode": "DH202610029876",
      "userId": null,
      "guestPhone": "0987654321",
      "ticketTypeId": "t1111111-1111-1111-1111-111111111111",
      "routeId": "11111111-1111-1111-1111-111111111111",
      "quantity": 2,
      "totalAmount": 14000.00,
      "status": "PENDING",
      "activationDate": "2026-10-02",
      "expiresAt": "2026-10-02T12:45:00Z",
      "createdAt": "2026-10-02T12:30:00Z"
    },
    "payment": {
      "bankName": "Vietcombank",
      "accountNumber": "0123456789",
      "accountHolder": "CONG TY XE BUYT VIVU",
      "totalAmount": 14000.00,
      "orderCode": "DH202610029876",
      "expiresAt": "2026-10-02T12:45:00Z",
      "qrUrl": "https://img.vietqr.io/image/VCB-0123456789-compact2.png?amount=14000&addInfo=DH202610029876&accountName=CONG%20TY%20XE%20BUYT%20VIVU"
    }
  }
  ```

#### `GET /api/orders/:id`
- **Description**: Fetches order status, actively used for polling on payment screen.
- **Access**: Public / Order Owner
- **Lazy Expiry Logic**: If `status === 'PENDING'` and `currentTime > expiresAt`, the server immediately updates the database row to `EXPIRED` before returning the response.
- **Response (200 OK)**:
  ```json
  {
    "id": "c1a2...",
    "orderCode": "DH202610029876",
    "status": "PAID",
    "totalAmount": 14000.00,
    "quantity": 2,
    "expiresAt": "2026-10-02T12:45:00Z",
    "createdAt": "2026-10-02T12:30:00Z"
  }
  ```

#### `POST /api/orders/:id/regenerate`
- **Description**: Re-creates a payment order for an expired or cancelled order without mutating order history.
- **Access**: Public / Order Owner
- **Processing**:
  - Verifies that target order has status `EXPIRED` or `CANCELLED`.
  - Re-reads current active price for `ticketTypeId`.
  - Inserts a new order record with identical parameters, fresh `orderCode`, new 15-minute countdown.
- **Response (201 Created)**: Fresh order and payment details.
- **Errors**:
  - `400 VALIDATION_ERROR`: Order is already `PAID` or currently active `PENDING`.

---

### 4.4 SePay Webhook Endpoint (`POST /api/webhooks/sepay`)

- **Description**: Server-to-server webhook endpoint invoked by SePay upon successful bank transfer credit.
- **Security**: Must validate request header `Authorization: Apikey <SEPAY_API_TOKEN>`. Rejects unauthorized calls with 401/403.
- **Incoming SePay Payload**:
  ```json
  {
    "id": 987654,
    "gateway": "Vietcombank",
    "transactionDate": "2026-10-02 12:35:00",
    "accountNumber": "0123456789",
    "subAccount": null,
    "transferType": "in",
    "transferAmount": 14000,
    "accumulated": 5000000,
    "code": null,
    "transactionContent": "DH202610029876 chuyen tien ve xe",
    "referenceCode": "FT261002987654",
    "description": "SePay webhook notification"
  }
  ```

#### Step-by-Step Processing Pipeline:
1. **Header Authentication**: Check `Authorization: Apikey <SEPAY_API_TOKEN>`. Return 401 if missing/invalid.
2. **Order Code Extraction**: Parse `transactionContent` (or `content`) using regex pattern `/(DH[A-Za-z0-9]+)/i`. If no code found, return 400.
3. **Order Lookup**: Find order in DB where `order_code = extractedCode`. If not found, log warning and return 404.
4. **Idempotency Guarantee**:
   - Check `order.status`.
   - If `order.status === 'PAID'`, return HTTP 200 `{ "message": "OK" }` immediately. Do NOT create duplicate tickets or transactions.
5. **Amount Verification**:
   - Verify `transferAmount === order.total_amount`.
   - If mismatch: Insert record into `payment_transactions` with discrepancy note. Update order status or leave pending. Return 400 `AMOUNT_MISMATCH`.
6. **Payment Expiration Check**:
   - If `SYSUTCDATETIME() > order.expires_at`: Update order status to `EXPIRED`, insert transaction audit record, return 400 `ORDER_EXPIRED`.
7. **Atomic State Transition & Ticket Generation (Database Transaction)**:
   - Update `orders`: `status = 'PAID'`, `updated_at = SYSUTCDATETIME()`.
   - Insert into `payment_transactions`: `order_id`, `sepay_reference_code`, `transfer_amount`, `raw_content`, `raw_payload`.
   - Loop `order.quantity` times and generate `tickets`:
     - Generate unique `ticket_code` (e.g. `TK-` + uppercase nanoid / timestamp hash).
     - Calculate validity timestamps:
       - `valid_from`: Start of `order.activation_date` (or purchase timestamp).
       - If `SINGLE_RIDE`: `valid_until = valid_from + ticket_type.validity_hours` (e.g. +2 hours).
       - If `DAILY_PASS`: `valid_until = valid_from + ticket_type.validity_hours` (e.g. +24 hours / end of calendar day).
       - If `MONTHLY_PASS`: `valid_until = valid_from + ticket_type.validity_days` (e.g. +30 days).
     - Construct and cryptographically sign JWT payload for QR code:
       ```json
       {
         "sub": "<ticketId>",
         "ticketCode": "<ticketCode>",
         "orderCode": "<orderCode>",
         "routeId": "<routeId>",
         "category": "<category>",
         "validFrom": "<validFrom>",
         "validUntil": "<validUntil>",
         "type": "BUS_TICKET"
       }
       ```
     - Insert record into `tickets` table with `status = 'ACTIVE'`.
8. **Real-time Event Emission**: Trigger SSE / WebSocket event notifying waiting client of payment success.
9. **Webhook Acknowledgment**: Return HTTP 200 `{ "message": "OK" }`.

---

### 4.5 Electronic Tickets Endpoints (`/api/tickets`)

#### `GET /api/tickets/me`
- **Description**: Returns all tickets owned by the authenticated passenger.
- **Access**: Passenger (`role: 'passenger'`)
- **Query Parameters**:
  - `status` (optional: `ACTIVE`, `USED`, `EXPIRED`, `CANCELLED`).
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "7a8b...",
      "ticketCode": "TK-8493021",
      "routeId": "11111111-1111-1111-1111-111111111111",
      "routeCode": "01",
      "routeName": "Bến xe Long Biên - Bến xe Hà Đông",
      "category": "SINGLE_RIDE",
      "status": "ACTIVE",
      "validFrom": "2026-10-02T06:00:00Z",
      "validUntil": "2026-10-02T08:00:00Z",
      "qrPayload": "eyJhbGciOi...",
      "usedAt": null
    }
  ]
  ```

#### `GET /api/tickets/lookup`
- **Description**: Allows guest passengers to look up purchased tickets using order code and phone number.
- **Access**: Public
- **Query Parameters**:
  - `orderCode` (required string)
  - `phone` (required string)
- **Response (200 OK)**:
  ```json
  {
    "order": {
      "orderCode": "DH202610029876",
      "guestPhone": "0987654321",
      "status": "PAID"
    },
    "tickets": [
      {
        "id": "7a8b...",
        "ticketCode": "TK-8493021",
        "routeCode": "01",
        "routeName": "Bến xe Long Biên - Bến xe Hà Đông",
        "category": "SINGLE_RIDE",
        "status": "ACTIVE",
        "validFrom": "2026-10-02T06:00:00Z",
        "validUntil": "2026-10-02T08:00:00Z",
        "qrPayload": "eyJhbGciOi..."
      }
    ]
  }
  ```
- **Errors**:
  - `404 NOT_FOUND`: No matching order found for phone number.

#### `GET /api/tickets/:id`
- **Description**: Returns full ticket details including QR code image format (data URL).
- **Access**: Ticket Owner / Guest verified / Inspector / Admin
- **Response (200 OK)**: Ticket entity + rendered QR code data URL.

#### `POST /api/tickets/verify` (Inspector Ticket Validation)
- **Description**: Inspector validates passenger tickets via QR payload or manual code input.
- **Access**: Inspector (`role: 'inspector'`)
- **Headers**: `Authorization: Bearer <INSPECTOR_JWT>`
- **Request Body**:
  ```json
  {
    "qrPayload": "eyJhbGciOi..."
  }
  ```
  *(or `{ "ticketCode": "TK-8493021" }` for manual fallback)*
- **Inspector Verification Logic**:
  1. **Payload Extraction**:
     - If `qrPayload` provided: verify cryptographic signature using `TICKET_JWT_SECRET`. If signature invalid, corrupted, or tampered: return HTTP 200 `{ "valid": false, "reason": "Mã QR không hợp lệ" }`.
     - Extract `ticketCode` from verified token claims.
     - If manual `ticketCode` provided: use code directly.
  2. **Database Lookup**:
     - Query `tickets` table by `ticket_code`.
     - If record does not exist: return HTTP 200 `{ "valid": false, "reason": "Mã vé không tồn tại" }`.
  3. **Usage Check**:
     - If `ticket.status === 'USED'`: return HTTP 200 `{ "valid": false, "reason": "Vé đã được sử dụng", "usedAt": ticket.used_at }`.
  4. **Expiration & Validity Window Check**:
     - If `SYSUTCDATETIME() > ticket.valid_until`: return HTTP 200 `{ "valid": false, "reason": "Vé đã hết hạn" }`.
     - If `SYSUTCDATETIME() < ticket.valid_from`: return HTTP 200 `{ "valid": false, "reason": "Vé chưa đến thời gian hiệu lực" }`.
     - If `ticket.status === 'CANCELLED'`: return HTTP 200 `{ "valid": false, "reason": "Vé đã bị huỷ" }`.
  5. **Validation & State Transition**:
     - If status is `ACTIVE` and current time is within window:
       - Update `tickets`:
         - `status = 'USED'`
         - `used_at = SYSUTCDATETIME()`
         - `used_by_inspector_id = req.user.id`
       - Return HTTP 200:
         ```json
         {
           "valid": true,
           "ticket": {
             "id": "7a8b...",
             "ticketCode": "TK-8493021",
             "routeName": "Bến xe Long Biên - Bến xe Hà Đông",
             "routeCode": "01",
             "category": "SINGLE_RIDE",
             "validFrom": "2026-10-02T06:00:00Z",
             "validUntil": "2026-10-02T08:00:00Z",
             "usedAt": "2026-10-02T07:15:22Z"
           }
         }
         ```
- **Important Design Principle**: The endpoint ALWAYS responds with HTTP status 200 for business validation results. Invalid, expired, or already used tickets are normal transit business outcomes, NOT server errors.

---

### 4.6 Complaints Endpoints (`/api/complaints`)

#### `POST /api/complaints`
- **Description**: Submits a feedback/complaint from passenger or guest.
- **Access**: Public / Authenticated Passenger
- **Request Body**:
  ```json
  {
    "category": "Chất lượng phục vụ",
    "content": "Xe chạy đúng giờ nhưng điều hòa hơi nóng.",
    "routeId": "11111111-1111-1111-1111-111111111111"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "f2a1...",
    "category": "Chất lượng phục vụ",
    "content": "Xe chạy đúng giờ nhưng điều hòa hơi nóng.",
    "status": "NEW",
    "createdAt": "2026-10-02T12:00:00Z"
  }
  ```

#### `GET /api/admin/complaints`
- **Description**: Admin lists and filters complaints.
- **Access**: Admin (`role: 'admin'`)
- **Query Parameters**: `?status=NEW|IN_PROGRESS|RESOLVED&routeId=`
- **Response (200 OK)**: Array of complaint objects with user and route join details.

#### `PUT /api/admin/complaints/:id`
- **Description**: Updates complaint processing status.
- **Access**: Admin (`role: 'admin'`)
- **Request Body**:
  ```json
  {
    "status": "RESOLVED"
  }
  ```
- **Response (200 OK)**: Updated complaint.

---

### 4.7 Admin Management Endpoints (`/api/admin/...`)

All endpoints in this group require `Authorization: Bearer <JWT>` with claim `role: 'admin'`.

#### 1. Bus Routes Management
- `GET /api/admin/routes` — Full route inventory including inactive routes.
- `POST /api/admin/routes` — Create new route (`{ routeCode, routeName, direction, description }`).
- `PUT /api/admin/routes/:id` — Update route attributes.
- `DELETE /api/admin/routes/:id` — Delete route.
  - **Business Constraint**: If active orders or valid tickets exist for this route, delete is forbidden. Returns HTTP `409 CONFLICT` advising to soft-disable via `is_active = false`.

#### 2. Bus Stops Management
- `GET /api/admin/stops` — Full stop catalog.
- `POST /api/admin/stops` — Create stop (`{ stopName, address, latitude, longitude }`).
- `PUT /api/admin/stops/:id` — Update stop.
- `DELETE /api/admin/stops/:id` — Delete stop.

#### 3. Route Stop Ordering
- `POST /api/admin/routes/:id/stops` — Attach a stop to route (`{ stopId, stopSequence, distanceFromStartKm }`).
- `PUT /api/admin/routes/:id/stops/reorder` — Reorder stops on a route.
  - Request Body: `{ stopIds: string[] }` (ordered list of stop IDs).
  - Processing: Updates `stop_sequence` sequentially (1..N) and recomputes cumulative distances.

#### 4. Buses Management
- `GET /api/admin/buses` — Vehicle catalog.
- `POST /api/admin/buses` — Register vehicle (`{ licensePlate, capacity }`).
- `PUT /api/admin/buses/:id` — Update vehicle details or status.
- `DELETE /api/admin/buses/:id` — Decommission vehicle.

#### 5. Schedules Management
- `GET /api/admin/schedules` — Timetable schedule list.
- `POST /api/admin/schedules` — Create departure schedule (`{ routeId, busId, departureTime, averageSpeedKmh, daysOfWeek }`).
  - **Validation**: Cannot schedule conflicting departure times for the same bus vehicle.
- `PUT /api/admin/schedules/:id` — Update schedule.
- `DELETE /api/admin/schedules/:id` — Delete schedule.

#### 6. Ticket Types & Pricing Management
- `GET /api/admin/ticket-types` — Full pricing catalog.
- `POST /api/admin/ticket-types` — Create ticket product (`{ category, name, price, validityHours, validityDays, isStudentPrice }`).
- `PUT /api/admin/ticket-types/:id` — Update product details or price.
  - **Business Invariant**: Modifying ticket price only affects future orders; existing orders maintain their locked snapshot `total_amount`.
- `DELETE /api/admin/ticket-types/:id` — Soft-disable ticket type (`is_active = false`).

#### 7. Inspector Staff Management
- `GET /api/admin/staff` — List inspector accounts.
- `POST /api/admin/staff` — Create new inspector account (`{ fullName, email, phone, password }`). Role is automatically assigned as `inspector`. (There is NO public registration for inspectors).
- `PUT /api/admin/staff/:id` — Toggle inspector account lock/unlock (`{ isActive: boolean }`).

#### 8. Orders & Transactions Audit
- `GET /api/admin/orders` — Filter orders by status (`?status=`), date range (`?fromDate=&toDate=`), or route (`?routeId=`).
- `GET /api/admin/payment-transactions` — View SePay webhook transaction audit logs.

#### 9. Analytics Dashboard
- `GET /api/admin/dashboard`
- **Aggregated Metrics**:
  - Revenue summary: Today, this week, this month (sum of `total_amount` for orders where `status = 'PAID'`).
  - Ticket sales count (total tickets issued from paid orders).
  - Active routes count (`COUNT(*)` where `is_active = 1`).
  - Top routes by revenue.
  - Peak passenger/order hours distribution (hourly histogram based on `orders.created_at`).

---

## 5. VietQR Dynamic Payment Engine & SePay Webhook Idempotency

### 5.1 VietQR Dynamic Generation Formula
The VietQR payload is generated dynamically on the server:
- **Banking Standard**: Napas 247 QuickLink standard.
- **URL Schema**:
  ```
  https://img.vietqr.io/image/<BANK_BIN>-<ACCOUNT_NUMBER>-<TEMPLATE>.png?amount=<TOTAL_AMOUNT>&addInfo=<ORDER_CODE>&accountName=<ACCOUNT_NAME>
  ```
- **Example Parameters**:
  - Bank BIN: `970436` (Vietcombank)
  - Account Number: `0123456789`
  - Account Name: `CONG TY XE BUYT VIVU`
  - Amount: `14000`
  - Memo (`addInfo`): `DH202610029876`

### 5.2 Payment Lifecycle State Machine
```
   [User selects ticket]
            │
            ▼
   ┌─────────────────┐
   │ status: PENDING │ ── (Timer > 15 mins) ──> ┌──────────────────┐
   └─────────────────┘                           │ status: EXPIRED  │
            │                                    └──────────────────┘
            │ (SePay Webhook match)                        │
            ▼                                              │ (Regenerate API)
   ┌─────────────────┐                                     ▼
   │  status: PAID   │                            ┌──────────────────┐
   └─────────────────┘                            │ New Order PENDING│
            │                                     └──────────────────┘
            ▼
   [Generate Tickets]
```

### 5.3 Webhook Idempotency & Concurrency Safety
1. **Network Retries**: SePay re-sends webhooks if it does not receive an immediate HTTP 200 response or if network timeouts occur.
2. **Idempotent Guard**:
   ```typescript
   const existingOrder = await db.orders.findUnique({ where: { orderCode } });
   if (existingOrder.status === 'PAID') {
     // Idempotency hit: Already processed
     return res.status(200).json({ message: "OK", idempotent: true });
   }
   ```
3. **Database Transaction**:
   ```typescript
   await db.$transaction(async (tx) => {
     // 1. Lock order row
     // 2. Transition status to PAID
     // 3. Record payment_transaction
     // 4. Create N tickets
   });
   ```

---

## 6. Ticket Lifecycle, JWT QR Token Architecture & Inspector Verification Engine

### 6.1 Cryptographic JWT QR Token Format
Each ticket generated upon successful payment receives a unique signed JWT string:
- **Algorithm**: HMAC with SHA-256 (`HS256`).
- **Secret Key**: `TICKET_JWT_SECRET` (configured via server environment variable).
- **Payload Schema**:
  ```json
  {
    "sub": "7a8b9c0d-1111-2222-3333-444455556666",
    "ticketCode": "TK-8493021",
    "orderCode": "DH202610029876",
    "routeId": "11111111-1111-1111-1111-111111111111",
    "routeCode": "01",
    "category": "SINGLE_RIDE",
    "validFrom": "2026-10-02T06:00:00Z",
    "validUntil": "2026-10-02T08:00:00Z",
    "iat": 1759406400,
    "exp": 1759413600
  }
  ```

### 6.2 Ticket State Machine

```
   [Webhook generates ticket]
                │
                ▼
       ┌──────────────────┐
       │  status: ACTIVE  │
       └──────────────────┘
          │             │
(Inspector scans)  (Now > validUntil)
          │             │
          ▼             ▼
┌─────────────────┐  ┌──────────────────┐
│  status: USED   │  │ status: EXPIRED  │
└─────────────────┘  └──────────────────┘
```

### 6.3 Inspector Validation Engine Rules

| Condition | Verification Result | Reason Output |
|---|---|---|
| JWT signature invalid / corrupt | `valid: false` | `"Mã QR không hợp lệ"` |
| `ticketCode` not found in DB | `valid: false` | `"Mã vé không tồn tại"` |
| `ticket.status === 'USED'` | `valid: false` | `"Vé đã được sử dụng"` |
| `ticket.status === 'CANCELLED'` | `valid: false` | `"Vé đã bị huỷ"` |
| `currentTime > ticket.valid_until` | `valid: false` | `"Vé đã hết hạn"` |
| `currentTime < ticket.valid_from` | `valid: false` | `"Vé chưa đến thời gian hiệu lực"` |
| `ticket.status === 'ACTIVE'` within time window | `valid: true` | Ticket verified, status updated to `USED` |

---

## 7. Business Rules & Domain Invariants

1. **No Seat Allocation**:
   - Tickets are general admission transit passes. No seat numbering, seat selection, or bus vehicle capacity reservation is performed during purchase.
2. **Guest Purchase Phone Binding**:
   - If a customer buys tickets without an account, `guestPhone` is mandatory. Tickets can be retrieved anytime using `orderCode` and `phone`.
3. **Order Expiration Window**:
   - All unpaid orders expire strictly after 15 minutes. No payment can be applied after expiration.
4. **Historical Price Immortality**:
   - Updates to ticket prices in `ticket_types` do NOT alter past or pending orders. `orders.total_amount` is an immutable financial snapshot.
5. **No Route Hard Delete with Active Dependents**:
   - Bus routes with active tickets or pending orders cannot be deleted (returns 409 Conflict); they must be deactivated via `is_active = false`.
6. **Strict Inspector Provisioning**:
   - Inspector accounts can only be created by an Admin. Public registration is restricted to passenger roles.
7. **Single Gateway & No Auto Refund**:
   - The platform strictly integrates SePay VietQR bank transfer. No automatic credit card refund is implemented (refunds, if any, are handled manually out-of-band).

---

## 8. Features Discovered Table

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Auth | Passenger Registration | Registers new user account with role `passenger` | `fullName`, `email`, `phone`, `password` | User object, access token, refresh token | 400 validation, 409 email/phone conflict | `thiet-ke-he-thong-xe-buyt.md` §6.1 |
| 2 | Auth | Unified Login | Authenticates Passenger, Inspector, or Admin | `email`/`phone`, `password` | User profile with role claim, tokens | 401 invalid credentials, 403 locked account | `thiet-ke-he-thong-xe-buyt.md` §6.1 |
| 3 | Auth | Token Refresh | Generates fresh access token from refresh token | `refreshToken` | New `accessToken` | 401 token expired/invalid | `thiet-ke-he-thong-xe-buyt.md` §6.1 |
| 4 | Routes | Active Route Listing | Lists active bus routes with search filter | Query `search` | Array of route summaries with stop counts | Returns empty list if no matches | `thiet-ke-he-thong-xe-buyt.md` §6.2 |
| 5 | Routes | Route Details & Timetable | Returns full route details, ordered stops, timetable | Route ID | Route info, stops in order, schedules | 404 if route not found or inactive | `thiet-ke-he-thong-xe-buyt.md` §6.2 |
| 6 | Routes | Coordinate Route Search | Finds routes between two coordinates within ~500m | `fromLat`, `fromLng`, `toLat`, `toLng` | Matched routes with pickup/dropoff stops, ETA | Returns `[]` with expand hint if none found | `thiet-ke-he-thong-xe-buyt.md` §6.2 |
| 7 | Orders | Create Ticket Order | Initiates purchase for guest or logged in user | `ticketTypeId`, `routeId`, `quantity`, `activationDate`, `guestPhone?` | Order object, VietQR payment instructions | 400 validation error | `thiet-ke-he-thong-xe-buyt.md` §6.3 |
| 8 | Orders | Order Status Polling | Retrieves status with lazy expiration update | Order ID | Order status, total amount, expiresAt | 404 if not found; auto updates EXPIRED | `thiet-ke-he-thong-xe-buyt.md` §6.3 |
| 9 | Orders | Regenerate Payment | Creates fresh order clone for expired orders | Order ID | New order object with fresh 15m timer | 400 if order is already PAID or active | `thiet-ke-he-thong-xe-buyt.md` §6.3 |
| 10 | Payment | SePay Webhook Handler | Processes incoming bank transfer notifications | SePay payload, Apikey header | 200 OK | 401 unauth, 400 mismatch/expired, 404 not found | `thiet-ke-he-thong-xe-buyt.md` §6.3 |
| 11 | Payment | Webhook Idempotency | Discards duplicate webhook events for paid orders | SePay duplicate payload | 200 OK immediately | No side effects, duplicate tickets prevented | `thiet-ke-he-thong-xe-buyt.md` §6.3 |
| 12 | Tickets | "My Tickets" Listing | Lists tickets for logged in passenger | Query `status` | Array of ticket entities with route details | 401 unauthorized | `thiet-ke-he-thong-xe-buyt.md` §6.4 |
| 13 | Tickets | Guest Ticket Lookup | Allows guests to retrieve tickets | Query `orderCode`, `phone` | Order info and array of issued tickets | 404 not found or phone mismatch | `thiet-ke-he-thong-xe-buyt.md` §6.4 |
| 14 | Tickets | Ticket Detail & QR View | Displays ticket and renders QR code image | Ticket ID | Ticket data with base64 QR payload | 404 not found, 403 forbidden | `thiet-ke-he-thong-xe-buyt.md` §6.4 |
| 15 | Inspector | Ticket QR Verification | Validates QR code via JWT verification & DB state | `qrPayload` or `ticketCode` | `{ valid: boolean, ticket?, reason? }` | Always 200; returns specific reason | `thiet-ke-he-thong-xe-buyt.md` §6.4 |
| 16 | Feedback | Submit Complaint | Submits passenger complaint | `category`, `content`, `routeId?` | Created complaint object with status NEW | 400 validation error | `thiet-ke-he-thong-xe-buyt.md` §6.5 |
| 17 | Feedback | Admin Complaint Review | Lists and updates complaint status | Query params, status update body | Complaint list or updated complaint | 403 forbidden if not admin | `thiet-ke-he-thong-xe-buyt.md` §6.5 |
| 18 | Admin | Route CRUD | Full lifecycle management of bus routes | Route payload | Route entity | 409 conflict if deleting active route | `thiet-ke-he-thong-xe-buyt.md` §6.6 |
| 19 | Admin | Stop CRUD | Manages physical bus stop coordinates | Stop payload | Stop entity | 400 validation error | `thiet-ke-he-thong-xe-buyt.md` §6.6 |
| 20 | Admin | Route Stop Sequencing | Reorders stops and recalculates distance | `stopIds[]` array | Updated route stop mapping | 400 invalid stop list | `thiet-ke-he-thong-xe-buyt.md` §6.6 |
| 21 | Admin | Bus Vehicle CRUD | Manages bus vehicle inventory | License plate, capacity | Bus entity | 409 duplicate license plate | `thiet-ke-he-thong-xe-buyt.md` §6.6 |
| 22 | Admin | Schedule Timetable CRUD | Manages scheduled bus departures | Route ID, Bus ID, departure time | Schedule entity | 400 overlapping departure for same bus | `thiet-ke-he-thong-xe-buyt.md` §6.6 |
| 23 | Admin | Ticket Pricing CRUD | Configures ticket products and pricing tiers | Category, price, validity window | Ticket type entity | Locked prices for past orders | `thiet-ke-he-thong-xe-buyt.md` §6.6 |
| 24 | Admin | Inspector Staff CRUD | Admin creates/locks inspector accounts | Inspector user payload, `isActive` toggle | Inspector account | 409 email conflict | `thiet-ke-he-thong-xe-buyt.md` §6.6 |
| 25 | Admin | Order & Transaction Audit | Filters orders and views SePay raw webhooks | Status, date range, route filters | Order and transaction logs | 403 forbidden | `thiet-ke-he-thong-xe-buyt.md` §6.6 |
| 26 | Admin | Analytics Dashboard | Aggregated metrics on revenue and ticket sales | None | Revenue summary, top routes, peak hours | 403 forbidden | `thiet-ke-he-thong-xe-buyt.md` §6.6 |

---

## 9. Comprehensive Edge Cases Table

| # | Feature | Input / Trigger | Observed & Expected System Behavior |
|---|---|---|---|
| 1 | Auth Registration | Existing email or phone number submitted | Returns HTTP 409 `CONFLICT` with clear Vietnamese error message. |
| 2 | Auth Login | Inactive account (`is_active = false`) attempts login | Returns HTTP 403 `FORBIDDEN` indicating account has been locked. |
| 3 | Route Search | Coordinates outside any stop's 500m radius | Returns HTTP 200 with empty array `[]` and guidance to expand search radius. |
| 4 | Route Search | User chooses origin and destination in reverse sequence on forward route | Route is excluded from results; only routes matching `fromSeq < toSeq` are returned. |
| 5 | Order Creation | Unauthenticated user omits `guestPhone` | Returns HTTP 400 `VALIDATION_ERROR` stating phone number is required for guest checkout. |
| 6 | Order Creation | User selects past `activationDate` | Returns HTTP 400 `VALIDATION_ERROR` stating activation date cannot be in the past. |
| 7 | Order Polling | Polling order after 15-minute countdown has expired | Lazy expiry updates order status to `EXPIRED` in DB and returns `status: "EXPIRED"`. |
| 8 | Order Regeneration | User requests regeneration on an already `PAID` order | Returns HTTP 400 `VALIDATION_ERROR` as paid orders cannot be regenerated. |
| 9 | SePay Webhook | Webhook arrives with missing or wrong `Authorization` Apikey | Returns HTTP 401 `UNAUTHORIZED` immediately without inspecting body. |
| 10 | SePay Webhook | Bank transfer content contains unrecognized order code | Returns HTTP 404 `NOT_FOUND` and logs transaction for manual investigation. |
| 11 | SePay Webhook | Bank transfer amount is less than or greater than `total_amount` | Returns HTTP 400 `AMOUNT_MISMATCH`, logs to `payment_transactions`, order remains pending. |
| 12 | SePay Webhook | Payment arrives after order `expires_at` has passed | Returns HTTP 400 `ORDER_EXPIRED`, order marked `EXPIRED`, logged to `payment_transactions`. |
| 13 | SePay Webhook | Duplicate webhook received for already `PAID` order | Returns HTTP 200 `{ message: "OK" }` immediately; skips duplicate ticket generation. |
| 14 | Ticket Verification | Inspector scans corrupted or invalid QR code | Returns HTTP 200 `{ valid: false, reason: "Mã QR không hợp lệ" }`. |
| 15 | Ticket Verification | Inspector scans QR code of an already `USED` ticket | Returns HTTP 200 `{ valid: false, reason: "Vé đã được sử dụng", usedAt: "..." }`. |
| 16 | Ticket Verification | Inspector scans ticket after `valid_until` timestamp | Returns HTTP 200 `{ valid: false, reason: "Vé đã hết hạn" }`. |
| 17 | Ticket Verification | Inspector manually enters non-existent `ticketCode` | Returns HTTP 200 `{ valid: false, reason: "Mã vé không tồn tại" }`. |
| 18 | Admin Route Deletion | Admin attempts to hard delete route with active tickets | Returns HTTP 409 `CONFLICT` requesting admin to set `is_active = false` instead. |
| 19 | Admin Price Update | Admin changes ticket type price while pending orders exist | Pending and past orders preserve their original `total_amount` snapshot. |
| 20 | Admin Schedule Config | Admin assigns duplicate departure time to same bus vehicle | Returns HTTP 400 `VALIDATION_ERROR` preventing vehicle double-booking. |

---

## 10. Architectural Recommendations for Implementation

1. **ORM & Database Driver**:
   - Utilize Prisma ORM with `@prisma/client` and SQL Server connector (`provider = "sqlserver"`).
   - Ensure SQL Server schemas cleanly map `UNIQUEIDENTIFIER` to `@default(uuid())` or `@default(dbgenerated("NEWID()"))`.
2. **Environment Variables Contract**:
   - `DATABASE_URL`: `sqlserver://<HOST>:<PORT>;database=bus_ticketing_system;user=<USER>;password=<PWD>;encrypt=true;trustServerCertificate=true;`
   - `JWT_SECRET`: Secret for user authentication tokens.
   - `JWT_REFRESH_SECRET`: Secret for user refresh tokens.
   - `TICKET_JWT_SECRET`: Dedicated secret for signing passenger ticket QR JWTs.
   - `SEPAY_API_TOKEN`: Secret token matching the incoming SePay webhook authorization header.
   - `SEPAY_BANK_NAME`, `SEPAY_ACCOUNT_NO`, `SEPAY_ACCOUNT_HOLDER`: Used to construct VietQR payment links.
3. **Data Integrity & Seeding Strategy**:
   - Include automated DB migration scripts and an idempotent seed script (`prisma/seed.ts` or T-SQL seed script) that loads the exact seed data specified in Section 2.3.
