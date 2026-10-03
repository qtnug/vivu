const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

async function seedTicketTypes() {
  const pool = await sql.connect({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'bus_ticketing_system',
    options: { encrypt: false, trustServerCertificate: true }
  });

  const types = [
    { id: 'c1111111-1111-1111-1111-111111111111', cat: 'SINGLE_RIDE', name: 'Vé lượt - 1 tuyến (Thường)', price: 8000, hrs: 2, days: null, stu: 0 },
    { id: 'c2222222-1111-1111-1111-111111111111', cat: 'SINGLE_RIDE', name: 'Vé lượt - 1 tuyến (Học sinh/Sinh viên)', price: 4000, hrs: 2, days: null, stu: 1 },
    { id: 'c6666666-1111-1111-1111-111111111111', cat: 'SINGLE_RIDE', name: 'Vé liên tuyến (Đổi 2 chặng xe)', price: 16000, hrs: 4, days: null, stu: 0 },
    { id: 'c7777777-1111-1111-1111-111111111111', cat: 'SINGLE_RIDE', name: 'Vé liên tuyến HSSV (Đổi 2 chặng xe)', price: 8000, hrs: 4, days: null, stu: 1 },
    { id: 'c3333333-1111-1111-1111-111111111111', cat: 'DAILY_PASS', name: 'Vé ngày liên tuyến (Toàn mạng)', price: 30000, hrs: 24, days: null, stu: 0 },
    { id: 'c4444444-1111-1111-1111-111111111111', cat: 'MONTHLY_PASS', name: 'Vé tháng 1 tuyến (Thường)', price: 100000, hrs: null, days: 30, stu: 0 },
    { id: 'c5555555-1111-1111-1111-111111111111', cat: 'MONTHLY_PASS', name: 'Vé tháng 1 tuyến (Học sinh/Sinh viên)', price: 55000, hrs: null, days: 30, stu: 1 },
    { id: 'c8888888-1111-1111-1111-111111111111', cat: 'MONTHLY_PASS', name: 'Vé tháng liên tuyến (Toàn mạng - Thường)', price: 200000, hrs: null, days: 30, stu: 0 },
    { id: 'c9999999-1111-1111-1111-111111111111', cat: 'MONTHLY_PASS', name: 'Vé tháng liên tuyến (Toàn mạng - HSSV)', price: 100000, hrs: null, days: 30, stu: 1 },
  ];

  for (const t of types) {
    await pool.request()
      .input('id', sql.UniqueIdentifier, t.id)
      .input('cat', sql.VarChar, t.cat)
      .input('name', sql.NVarChar, t.name)
      .input('price', sql.Decimal(10,2), t.price)
      .input('hrs', sql.Int, t.hrs)
      .input('days', sql.Int, t.days)
      .input('stu', sql.Bit, t.stu)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM ticket_types WHERE id = @id)
        BEGIN
          INSERT INTO ticket_types (id, category, name, price, validity_hours, validity_days, is_student_price, is_active)
          VALUES (@id, @cat, @name, @price, @hrs, @days, @stu, 1);
        END
        ELSE
        BEGIN
          UPDATE ticket_types SET name = @name, price = @price, validity_hours = @hrs, validity_days = @days, is_student_price = @stu, is_active = 1 WHERE id = @id;
        END
      `);
  }

  const all = await pool.request().query('SELECT * FROM ticket_types WHERE is_active = 1');
  console.log('Total active ticket types in SQL Server:', all.recordset.length);
  await pool.close();
}

seedTicketTypes().catch(e => console.error(e.message));
