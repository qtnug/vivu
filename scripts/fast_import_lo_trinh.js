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
  pool: { max: 10, min: 0, idleTimeoutMillis: 15000 },
  connectionTimeout: 30000,
  requestTimeout: 120000,
};

async function fastImport() {
  const jsonPath = path.join(__dirname, '..', 'lib', 'bus-data.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('lib/bus-data.json not found! Run scripts/import_lo_trinh.js first.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`📦 Loaded ${data.bus_routes.length} routes, ${data.bus_stops.length} stops, ${data.route_stops.length} route-stops, ${data.schedules.length} schedules`);

  let pool;
  try {
    console.log('🔌 Connecting to SQL Server...');
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected!');
  } catch (err) {
    console.warn('⚠️ SQL Server connection skipped:', err.message);
    return;
  }

  try {
    // 1. Batch insert/update routes in chunks
    console.log('🚌 Syncing bus_routes...');
    const chunkSize = 50;
    for (let i = 0; i < data.bus_routes.length; i += chunkSize) {
      const chunk = data.bus_routes.slice(i, i + chunkSize);
      const sqlParts = chunk.map((r, idx) => {
        const code = r.route_code.replace(/'/g, "''");
        const name = r.route_name.replace(/'/g, "''");
        const desc = (r.description || '').replace(/'/g, "''");
        return `
          IF NOT EXISTS (SELECT 1 FROM bus_routes WHERE route_code = '${code}')
            INSERT INTO bus_routes (id, route_code, route_name, direction, description, is_active)
            VALUES ('${r.id}', '${code}', N'${name}', 'FORWARD', N'${desc}', 1);
          ELSE
            UPDATE bus_routes SET route_name = N'${name}', description = N'${desc}', is_active = 1 WHERE route_code = '${code}';
        `;
      }).join('\n');

      await pool.request().query(sqlParts);
    }
    console.log('✅ Bus routes synced.');

    // 2. Batch sync stops
    console.log('📍 Syncing bus_stops...');
    for (let i = 0; i < data.bus_stops.length; i += chunkSize) {
      const chunk = data.bus_stops.slice(i, i + chunkSize);
      const sqlParts = chunk.map((s) => {
        const name = s.stop_name.replace(/'/g, "''");
        const addr = (s.address || '').replace(/'/g, "''");
        return `
          IF NOT EXISTS (SELECT 1 FROM bus_stops WHERE id = '${s.id}')
            INSERT INTO bus_stops (id, stop_name, address, latitude, longitude)
            VALUES ('${s.id}', N'${name}', N'${addr}', ${s.latitude}, ${s.longitude});
          ELSE
            UPDATE bus_stops SET stop_name = N'${name}', address = N'${addr}', latitude = ${s.latitude}, longitude = ${s.longitude} WHERE id = '${s.id}';
        `;
      }).join('\n');

      await pool.request().query(sqlParts);
    }
    console.log('✅ Bus stops synced.');

    // 3. Batch sync route_stops
    console.log('🚏 Syncing route_stops...');
    for (let i = 0; i < data.route_stops.length; i += chunkSize) {
      const chunk = data.route_stops.slice(i, i + chunkSize);
      const sqlParts = chunk.map((rs) => {
        return `
          IF NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id = '${rs.route_id}' AND stop_sequence = ${rs.stop_sequence})
            INSERT INTO route_stops (id, route_id, stop_id, stop_sequence, distance_from_start_km)
            VALUES ('${rs.id}', '${rs.route_id}', '${rs.stop_id}', ${rs.stop_sequence}, ${rs.distance_from_start_km});
          ELSE
            UPDATE route_stops SET stop_id = '${rs.stop_id}', distance_from_start_km = ${rs.distance_from_start_km} WHERE route_id = '${rs.route_id}' AND stop_sequence = ${rs.stop_sequence};
        `;
      }).join('\n');

      await pool.request().query(sqlParts);
    }
    console.log('✅ Route stops synced.');

    // 4. Batch sync schedules
    console.log('⏰ Syncing schedules...');
    for (let i = 0; i < data.schedules.length; i += chunkSize) {
      const chunk = data.schedules.slice(i, i + chunkSize);
      const sqlParts = chunk.map((sc) => {
        return `
          IF NOT EXISTS (SELECT 1 FROM schedules WHERE id = '${sc.id}')
            INSERT INTO schedules (id, route_id, bus_id, departure_time, average_speed_kmh, days_of_week)
            VALUES ('${sc.id}', '${sc.route_id}', NULL, '${sc.departure_time}', ${sc.average_speed_kmh}, '${sc.days_of_week}');
        `;
      }).join('\n');

      await pool.request().query(sqlParts);
    }
    console.log('✅ Schedules synced.');

    console.log('🎉 100% of data from lo_trinh.txt successfully updated in SQL Server Database!');
  } catch (err) {
    console.error('❌ Error during fast SQL import:', err);
  } finally {
    if (pool) await pool.close();
  }
}

fastImport();
