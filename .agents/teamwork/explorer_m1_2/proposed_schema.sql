-- =====================================================================
-- Vivu Platform - SQL Server DDL Schema Blueprint (Milestone 1)
-- Database: bus_ticketing_system
-- Engine: Microsoft SQL Server 2025 / Azure SQL / SQL Server Express
--
-- Strict Cascade Rules:
-- 1. route_stops.route_id -> bus_routes(id) [ON DELETE CASCADE]
-- 2. tickets.order_id     -> orders(id)     [ON DELETE CASCADE]
-- All other foreign keys use NO ACTION to prevent SQL Server Error 1785.
-- =====================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'bus_ticketing_system')
BEGIN
    CREATE DATABASE bus_ticketing_system;
END;
GO

USE bus_ticketing_system;
GO

-- =====================================================================
-- 1. USERS (Tài khoản người dùng, nhân viên soát vé, quản trị viên)
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users' AND type = 'U')
BEGIN
    CREATE TABLE users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        full_name NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) UNIQUE,                  -- NULL nếu là guest checkout
        phone NVARCHAR(20) UNIQUE,                   -- Định danh liên lạc
        password_hash NVARCHAR(255),                 -- NULL nếu là guest checkout
        role VARCHAR(20) NOT NULL DEFAULT 'passenger'
            CHECK (role IN ('passenger', 'inspector', 'admin')),
        is_student BIT NOT NULL DEFAULT 0,           -- Cờ ưu đãi học sinh/sinh viên
        is_active BIT NOT NULL DEFAULT 1,            -- Trạng thái kích hoạt tài khoản
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_email' AND object_id = OBJECT_ID('users'))
BEGIN
    CREATE INDEX idx_users_email ON users(email);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_role' AND object_id = OBJECT_ID('users'))
BEGIN
    CREATE INDEX idx_users_role ON users(role);
END;
GO

-- =====================================================================
-- 2. BUS_ROUTES (Tuyến xe buýt)
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bus_routes' AND type = 'U')
BEGIN
    CREATE TABLE bus_routes (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        route_code VARCHAR(20) NOT NULL UNIQUE,      -- vd: "01", "02"
        route_name NVARCHAR(255) NOT NULL,
        direction VARCHAR(10) NOT NULL CHECK (direction IN ('FORWARD', 'BACKWARD')),
        description NVARCHAR(MAX),
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_bus_routes_code' AND object_id = OBJECT_ID('bus_routes'))
BEGIN
    CREATE INDEX idx_bus_routes_code ON bus_routes(route_code);
END;
GO

-- =====================================================================
-- 3. BUS_STOPS (Trạm dừng xe buýt)
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bus_stops' AND type = 'U')
BEGIN
    CREATE TABLE bus_stops (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        stop_name NVARCHAR(255) NOT NULL,
        address NVARCHAR(500),
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_bus_stops_coords' AND object_id = OBJECT_ID('bus_stops'))
BEGIN
    CREATE INDEX idx_bus_stops_coords ON bus_stops(latitude, longitude);
END;
GO

-- =====================================================================
-- 4. ROUTE_STOPS (Thứ tự trạm theo tuyến)
-- Cascade: route_id CASCADE, stop_id NO ACTION
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'route_stops' AND type = 'U')
BEGIN
    CREATE TABLE route_stops (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
        stop_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_stops(id),  -- NO ACTION: tránh xung đột multiple cascade path
        stop_sequence INT NOT NULL,
        distance_from_start_km DECIMAL(6, 2) NOT NULL DEFAULT 0,
        CONSTRAINT uq_route_sequence UNIQUE (route_id, stop_sequence)
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_route_stops_route' AND object_id = OBJECT_ID('route_stops'))
BEGIN
    CREATE INDEX idx_route_stops_route ON route_stops(route_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_route_stops_stop' AND object_id = OBJECT_ID('route_stops'))
BEGIN
    CREATE INDEX idx_route_stops_stop ON route_stops(stop_id);
END;
GO

-- =====================================================================
-- 5. BUSES (Phương tiện xe buýt)
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'buses' AND type = 'U')
BEGIN
    CREATE TABLE buses (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        license_plate VARCHAR(20) NOT NULL UNIQUE,   -- vd: "29B-123.45"
        capacity INT NOT NULL,                       -- Sức chứa hành khách
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

-- =====================================================================
-- 6. SCHEDULES (Lịch chạy tĩnh)
-- Cascade: route_id NO ACTION, bus_id NO ACTION
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'schedules' AND type = 'U')
BEGIN
    CREATE TABLE schedules (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id), -- NO ACTION
        bus_id UNIQUEIDENTIFIER REFERENCES buses(id),                 -- NO ACTION
        departure_time TIME(0) NOT NULL,
        average_speed_kmh DECIMAL(5, 2) NOT NULL DEFAULT 20.0,
        days_of_week VARCHAR(20) NOT NULL DEFAULT 'MON-SUN',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_schedules_route' AND object_id = OBJECT_ID('schedules'))
BEGIN
    CREATE INDEX idx_schedules_route ON schedules(route_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_schedules_bus' AND object_id = OBJECT_ID('schedules'))
BEGIN
    CREATE INDEX idx_schedules_bus ON schedules(bus_id);
END;
GO

-- =====================================================================
-- 7. TICKET_TYPES (Bảng giá & Loại vé)
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ticket_types' AND type = 'U')
BEGIN
    CREATE TABLE ticket_types (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        category VARCHAR(20) NOT NULL
            CHECK (category IN ('SINGLE_RIDE', 'DAILY_PASS', 'MONTHLY_PASS')),
        name NVARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        validity_hours INT,                          -- SINGLE_RIDE (2h), DAILY_PASS (24h)
        validity_days INT,                           -- MONTHLY_PASS (30d)
        is_student_price BIT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1
    );
END;
GO

-- =====================================================================
-- 8. ORDERS (Đơn hàng mua vé)
-- Cascade: user_id NO ACTION, ticket_type_id NO ACTION, route_id NO ACTION
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'orders' AND type = 'U')
BEGIN
    CREATE TABLE orders (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        order_code VARCHAR(30) NOT NULL UNIQUE,      -- Mã đơn hàng dùng làm nội dung chuyển khoản
        user_id UNIQUEIDENTIFIER REFERENCES users(id), -- NULL nếu guest checkout (NO ACTION)
        guest_phone VARCHAR(20),                     -- Bắt buộc nếu user_id là NULL
        ticket_type_id UNIQUEIDENTIFIER NOT NULL REFERENCES ticket_types(id), -- NO ACTION
        route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),         -- NO ACTION
        quantity INT NOT NULL DEFAULT 1,
        total_amount DECIMAL(12, 2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
            CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED')),
        activation_date DATE NOT NULL,               -- Ngày bắt đầu hiệu lực vé
        expires_at DATETIME2 NOT NULL,               -- Hết hạn thanh toán VietQR (15 phút)
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_orders_status' AND object_id = OBJECT_ID('orders'))
BEGIN
    CREATE INDEX idx_orders_status ON orders(status);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_orders_code' AND object_id = OBJECT_ID('orders'))
BEGIN
    CREATE INDEX idx_orders_code ON orders(order_code);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_orders_user' AND object_id = OBJECT_ID('orders'))
BEGIN
    CREATE INDEX idx_orders_user ON orders(user_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_orders_route' AND object_id = OBJECT_ID('orders'))
BEGIN
    CREATE INDEX idx_orders_route ON orders(route_id);
END;
GO

-- =====================================================================
-- 9. TICKETS (Vé xe buýt điện tử)
-- Cascade: order_id ON DELETE CASCADE
--          route_id NO ACTION
--          used_by_inspector_id NO ACTION
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tickets' AND type = 'U')
BEGIN
    CREATE TABLE tickets (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        order_id UNIQUEIDENTIFIER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id), -- NO ACTION
        ticket_code VARCHAR(50) NOT NULL UNIQUE,     -- Mã tra cứu vé độc nhất
        qr_payload NVARCHAR(MAX) NOT NULL,           -- JWT đã ký mã hoá
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
            CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED')),
        valid_from DATETIME2 NOT NULL,
        valid_until DATETIME2 NOT NULL,
        used_at DATETIME2,                           -- Thời điểm quét vé thành công
        used_by_inspector_id UNIQUEIDENTIFIER REFERENCES users(id), -- NO ACTION
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tickets_status' AND object_id = OBJECT_ID('tickets'))
BEGIN
    CREATE INDEX idx_tickets_status ON tickets(status);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tickets_code' AND object_id = OBJECT_ID('tickets'))
BEGIN
    CREATE INDEX idx_tickets_code ON tickets(ticket_code);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tickets_order' AND object_id = OBJECT_ID('tickets'))
BEGIN
    CREATE INDEX idx_tickets_order ON tickets(order_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tickets_route' AND object_id = OBJECT_ID('tickets'))
BEGIN
    CREATE INDEX idx_tickets_route ON tickets(route_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tickets_user' AND object_id = OBJECT_ID('tickets'))
BEGIN
    CREATE INDEX idx_tickets_user ON tickets(used_by_inspector_id);
END;
GO

-- =====================================================================
-- 10. PAYMENT_TRANSACTIONS (Nhật ký đối soát webhook SePay)
-- Cascade: order_id NO ACTION
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'payment_transactions' AND type = 'U')
BEGIN
    CREATE TABLE payment_transactions (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        order_id UNIQUEIDENTIFIER REFERENCES orders(id), -- NO ACTION
        sepay_reference_code VARCHAR(100),
        transfer_amount DECIMAL(12, 2) NOT NULL,
        raw_content NVARCHAR(MAX),
        raw_payload NVARCHAR(MAX),                   -- JSON chuỗi gốc
        processed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_payment_tx_order' AND object_id = OBJECT_ID('payment_transactions'))
BEGIN
    CREATE INDEX idx_payment_tx_order ON payment_transactions(order_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_transactions_order' AND object_id = OBJECT_ID('payment_transactions'))
BEGIN
    CREATE INDEX idx_transactions_order ON payment_transactions(order_id);
END;
GO

-- =====================================================================
-- 11. COMPLAINTS (Phản ánh & khiếu nại hành khách)
-- Cascade: user_id NO ACTION, route_id NO ACTION
-- =====================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'complaints' AND type = 'U')
BEGIN
    CREATE TABLE complaints (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER REFERENCES users(id),          -- NO ACTION
        route_id UNIQUEIDENTIFIER REFERENCES bus_routes(id),    -- NO ACTION
        category VARCHAR(100) NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'NEW'
            CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_complaints_status' AND object_id = OBJECT_ID('complaints'))
BEGIN
    CREATE INDEX idx_complaints_status ON complaints(status);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_complaints_user' AND object_id = OBJECT_ID('complaints'))
BEGIN
    CREATE INDEX idx_complaints_user ON complaints(user_id);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_complaints_route' AND object_id = OBJECT_ID('complaints'))
BEGIN
    CREATE INDEX idx_complaints_route ON complaints(route_id);
END;
GO
