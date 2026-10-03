/**
 * Fix Unicode / Vietnamese font encoding in SQL Server database
 * Inserts and updates bus_routes, bus_stops with explicit sql.NVarChar parameters
 */

const fs = require('fs');
const path = require('path');
const sql = require('mssql');

try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {}

const dbConfig = {
  user: process.env.DB_USER || 'vivu_admin',
  password: process.env.DB_PASSWORD || 'VivuAdmin@2026!',
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'bus_ticketing_system',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: { max: 10, min: 1, idleTimeoutMillis: 15000 },
  connectionTimeout: 30000,
  requestTimeout: 120000,
};

async function fixFont() {
  const jsonPath = path.join(__dirname, '..', 'lib', 'bus-data.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log('🔌 Connecting to SQL Server...');
  const pool = await sql.connect(dbConfig);
  console.log('✅ Connected!');

  try {
    // 1. Update bus_routes with parameterized NVarChar
    console.log(`🔤 Updating ${data.bus_routes.length} bus routes with clean Unicode NVarChar...`);
    for (const r of data.bus_routes) {
      await pool.request()
        .input('id', sql.UniqueIdentifier, r.id)
        .input('code', sql.VarChar(20), r.route_code)
        .input('name', sql.NVarChar(255), r.route_name)
        .input('dir', sql.VarChar(10), 'FORWARD')
        .input('desc', sql.NVarChar(sql.MAX), r.description)
        .query(`
          IF EXISTS (SELECT 1 FROM bus_routes WHERE route_code = @code)
            UPDATE bus_routes 
            SET route_name = @name, description = @desc, is_active = 1 
            WHERE route_code = @code;
          ELSE
            INSERT INTO bus_routes (id, route_code, route_name, direction, description, is_active)
            VALUES (@id, @code, @name, @dir, @desc, 1);
        `);
    }
    console.log('✅ Bus routes updated with perfect Vietnamese Unicode!');

    // 2. Update bus_stops with parameterized NVarChar
    console.log(`🔤 Updating ${data.bus_stops.length} bus stops with clean Unicode NVarChar...`);
    for (const s of data.bus_stops) {
      await pool.request()
        .input('id', sql.UniqueIdentifier, s.id)
        .input('name', sql.NVarChar(255), s.stop_name)
        .input('addr', sql.NVarChar(500), s.address)
        .input('lat', sql.Decimal(10, 7), s.latitude)
        .input('lng', sql.Decimal(10, 7), s.longitude)
        .query(`
          IF EXISTS (SELECT 1 FROM bus_stops WHERE id = @id)
            UPDATE bus_stops 
            SET stop_name = @name, address = @addr, latitude = @lat, longitude = @lng 
            WHERE id = @id;
          ELSE
            INSERT INTO bus_stops (id, stop_name, address, latitude, longitude)
            VALUES (@id, @name, @addr, @lat, @lng);
        `);
    }
    console.log('✅ Bus stops updated with perfect Vietnamese Unicode!');

    console.log('🎉 ALL VIETNAMESE CHARACTERS IN SQL SERVER ARE NOW PERFECTLY ENCODED!');
  } catch (err) {
    console.error('❌ Error during font fix:', err);
  } finally {
    await pool.close();
  }
}

fixFont();
