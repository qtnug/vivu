/**
 * Remote Database Migration & Setup Script for Vivu Web
 * Server: db71573.public.databaseasp.net
 * Database: db71573
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sql = require('mssql');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const config = {
  user: process.env.DB_USER || 'db71573',
  password: process.env.DB_PASSWORD || 'x+7SJ4e@3#Ma',
  server: process.env.DB_SERVER || 'db71573.public.databaseasp.net',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'db71573',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 15000 },
  connectionTimeout: 30000,
  requestTimeout: 120000,
};

function generateDeterministicUUID(input) {
  const hash = crypto.createHash('md5').update(input).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

async function migrateDatabase() {
  console.log('================================================================');
  console.log(`🔌 Kết nối tới CSDL: ${config.server} (DB: ${config.database})`);
  console.log('================================================================');

  let pool;
  try {
    pool = await sql.connect(config);
    console.log('✅ Kết nối thành công!\n');

    // 1. TẠO CÁC BẢNG (TABLES)
    console.log('[1/4] Đang tạo các bảng cơ sở dữ liệu...');

    // 1. users
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users' AND type = 'U')
      BEGIN
        CREATE TABLE users (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          full_name NVARCHAR(255) NOT NULL,
          email NVARCHAR(255) UNIQUE,
          phone NVARCHAR(20) UNIQUE,
          password_hash NVARCHAR(255),
          role VARCHAR(20) NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'inspector', 'admin')),
          is_student BIT NOT NULL DEFAULT 0,
          is_active BIT NOT NULL DEFAULT 1,
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END;
    `);

    // 2. bus_routes
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bus_routes' AND type = 'U')
      BEGIN
        CREATE TABLE bus_routes (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          route_code VARCHAR(20) NOT NULL UNIQUE,
          route_name NVARCHAR(255) NOT NULL,
          direction VARCHAR(10) NOT NULL CHECK (direction IN ('FORWARD', 'BACKWARD')),
          description NVARCHAR(MAX),
          is_active BIT NOT NULL DEFAULT 1,
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END;
    `);

    // 3. bus_stops
    await pool.request().query(`
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
    `);

    // 4. route_stops
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'route_stops' AND type = 'U')
      BEGIN
        CREATE TABLE route_stops (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
          stop_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_stops(id),
          stop_sequence INT NOT NULL,
          distance_from_start_km DECIMAL(6, 2) NOT NULL DEFAULT 0,
          CONSTRAINT uq_route_sequence UNIQUE (route_id, stop_sequence)
        );
      END;
    `);

    // 5. buses
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'buses' AND type = 'U')
      BEGIN
        CREATE TABLE buses (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          license_plate VARCHAR(20) NOT NULL UNIQUE,
          capacity INT NOT NULL,
          is_active BIT NOT NULL DEFAULT 1,
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END;
    `);

    // 6. schedules
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'schedules' AND type = 'U')
      BEGIN
        CREATE TABLE schedules (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),
          bus_id UNIQUEIDENTIFIER REFERENCES buses(id),
          departure_time TIME(0) NOT NULL,
          average_speed_kmh DECIMAL(5, 2) NOT NULL DEFAULT 18.5,
          days_of_week VARCHAR(20) NOT NULL DEFAULT 'MON-SUN',
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END;
    `);

    // 7. ticket_types
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ticket_types' AND type = 'U')
      BEGIN
        CREATE TABLE ticket_types (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          category VARCHAR(20) NOT NULL CHECK (category IN ('SINGLE_RIDE', 'DAILY_PASS', 'MONTHLY_PASS')),
          name NVARCHAR(100) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          validity_hours INT,
          validity_days INT,
          is_student_price BIT NOT NULL DEFAULT 0,
          is_active BIT NOT NULL DEFAULT 1
        );
      END;
    `);

    // 8. orders
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'orders' AND type = 'U')
      BEGIN
        CREATE TABLE orders (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          order_code VARCHAR(30) NOT NULL UNIQUE,
          user_id UNIQUEIDENTIFIER REFERENCES users(id),
          guest_phone VARCHAR(20),
          ticket_type_id UNIQUEIDENTIFIER NOT NULL REFERENCES ticket_types(id),
          route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),
          quantity INT NOT NULL DEFAULT 1,
          total_amount DECIMAL(12, 2) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED')),
          activation_date DATE NOT NULL,
          expires_at DATETIME2 NOT NULL,
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
          updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END;
    `);

    // 9. tickets
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tickets' AND type = 'U')
      BEGIN
        CREATE TABLE tickets (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          order_id UNIQUEIDENTIFIER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),
          ticket_code VARCHAR(50) NOT NULL UNIQUE,
          qr_payload NVARCHAR(MAX) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED')),
          valid_from DATETIME2 NOT NULL,
          valid_until DATETIME2 NOT NULL,
          used_at DATETIME2,
          used_by_inspector_id UNIQUEIDENTIFIER REFERENCES users(id),
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END;
    `);

    // 10. payment_transactions
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'payment_transactions' AND type = 'U')
      BEGIN
        CREATE TABLE payment_transactions (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          order_id UNIQUEIDENTIFIER REFERENCES orders(id),
          sepay_reference_code VARCHAR(100),
          transfer_amount DECIMAL(12, 2) NOT NULL,
          raw_content NVARCHAR(MAX),
          raw_payload NVARCHAR(MAX),
          processed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END;
    `);

    // 11. complaints
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'complaints' AND type = 'U')
      BEGIN
        CREATE TABLE complaints (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          user_id UNIQUEIDENTIFIER REFERENCES users(id),
          route_id UNIQUEIDENTIFIER REFERENCES bus_routes(id),
          category VARCHAR(100) NOT NULL,
          content NVARCHAR(MAX) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
          created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END;
    `);

    console.log('✅ Đã tạo đủ 11 bảng thành công!\n');

    // 2. TẠO INDEXES
    console.log('[2/4] Đang tạo các chỉ mục tìm kiếm tối ưu (Indexes)...');
    const indexQueries = [
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_email' AND object_id = OBJECT_ID('users')) CREATE INDEX idx_users_email ON users(email);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_role' AND object_id = OBJECT_ID('users')) CREATE INDEX idx_users_role ON users(role);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_bus_routes_code' AND object_id = OBJECT_ID('bus_routes')) CREATE INDEX idx_bus_routes_code ON bus_routes(route_code);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_bus_stops_coords' AND object_id = OBJECT_ID('bus_stops')) CREATE INDEX idx_bus_stops_coords ON bus_stops(latitude, longitude);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_route_stops_route' AND object_id = OBJECT_ID('route_stops')) CREATE INDEX idx_route_stops_route ON route_stops(route_id);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_route_stops_stop' AND object_id = OBJECT_ID('route_stops')) CREATE INDEX idx_route_stops_stop ON route_stops(stop_id);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_schedules_route' AND object_id = OBJECT_ID('schedules')) CREATE INDEX idx_schedules_route ON schedules(route_id);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_orders_status' AND object_id = OBJECT_ID('orders')) CREATE INDEX idx_orders_status ON orders(status);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_orders_code' AND object_id = OBJECT_ID('orders')) CREATE INDEX idx_orders_code ON orders(order_code);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tickets_status' AND object_id = OBJECT_ID('tickets')) CREATE INDEX idx_tickets_status ON tickets(status);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tickets_code' AND object_id = OBJECT_ID('tickets')) CREATE INDEX idx_tickets_code ON tickets(ticket_code);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tickets_order' AND object_id = OBJECT_ID('tickets')) CREATE INDEX idx_tickets_order ON tickets(order_id);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_payment_tx_order' AND object_id = OBJECT_ID('payment_transactions')) CREATE INDEX idx_payment_tx_order ON payment_transactions(order_id);`,
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_complaints_status' AND object_id = OBJECT_ID('complaints')) CREATE INDEX idx_complaints_status ON complaints(status);`,
    ];

    for (const q of indexQueries) {
      await pool.request().query(q);
    }
    console.log('✅ Đã tạo các chỉ mục thành công!\n');

    // 3. SEED DỮ LIỆU BAN ĐẦU
    console.log('[3/4] Đang nạp dữ liệu khởi tạo (Users, Ticket Types, Buses, Routes, Stops)...');

    // 3.1 Users
    const usersCount = await pool.request().query('SELECT COUNT(*) AS total FROM users');
    if (usersCount.recordset[0].total === 0) {
      await pool.request().query(`
        INSERT INTO users (id, full_name, email, phone, password_hash, role, is_student, is_active)
        VALUES
        ('11111111-1111-1111-1111-111111111111', N'Quản trị viên Hệ thống', 'admin@busticket.vn', '0901000001', '$2b$10$QjE1G8O3L3U0r8G5kZg.pe9v5Z7mY5p4r7.uFq8hU8v5Z7mY5p4r7', 'admin', 0, 1),
        ('22222222-2222-2222-2222-222222222222', N'Nguyễn Văn Soát (Tổ 1)', 'inspector1@busticket.vn', '0901000002', '$2b$10$QjE1G8O3L3U0r8G5kZg.pe9v5Z7mY5p4r7.uFq8hU8v5Z7mY5p4r7', 'inspector', 0, 1),
        ('33333333-3333-3333-3333-333333333333', N'Trần Thị Hành Khách', 'passenger@busticket.vn', '0901000003', '$2b$10$QjE1G8O3L3U0r8G5kZg.pe9v5Z7mY5p4r7.uFq8hU8v5Z7mY5p4r7', 'passenger', 0, 1);
      `);
      console.log('  • Đã nạp tài khoản Admin, Soát vé, Hành khách.');
    }

    // 3.2 Ticket Types
    const ttCount = await pool.request().query('SELECT COUNT(*) AS total FROM ticket_types');
    if (ttCount.recordset[0].total === 0) {
      await pool.request().query(`
        INSERT INTO ticket_types (id, category, name, price, validity_hours, validity_days, is_student_price, is_active)
        VALUES
        ('AA111111-1111-1111-1111-111111111111', 'SINGLE_RIDE', N'Vé lượt - 1 tuyến', 8000, 2, NULL, 0, 1),
        ('AA222222-2222-2222-2222-222222222222', 'SINGLE_RIDE', N'Vé lượt Học sinh / Sinh viên', 4000, 2, NULL, 1, 1),
        ('AA333333-3333-3333-3333-333333333333', 'SINGLE_RIDE', N'Vé liên tuyến (Đổi 2 chặng xe)', 16000, 4, NULL, 0, 1),
        ('AA444444-4444-4444-4444-444444444444', 'SINGLE_RIDE', N'Vé liên tuyến HSSV (Đổi 2 chặng)', 8000, 4, NULL, 1, 1),
        ('BB111111-1111-1111-1111-111111111111', 'DAILY_PASS', N'Vé ngày toàn mạng lưới', 40000, 24, NULL, 0, 1),
        ('CC111111-1111-1111-1111-111111111111', 'MONTHLY_PASS', N'Vé tháng 1 tuyến cố định', 100000, NULL, 30, 0, 1),
        ('CC222222-2222-2222-2222-222222222222', 'MONTHLY_PASS', N'Vé tháng 1 tuyến (Ưu đãi HSSV)', 55000, NULL, 30, 1, 1),
        ('CC333333-3333-3333-3333-333333333333', 'MONTHLY_PASS', N'Vé tháng liên tuyến (Toàn mạng lưới)', 200000, NULL, 30, 0, 1),
        ('CC444444-4444-4444-4444-444444444444', 'MONTHLY_PASS', N'Vé tháng liên tuyến (Ưu đãi HSSV)', 100000, NULL, 30, 1, 1);
      `);
      console.log('  • Đã nạp bảng giá và các loại vé.');
    }

    // 3.3 Buses
    const busesCount = await pool.request().query('SELECT COUNT(*) AS total FROM buses');
    if (busesCount.recordset[0].total === 0) {
      await pool.request().query(`
        INSERT INTO buses (id, license_plate, capacity, is_active)
        VALUES
        (NEWID(), '29B-101.23', 60, 1),
        (NEWID(), '29B-202.45', 80, 1),
        (NEWID(), '29B-303.67', 60, 1),
        (NEWID(), '29B-404.89', 80, 1);
      `);
      console.log('  • Đã nạp phương tiện xe buýt mẫu.');
    }

    // 3.4 Routes & Stops
    const routesCount = await pool.request().query('SELECT COUNT(*) AS total FROM bus_routes');
    const busData = require('../lib/bus-data.json');

    if (routesCount.recordset[0].total === 0) {
      console.log('  • Đang nạp 149 tuyến xe buýt Hà Nội...');
      for (const r of busData.bus_routes) {
        const req = pool.request();
        req.input('id', sql.UniqueIdentifier, r.id);
        req.input('route_code', sql.VarChar(20), r.route_code || r.routeCode);
        req.input('route_name', sql.NVarChar(255), r.route_name || r.routeName);
        req.input('direction', sql.VarChar(10), r.direction || 'FORWARD');
        req.input('description', sql.NVarChar(sql.MAX), r.description || `${r.route_name}`);

        await req.query(`
          INSERT INTO bus_routes (id, route_code, route_name, direction, description, is_active, created_at)
          VALUES (@id, @route_code, @route_name, @direction, @description, 1, SYSUTCDATETIME());
        `);
      }
      console.log(`  • Đã nạp xong ${busData.bus_routes.length} tuyến xe buýt.`);
    }

    const stopsCount = await pool.request().query('SELECT COUNT(*) AS total FROM bus_stops');
    if (stopsCount.recordset[0].total === 0) {
      console.log('  • Đang nạp danh sách trạm dừng...');
      const stops = busData.bus_stops || [];
      const batchSize = 100;
      for (let i = 0; i < stops.length; i += batchSize) {
        const chunk = stops.slice(i, i + batchSize);
        const req = pool.request();
        const valueClauses = [];

        chunk.forEach((s, idx) => {
          req.input(`id_${idx}`, sql.UniqueIdentifier, s.id);
          req.input(`name_${idx}`, sql.NVarChar(255), s.stop_name);
          req.input(`addr_${idx}`, sql.NVarChar(500), s.address || s.stop_name);
          req.input(`lat_${idx}`, sql.Decimal(10, 7), s.latitude || 21.0285);
          req.input(`lng_${idx}`, sql.Decimal(10, 7), s.longitude || 105.8542);

          valueClauses.push(`(@id_${idx}, @name_${idx}, @addr_${idx}, @lat_${idx}, @lng_${idx}, SYSUTCDATETIME())`);
        });

        await req.query(`INSERT INTO bus_stops (id, stop_name, address, latitude, longitude, created_at) VALUES ${valueClauses.join(', ')};`);
        process.stdout.write(`\r    Tiến trình: ${Math.min(i + batchSize, stops.length)} / ${stops.length} trạm dừng`);
      }
      console.log('\n  • Đã nạp xong toàn bộ trạm dừng.');
    }

    // 4. KIỂM TRA TỔNG QUAN
    console.log('\n[4/4] Kiểm tra số lượng bản ghi các bảng trên CSDL...');
    const tables = ['users', 'bus_routes', 'bus_stops', 'route_stops', 'buses', 'schedules', 'ticket_types', 'orders', 'tickets', 'payment_transactions', 'complaints'];
    
    console.log('----------------------------------------------------------------');
    for (const t of tables) {
      const res = await pool.request().query(`SELECT COUNT(*) AS total FROM [${t}]`);
      console.log(`  📦 [${t.padEnd(22)}] : ${res.recordset[0].total} bản ghi`);
    }
    console.log('----------------------------------------------------------------');
    console.log('\n🎉 HOÀN TẤT THIẾT LẬP DATABASE CHÍNH THỨC CHO WEB VIVU!\n');

  } catch (err) {
    console.error('❌ Lỗi kết nối / khởi tạo DB:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

migrateDatabase();
