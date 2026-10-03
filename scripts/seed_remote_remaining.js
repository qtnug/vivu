const sql = require('mssql');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 15000 },
  connectionTimeout: 30000,
  requestTimeout: 180000,
};

async function seedRemaining() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('Connected to remote DB...');

    const busData = require('../lib/bus-data.json');

    // Fetch existing valid route_ids and stop_ids from DB
    const validRoutesRes = await pool.request().query('SELECT id FROM bus_routes');
    const validStopsRes = await pool.request().query('SELECT id FROM bus_stops');

    const validRouteIds = new Set(validRoutesRes.recordset.map(r => r.id.toLowerCase()));
    const validStopIds = new Set(validStopsRes.recordset.map(s => s.id.toLowerCase()));

    // 1. Insert route_stops that have valid FK references
    const rsCount = await pool.request().query('SELECT COUNT(*) AS total FROM route_stops');
    if (rsCount.recordset[0].total === 0 && busData.route_stops && busData.route_stops.length > 0) {
      const validRouteStops = busData.route_stops.filter(rs => 
        rs.route_id && validRouteIds.has(rs.route_id.toLowerCase()) &&
        rs.stop_id && validStopIds.has(rs.stop_id.toLowerCase())
      );

      console.log(`Inserting ${validRouteStops.length} valid route_stops...`);
      const batchSize = 100;
      for (let i = 0; i < validRouteStops.length; i += batchSize) {
        const chunk = validRouteStops.slice(i, i + batchSize);
        const req = pool.request();
        const valueClauses = [];

        chunk.forEach((rs, idx) => {
          req.input(`id_${idx}`, sql.UniqueIdentifier, rs.id || crypto.randomUUID());
          req.input(`r_id_${idx}`, sql.UniqueIdentifier, rs.route_id);
          req.input(`s_id_${idx}`, sql.UniqueIdentifier, rs.stop_id);
          req.input(`seq_${idx}`, sql.Int, rs.stop_sequence);
          req.input(`dist_${idx}`, sql.Decimal(6, 2), rs.distance_from_start_km || 0);

          valueClauses.push(`(@id_${idx}, @r_id_${idx}, @s_id_${idx}, @seq_${idx}, @dist_${idx})`);
        });

        await req.query(`INSERT INTO route_stops (id, route_id, stop_id, stop_sequence, distance_from_start_km) VALUES ${valueClauses.join(', ')};`);
      }
      console.log('✅ Inserted valid route_stops!');
    }

    // 2. Insert schedules that have valid route_ids
    const schedCount = await pool.request().query('SELECT COUNT(*) AS total FROM schedules');
    if (schedCount.recordset[0].total === 0 && busData.schedules && busData.schedules.length > 0) {
      const validSchedules = busData.schedules.filter(s => 
        s.route_id && validRouteIds.has(s.route_id.toLowerCase())
      );

      console.log(`Inserting ${validSchedules.length} valid schedules...`);
      const batchSize = 100;
      for (let i = 0; i < validSchedules.length; i += batchSize) {
        const chunk = validSchedules.slice(i, i + batchSize);
        const req = pool.request();
        const valueClauses = [];

        chunk.forEach((s, idx) => {
          req.input(`id_${idx}`, sql.UniqueIdentifier, s.id || crypto.randomUUID());
          req.input(`r_id_${idx}`, sql.UniqueIdentifier, s.route_id);
          req.input(`time_${idx}`, sql.VarChar(10), s.departure_time || '05:30:00');
          req.input(`speed_${idx}`, sql.Decimal(5, 2), s.average_speed_kmh || 18.5);
          req.input(`days_${idx}`, sql.VarChar(20), s.days_of_week || 'MON-SUN');

          valueClauses.push(`(@id_${idx}, @r_id_${idx}, NULL, CAST(@time_${idx} AS TIME(0)), @speed_${idx}, @days_${idx}, SYSUTCDATETIME())`);
        });

        await req.query(`INSERT INTO schedules (id, route_id, bus_id, departure_time, average_speed_kmh, days_of_week, created_at) VALUES ${valueClauses.join(', ')};`);
      }
      console.log('✅ Inserted valid schedules!');
    }

    console.log('\n================================================================');
    console.log('         BÁO CÁO CƠ SỞ DỮ LIỆU CHÍNH THỨC CỦA WEB VIVU        ');
    console.log('================================================================');
    const tables = ['users', 'bus_routes', 'bus_stops', 'route_stops', 'buses', 'schedules', 'ticket_types', 'orders', 'tickets', 'payment_transactions', 'complaints'];
    for (const t of tables) {
      const res = await pool.request().query(`SELECT COUNT(*) AS total FROM [${t}]`);
      console.log(`  📦 [${t.padEnd(22)}] : ${res.recordset[0].total} bản ghi`);
    }
    console.log('================================================================\n');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

seedRemaining();
