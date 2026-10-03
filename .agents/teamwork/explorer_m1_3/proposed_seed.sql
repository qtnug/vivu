-- =====================================================================
-- Vivu Electronic Bus Ticketing Platform - Authoritative Seed Data (T-SQL)
-- Target Database: bus_ticketing_system
-- Execution: sqlcmd -S localhost -U vivu_admin -P "VivuAdmin@2026!" -d bus_ticketing_system -i scripts/seed.sql -C
-- 100% Idempotent
-- =====================================================================

USE bus_ticketing_system;
GO

-- 1. Users (Admin & Inspector)
-- Pre-computed bcrypt hashes (salt rounds: 10):
-- Admin@123456     -> $2b$10$.cY6uE7da5f/g9Y3CRXISeb07ShM3O4sP92fSWCZTy/lajHQJg57W
-- Inspector@123456 -> $2b$10$8Nj9A9Vmihn0I0w.btDMuuQtl5jLig2ZkGBgUoC0XhAefcnB0T2R2

IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@busticket.vn')
BEGIN
    INSERT INTO users (id, full_name, email, phone, password_hash, role, is_student, is_active)
    VALUES ('00000000-0000-0000-0000-000000000001', N'Quản trị viên', 'admin@busticket.vn', '0901000001', '$2b$10$.cY6uE7da5f/g9Y3CRXISeb07ShM3O4sP92fSWCZTy/lajHQJg57W', 'admin', 0, 1);
END
ELSE
BEGIN
    UPDATE users SET full_name = N'Quản trị viên', password_hash = '$2b$10$.cY6uE7da5f/g9Y3CRXISeb07ShM3O4sP92fSWCZTy/lajHQJg57W', role = 'admin', is_active = 1 WHERE email = 'admin@busticket.vn';
END;

IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'inspector1@busticket.vn')
BEGIN
    INSERT INTO users (id, full_name, email, phone, password_hash, role, is_student, is_active)
    VALUES ('00000000-0000-0000-0000-000000000002', N'Nguyễn Văn Soát', 'inspector1@busticket.vn', '0902000002', '$2b$10$8Nj9A9Vmihn0I0w.btDMuuQtl5jLig2ZkGBgUoC0XhAefcnB0T2R2', 'inspector', 0, 1);
END
ELSE
BEGIN
    UPDATE users SET full_name = N'Nguyễn Văn Soát', password_hash = '$2b$10$8Nj9A9Vmihn0I0w.btDMuuQtl5jLig2ZkGBgUoC0XhAefcnB0T2R2', role = 'inspector', is_active = 1 WHERE email = 'inspector1@busticket.vn';
END;
GO

-- 2. Bus Route 01 (Long Biên - Bến xe Hà Đông)
IF NOT EXISTS (SELECT 1 FROM bus_routes WHERE route_code = '01')
BEGIN
    INSERT INTO bus_routes (id, route_code, route_name, direction, description, is_active)
    VALUES ('11111111-1111-1111-1111-111111111111', '01', N'Bến xe Long Biên - Bến xe Hà Đông', 'FORWARD', N'Tuyến trung tâm nội thành Hà Nội (Cự ly: 18.5 km, Thời gian: 55 phút, Tần suất: 10 phút, Giá vé: 7,000 VND)', 1);
END
ELSE
BEGIN
    UPDATE bus_routes SET route_name = N'Bến xe Long Biên - Bến xe Hà Đông', direction = 'FORWARD', description = N'Tuyến trung tâm nội thành Hà Nội (Cự ly: 18.5 km, Thời gian: 55 phút, Tần suất: 10 phút, Giá vé: 7,000 VND)', is_active = 1 WHERE route_code = '01';
END;
GO

-- 3. Bus Stops (5 key stops)
IF NOT EXISTS (SELECT 1 FROM bus_stops WHERE id = 'a1111111-1111-1111-1111-111111111111')
    INSERT INTO bus_stops (id, stop_name, address, latitude, longitude)
    VALUES ('a1111111-1111-1111-1111-111111111111', N'Bến xe Long Biên', N'Q. Ba Đình, Hà Nội', 21.0425, 105.8502);

IF NOT EXISTS (SELECT 1 FROM bus_stops WHERE id = 'a2222222-1111-1111-1111-111111111111')
    INSERT INTO bus_stops (id, stop_name, address, latitude, longitude)
    VALUES ('a2222222-1111-1111-1111-111111111111', N'Hồ Hoàn Kiếm', N'Q. Hoàn Kiếm, Hà Nội', 21.0285, 105.8542);

IF NOT EXISTS (SELECT 1 FROM bus_stops WHERE id = 'a3333333-1111-1111-1111-111111111111')
    INSERT INTO bus_stops (id, stop_name, address, latitude, longitude)
    VALUES ('a3333333-1111-1111-1111-111111111111', N'Ga Hà Nội', N'Q. Hoàn Kiếm, Hà Nội', 21.0245, 105.8412);

IF NOT EXISTS (SELECT 1 FROM bus_stops WHERE id = 'a4444444-1111-1111-1111-111111111111')
    INSERT INTO bus_stops (id, stop_name, address, latitude, longitude)
    VALUES ('a4444444-1111-1111-1111-111111111111', N'Ngã Tư Sở', N'Q. Đống Đa, Hà Nội', 21.0025, 105.8182);

IF NOT EXISTS (SELECT 1 FROM bus_stops WHERE id = 'a5555555-1111-1111-1111-111111111111')
    INSERT INTO bus_stops (id, stop_name, address, latitude, longitude)
    VALUES ('a5555555-1111-1111-1111-111111111111', N'Bến xe Hà Đông', N'Q. Hà Đông, Hà Nội', 20.9725, 105.7782);
GO

-- 4. Route Stops (ordered sequence 1 to 5)
IF NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id = '11111111-1111-1111-1111-111111111111' AND stop_sequence = 1)
    INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
    VALUES ('11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 1, 0.0);

IF NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id = '11111111-1111-1111-1111-111111111111' AND stop_sequence = 2)
    INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
    VALUES ('11111111-1111-1111-1111-111111111111', 'a2222222-1111-1111-1111-111111111111', 2, 2.5);

IF NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id = '11111111-1111-1111-1111-111111111111' AND stop_sequence = 3)
    INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
    VALUES ('11111111-1111-1111-1111-111111111111', 'a3333333-1111-1111-1111-111111111111', 3, 4.8);

IF NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id = '11111111-1111-1111-1111-111111111111' AND stop_sequence = 4)
    INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
    VALUES ('11111111-1111-1111-1111-111111111111', 'a4444444-1111-1111-1111-111111111111', 4, 8.2);

IF NOT EXISTS (SELECT 1 FROM route_stops WHERE route_id = '11111111-1111-1111-1111-111111111111' AND stop_sequence = 5)
    INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km)
    VALUES ('11111111-1111-1111-1111-111111111111', 'a5555555-1111-1111-1111-111111111111', 5, 12.6);
GO

-- 5. Buses (2 vehicles)
IF NOT EXISTS (SELECT 1 FROM buses WHERE license_plate = '29B-123.45')
    INSERT INTO buses (id, license_plate, capacity, is_active)
    VALUES ('b1111111-1111-1111-1111-111111111111', '29B-123.45', 60, 1);

IF NOT EXISTS (SELECT 1 FROM buses WHERE license_plate = '29B-678.90')
    INSERT INTO buses (id, license_plate, capacity, is_active)
    VALUES ('b2222222-1111-1111-1111-111111111111', '29B-678.90', 60, 1);
GO

-- 6. Schedules (Route 01, departure 06:00:00)
IF NOT EXISTS (SELECT 1 FROM schedules WHERE route_id = '11111111-1111-1111-1111-111111111111' AND departure_time = '06:00:00')
    INSERT INTO schedules (route_id, bus_id, departure_time, average_speed_kmh, days_of_week)
    VALUES ('11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', '06:00:00', 18.5, 'MON-SUN');

IF NOT EXISTS (SELECT 1 FROM schedules WHERE route_id = '11111111-1111-1111-1111-111111111111' AND departure_time = '06:15:00')
    INSERT INTO schedules (route_id, bus_id, departure_time, average_speed_kmh, days_of_week)
    VALUES ('11111111-1111-1111-1111-111111111111', 'b2222222-1111-1111-1111-111111111111', '06:15:00', 18.5, 'MON-SUN');
GO

-- 7. Ticket Types (5 standard pricing categories)
IF NOT EXISTS (SELECT 1 FROM ticket_types WHERE id = 'c1111111-1111-1111-1111-111111111111')
    INSERT INTO ticket_types (id, category, name, price, validity_hours, validity_days, is_student_price, is_active)
    VALUES ('c1111111-1111-1111-1111-111111111111', 'SINGLE_RIDE', N'Vé lượt - Thường', 7000.00, 2, NULL, 0, 1);

IF NOT EXISTS (SELECT 1 FROM ticket_types WHERE id = 'c2222222-1111-1111-1111-111111111111')
    INSERT INTO ticket_types (id, category, name, price, validity_hours, validity_days, is_student_price, is_active)
    VALUES ('c2222222-1111-1111-1111-111111111111', 'SINGLE_RIDE', N'Vé lượt - Học sinh/Sinh viên', 3000.00, 2, NULL, 1, 1);

IF NOT EXISTS (SELECT 1 FROM ticket_types WHERE id = 'c3333333-1111-1111-1111-111111111111')
    INSERT INTO ticket_types (id, category, name, price, validity_hours, validity_days, is_student_price, is_active)
    VALUES ('c3333333-1111-1111-1111-111111111111', 'DAILY_PASS', N'Vé ngày', 30000.00, 24, NULL, 0, 1);

IF NOT EXISTS (SELECT 1 FROM ticket_types WHERE id = 'c4444444-1111-1111-1111-111111111111')
    INSERT INTO ticket_types (id, category, name, price, validity_hours, validity_days, is_student_price, is_active)
    VALUES ('c4444444-1111-1111-1111-111111111111', 'MONTHLY_PASS', N'Vé tháng - Thường', 200000.00, NULL, 30, 0, 1);

IF NOT EXISTS (SELECT 1 FROM ticket_types WHERE id = 'c5555555-1111-1111-1111-111111111111')
    INSERT INTO ticket_types (id, category, name, price, validity_hours, validity_days, is_student_price, is_active)
    VALUES ('c5555555-1111-1111-1111-111111111111', 'MONTHLY_PASS', N'Vé tháng - Học sinh/Sinh viên', 100000.00, NULL, 30, 1, 1);
GO
