-- =====================================================================
-- Vivu Electronic Bus Ticketing Platform - DB Verification Script (T-SQL)
-- Target Database: bus_ticketing_system
-- Execution: sqlcmd -S localhost -U vivu_admin -P "VivuAdmin@2026!" -d bus_ticketing_system -i scripts/verify-db.sql -C
-- =====================================================================

USE bus_ticketing_system;
GO

SET NOCOUNT ON;

DECLARE @Errors INT = 0;

PRINT '===============================================================';
PRINT '🔍 Vivu Platform: T-SQL Verification Runner';
PRINT '===============================================================';

-- 1. Verify 11 Tables
PRINT CHAR(10) + '--- Section 1: Verifying 11 Tables ---';
DECLARE @TableCount INT;
SELECT @TableCount = COUNT(*) 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME IN ('users', 'bus_routes', 'bus_stops', 'route_stops', 'buses', 'schedules', 'ticket_types', 'orders', 'tickets', 'payment_transactions', 'complaints');

IF @TableCount = 11
    PRINT '   [PASS] All 11 tables exist in database.'
ELSE
BEGIN
    PRINT '   [FAIL] Expected 11 tables, found ' + CAST(@TableCount AS VARCHAR(10));
    SET @Errors = @Errors + 1;
END;

-- 2. Verify Cascade Delete Rules
PRINT CHAR(10) + '--- Section 2: Foreign Key Cascade Rules ---';
DECLARE @IllegalCascades INT;
SELECT @IllegalCascades = COUNT(*)
FROM sys.foreign_keys fk
WHERE delete_referential_action_desc = 'CASCADE'
  AND NOT (
    (OBJECT_NAME(parent_object_id) = 'route_stops' AND OBJECT_NAME(referenced_object_id) = 'bus_routes')
    OR (OBJECT_NAME(parent_object_id) = 'tickets' AND OBJECT_NAME(referenced_object_id) = 'orders')
  );

IF @IllegalCascades = 0
    PRINT '   [PASS] Cascade delete rules strictly respected (0 illegal cascade paths).'
ELSE
BEGIN
    PRINT '   [FAIL] Found ' + CAST(@IllegalCascades AS VARCHAR(10)) + ' illegal CASCADE foreign keys!';
    SET @Errors = @Errors + 1;
END;

-- 3. Verify Users
PRINT CHAR(10) + '--- Section 3: Seed Users ---';
DECLARE @AdminCount INT, @InspCount INT;
SELECT @AdminCount = COUNT(*) FROM users WHERE email = 'admin@busticket.vn' AND role = 'admin' AND is_active = 1;
SELECT @InspCount = COUNT(*) FROM users WHERE email = 'inspector1@busticket.vn' AND role = 'inspector' AND is_active = 1;

IF @AdminCount = 1
    PRINT '   [PASS] Admin user (admin@busticket.vn) verified.'
ELSE
BEGIN
    PRINT '   [FAIL] Admin user missing or incorrect.';
    SET @Errors = @Errors + 1;
END;

IF @InspCount = 1
    PRINT '   [PASS] Inspector user (inspector1@busticket.vn) verified.'
ELSE
BEGIN
    PRINT '   [FAIL] Inspector user missing or incorrect.';
    SET @Errors = @Errors + 1;
END;

-- 4. Verify Route 01
PRINT CHAR(10) + '--- Section 4: Bus Route 01 ---';
DECLARE @RouteCount INT;
SELECT @RouteCount = COUNT(*) FROM bus_routes WHERE route_code = '01' AND direction = 'FORWARD';
IF @RouteCount = 1
    PRINT '   [PASS] Route 01 (Bến xe Long Biên - Bến xe Hà Đông) verified.'
ELSE
BEGIN
    PRINT '   [FAIL] Route 01 missing or incorrect.';
    SET @Errors = @Errors + 1;
END;

-- 5. Verify Stops & Sequence
PRINT CHAR(10) + '--- Section 5: Bus Stops & Sequence ---';
DECLARE @StopCount INT, @RSCount INT;
SELECT @StopCount = COUNT(*) FROM bus_stops WHERE stop_name IN (N'Bến xe Long Biên', N'Hồ Hoàn Kiếm', N'Ga Hà Nội', N'Ngã Tư Sở', N'Bến xe Hà Đông');
SELECT @RSCount = COUNT(*) FROM route_stops rs JOIN bus_routes br ON rs.route_id = br.id WHERE br.route_code = '01';

IF @StopCount = 5
    PRINT '   [PASS] All 5 required bus stops exist.'
ELSE
BEGIN
    PRINT '   [FAIL] Expected 5 bus stops, found ' + CAST(@StopCount AS VARCHAR(10));
    SET @Errors = @Errors + 1;
END;

IF @RSCount = 5
    PRINT '   [PASS] Route 01 has 5 ordered route stops mapped.'
ELSE
BEGIN
    PRINT '   [FAIL] Expected 5 route stops on Route 01, found ' + CAST(@RSCount AS VARCHAR(10));
    SET @Errors = @Errors + 1;
END;

-- 6. Verify Buses & Schedules
PRINT CHAR(10) + '--- Section 6: Buses & Schedules ---';
DECLARE @BusCount INT, @SchCount INT;
SELECT @BusCount = COUNT(*) FROM buses WHERE license_plate IN ('29B-123.45', '29B-678.90') AND capacity = 60;
SELECT @SchCount = COUNT(*) FROM schedules s JOIN bus_routes br ON s.route_id = br.id WHERE br.route_code = '01' AND departure_time = '06:00:00';

IF @BusCount = 2
    PRINT '   [PASS] Both 2 buses (29B-123.45, 29B-678.90, capacity 60) verified.'
ELSE
BEGIN
    PRINT '   [FAIL] Expected 2 buses, found ' + CAST(@BusCount AS VARCHAR(10));
    SET @Errors = @Errors + 1;
END;

IF @SchCount >= 1
    PRINT '   [PASS] Route 01 schedule at 06:00:00 verified.'
ELSE
BEGIN
    PRINT '   [FAIL] Route 01 schedule at 06:00:00 missing.';
    SET @Errors = @Errors + 1;
END;

-- 7. Verify Ticket Types
PRINT CHAR(10) + '--- Section 7: Ticket Types (Pricing Catalog) ---';
DECLARE @TTCount INT;
SELECT @TTCount = COUNT(*) FROM ticket_types;

IF @TTCount = 5
    PRINT '   [PASS] Exactly 5 ticket types verified (Single regular/student, Daily, Monthly regular/student).'
ELSE
BEGIN
    PRINT '   [FAIL] Expected 5 ticket types, found ' + CAST(@TTCount AS VARCHAR(10));
    SET @Errors = @Errors + 1;
END;

-- Summary
PRINT CHAR(10) + '===============================================================';
IF @Errors = 0
    PRINT '🎉 ALL VERIFICATION CHECKS PASSED (0 ERRORS)!';
ELSE
    PRINT '❌ VERIFICATION FAILED WITH ' + CAST(@Errors AS VARCHAR(10)) + ' ERROR(S)!';
PRINT '===============================================================';
GO
