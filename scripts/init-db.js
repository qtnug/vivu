/**
 * scripts/init-db.js
 * Automated idempotent database schema initializer for Vivu Bus Management Platform.
 *
 * Supported engines: Microsoft SQL Server 2025 / SQL Server Express / Azure SQL.
 * Execution modes:
 *   1. Driver mode: Uses 'mssql' package if installed in node_modules.
 *   2. CLI fallback: Uses 'sqlcmd' utility if run before npm install.
 *
 * Usage:
 *   node scripts/init-db.js
 *   npm run db:init
 */

try {
  const dotenv = require('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config();
} catch (e) {}

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Database configuration defaults (matching PROJECT.md)
const DB_CONFIG = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  user: process.env.DB_USER || 'vivu_admin',
  password: process.env.DB_PASSWORD || 'VivuAdmin@2026!',
  database: process.env.DB_NAME || 'bus_ticketing_system',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true
  }
};

// 11 Core tables ordered by foreign key dependency hierarchy
const TABLES_DDL = [
  // Level 0: No foreign key dependencies
  {
    name: 'users',
    description: 'Accounts for passengers, inspectors, and administrators',
    sql: `
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users' AND type = 'U')
BEGIN
    CREATE TABLE users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        full_name NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) UNIQUE,
        phone NVARCHAR(20) UNIQUE,
        password_hash NVARCHAR(255),
        role VARCHAR(20) NOT NULL DEFAULT 'passenger'
            CHECK (role IN ('passenger', 'inspector', 'admin')),
        is_student BIT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
`
  },
  {
    name: 'bus_routes',
    description: 'Bus transit routes with directional orientation',
    sql: `
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
END
`
  },
  {
    name: 'bus_stops',
    description: 'Physical bus stop locations with coordinates',
    sql: `
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
END
`
  },
  {
    name: 'buses',
    description: 'Physical transit buses and capacity',
    sql: `
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'buses' AND type = 'U')
BEGIN
    CREATE TABLE buses (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        license_plate VARCHAR(20) NOT NULL UNIQUE,
        capacity INT NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
`
  },
  {
    name: 'ticket_types',
    description: 'Catalog of ticket products and fares',
    sql: `
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ticket_types' AND type = 'U')
BEGIN
    CREATE TABLE ticket_types (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        category VARCHAR(20) NOT NULL
            CHECK (category IN ('SINGLE_RIDE', 'DAILY_PASS', 'MONTHLY_PASS')),
        name NVARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        validity_hours INT,
        validity_days INT,
        is_student_price BIT NOT NULL DEFAULT 0,
        is_active BIT NOT NULL DEFAULT 1
    );
END
`
  },

  // Level 1: Dependencies on Level 0
  {
    name: 'route_stops',
    description: 'Ordered sequence of stops along each route (route_id CASCADE, stop_id NO ACTION)',
    sql: `
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
END
`
  },
  {
    name: 'schedules',
    description: 'Static timetable departures and average speeds (NO ACTION on FKs)',
    sql: `
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'schedules' AND type = 'U')
BEGIN
    CREATE TABLE schedules (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),
        bus_id UNIQUEIDENTIFIER REFERENCES buses(id),
        departure_time TIME(0) NOT NULL,
        average_speed_kmh DECIMAL(5, 2) NOT NULL DEFAULT 20.0,
        days_of_week VARCHAR(20) NOT NULL DEFAULT 'MON-SUN',
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
`
  },
  {
    name: 'orders',
    description: 'Ticket purchase orders with 15-min VietQR payment window (NO ACTION on FKs)',
    sql: `
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
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
            CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED')),
        activation_date DATE NOT NULL,
        expires_at DATETIME2 NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
`
  },
  {
    name: 'complaints',
    description: 'Passenger feedback and complaint records (NO ACTION on FKs)',
    sql: `
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'complaints' AND type = 'U')
BEGIN
    CREATE TABLE complaints (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER REFERENCES users(id),
        route_id UNIQUEIDENTIFIER REFERENCES bus_routes(id),
        category VARCHAR(100) NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'NEW'
            CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
`
  },

  // Level 2: Dependencies on Level 1
  {
    name: 'tickets',
    description: 'Issued e-tickets with signed QR JWT (order_id CASCADE, route_id/inspector NO ACTION)',
    sql: `
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tickets' AND type = 'U')
BEGIN
    CREATE TABLE tickets (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        order_id UNIQUEIDENTIFIER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),
        ticket_code VARCHAR(50) NOT NULL UNIQUE,
        qr_payload NVARCHAR(MAX) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
            CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED')),
        valid_from DATETIME2 NOT NULL,
        valid_until DATETIME2 NOT NULL,
        used_at DATETIME2,
        used_by_inspector_id UNIQUEIDENTIFIER REFERENCES users(id),
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
`
  },
  {
    name: 'payment_transactions',
    description: 'Immutable SePay webhook reconciliation audit logs (NO ACTION on FK)',
    sql: `
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
END
`
  }
];

// Complete index catalog for query performance (21 indexes)
const INDEXES_DDL = [
  // users
  { table: 'users', name: 'idx_users_email', sql: 'CREATE INDEX idx_users_email ON users(email);' },
  { table: 'users', name: 'idx_users_role', sql: 'CREATE INDEX idx_users_role ON users(role);' },

  // bus_stops
  { table: 'bus_stops', name: 'idx_bus_stops_coords', sql: 'CREATE INDEX idx_bus_stops_coords ON bus_stops(latitude, longitude);' },

  // route_stops
  { table: 'route_stops', name: 'idx_route_stops_route', sql: 'CREATE INDEX idx_route_stops_route ON route_stops(route_id);' },
  { table: 'route_stops', name: 'idx_route_stops_stop', sql: 'CREATE INDEX idx_route_stops_stop ON route_stops(stop_id);' },

  // schedules
  { table: 'schedules', name: 'idx_schedules_route', sql: 'CREATE INDEX idx_schedules_route ON schedules(route_id);' },
  { table: 'schedules', name: 'idx_schedules_bus', sql: 'CREATE INDEX idx_schedules_bus ON schedules(bus_id);' },

  // orders
  { table: 'orders', name: 'idx_orders_status', sql: 'CREATE INDEX idx_orders_status ON orders(status);' },
  { table: 'orders', name: 'idx_orders_code', sql: 'CREATE INDEX idx_orders_code ON orders(order_code);' },
  { table: 'orders', name: 'idx_orders_user', sql: 'CREATE INDEX idx_orders_user ON orders(user_id);' },
  { table: 'orders', name: 'idx_orders_route', sql: 'CREATE INDEX idx_orders_route ON orders(route_id);' },

  // tickets
  { table: 'tickets', name: 'idx_tickets_status', sql: 'CREATE INDEX idx_tickets_status ON tickets(status);' },
  { table: 'tickets', name: 'idx_tickets_code', sql: 'CREATE INDEX idx_tickets_code ON tickets(ticket_code);' },
  { table: 'tickets', name: 'idx_tickets_order', sql: 'CREATE INDEX idx_tickets_order ON tickets(order_id);' },
  { table: 'tickets', name: 'idx_tickets_route', sql: 'CREATE INDEX idx_tickets_route ON tickets(route_id);' },
  { table: 'tickets', name: 'idx_tickets_user', sql: 'CREATE INDEX idx_tickets_user ON tickets(used_by_inspector_id);' },

  // payment_transactions
  { table: 'payment_transactions', name: 'idx_payment_tx_order', sql: 'CREATE INDEX idx_payment_tx_order ON payment_transactions(order_id);' },
  { table: 'payment_transactions', name: 'idx_transactions_order', sql: 'CREATE INDEX idx_transactions_order ON payment_transactions(order_id);' },

  // complaints
  { table: 'complaints', name: 'idx_complaints_status', sql: 'CREATE INDEX idx_complaints_status ON complaints(status);' },
  { table: 'complaints', name: 'idx_complaints_user', sql: 'CREATE INDEX idx_complaints_user ON complaints(user_id);' },
  { table: 'complaints', name: 'idx_complaints_route', sql: 'CREATE INDEX idx_complaints_route ON complaints(route_id);' }
];

/**
 * Execution strategy A: Using native mssql Node package
 */
async function runWithMssql(mssql) {
  console.log('[Init-DB] Using native mssql driver...');

  // 1. First ensure database exists (connect to master)
  const masterConfig = {
    ...DB_CONFIG,
    database: 'master'
  };

  const masterPool = await mssql.connect(masterConfig);
  await masterPool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${DB_CONFIG.database}')
    BEGIN
        CREATE DATABASE [${DB_CONFIG.database}];
    END
    ALTER DATABASE [${DB_CONFIG.database}] SET AUTO_CLOSE OFF WITH NO_WAIT;
    ALTER DATABASE [${DB_CONFIG.database}] SET AUTO_SHRINK OFF WITH NO_WAIT;
    ALTER DATABASE [${DB_CONFIG.database}] SET RECOVERY SIMPLE WITH NO_WAIT;
  `);
  await masterPool.close();
  console.log(`[Init-DB] Database [${DB_CONFIG.database}] confirmed.`);

  // 2. Connect to target database
  const targetPool = await mssql.connect(DB_CONFIG);

  // 3. Create tables
  for (const table of TABLES_DDL) {
    await targetPool.request().query(table.sql);
    console.log(`  [Table OK] ${table.name} (${table.description})`);
  }

  // 4. Create indexes
  for (const idx of INDEXES_DDL) {
    const checkSql = `
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = '${idx.name}' AND object_id = OBJECT_ID('${idx.table}'))
      BEGIN
          ${idx.sql}
      END
    `;
    await targetPool.request().query(checkSql);
    console.log(`  [Index OK] ${idx.name} on ${idx.table}`);
  }

  // 5. Verification count
  const result = await targetPool.request().query(`
    SELECT count(*) AS total_tables FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'
  `);
  console.log(`[Init-DB] Verified: ${result.recordset[0].total_tables} base tables active in [${DB_CONFIG.database}].`);

  await targetPool.close();
}

/**
 * Execution strategy B: Using sqlcmd utility (pre-npm install fallback)
 */
function runWithSqlcmd() {
  console.log('[Init-DB] mssql package not loaded; executing via sqlcmd utility...');

  let script = `
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${DB_CONFIG.database}')
BEGIN
    CREATE DATABASE [${DB_CONFIG.database}];
END
GO

USE [${DB_CONFIG.database}];
GO
`;

  for (const t of TABLES_DDL) {
    script += `\n-- Table: ${t.name}\n${t.sql.trim()}\nGO\n`;
  }

  for (const idx of INDEXES_DDL) {
    script += `\n-- Index: ${idx.name} on ${idx.table}\nIF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = '${idx.name}' AND object_id = OBJECT_ID('${idx.table}'))\nBEGIN\n    ${idx.sql.trim()}\nEND\nGO\n`;
  }

  const tempFile = path.join(__dirname, 'temp_init_migration.sql');
  fs.writeFileSync(tempFile, script, 'utf8');

  try {
    const cmd = `sqlcmd -S "${DB_CONFIG.server},${DB_CONFIG.port}" -U "${DB_CONFIG.user}" -P "${DB_CONFIG.password}" -C -i "${tempFile}"`;
    const output = execSync(cmd, { encoding: 'utf8' });
    if (output && output.trim()) {
      console.log('[Init-DB] sqlcmd output:\n', output.trim());
    }
    console.log(`[Init-DB] Schema migration executed successfully via sqlcmd.`);
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

async function main() {
  console.log('=====================================================================');
  console.log(`[Init-DB] Initializing SQL Server Database: ${DB_CONFIG.database}`);
  console.log(`[Init-DB] Server: ${DB_CONFIG.server}:${DB_CONFIG.port} | User: ${DB_CONFIG.user}`);
  console.log('=====================================================================');

  let mssqlModule = null;
  try {
    mssqlModule = require('mssql');
  } catch (err) {
    // Driver not installed yet
  }

  if (mssqlModule) {
    await runWithMssql(mssqlModule);
  } else {
    runWithSqlcmd();
  }

  console.log('=====================================================================');
  console.log('[Init-DB] COMPLETE: All 11 tables & indexes created/verified successfully!');
  console.log('=====================================================================');
}

if (require.main === module) {
  main().catch(err => {
    console.error('[Init-DB] FATAL ERROR:', err);
    process.exit(1);
  });
}

module.exports = { main, TABLES_DDL, INDEXES_DDL, DB_CONFIG };
