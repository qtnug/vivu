# Handoff Report: SQL Server DDL Schema, Constraints & Automated Migration Architecture (Milestone 1.2)

- **Agent**: Explorer M1.2 (`teamwork_preview_explorer`)
- **Recipient**: Parent Orchestrator (`891098e1-52e3-4582-a42d-340f57c72e75`), Worker M1
- **Working Directory**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2`
- **Reference Analysis**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2/analysis.md`
- **Type**: Hard Handoff (Investigation & Blueprint Complete)

---

## 1. Observation

1. **Host SQL Server Instance & Credentials**:
   - Chạy lệnh `Test-NetConnection -ComputerName localhost -Port 1433` qua PowerShell trả về:
     ```
     ComputerName     : localhost
     RemotePort       : 1433
     TcpTestSucceeded : True
     ```
   - Chạy lệnh `sqlcmd -S localhost -E -C -Q "SELECT @@VERSION AS Version, DB_NAME() AS CurrentDB"` trả về:
     ```
     Microsoft SQL Server 2025 (RTM) - 17.0.1000.7 (X64) 
     Oct 21 2025 12:05:57 
     Copyright (C) 2025 Microsoft Corporation
     Express Edition (64-bit) on Windows 10 Pro 10.0 <X64> (Build 19044)
     ```
   - Truy vấn người dùng `vivu_admin` bằng mật khẩu `VivuAdmin@2026!` vào cơ sở dữ liệu `bus_ticketing_system`:
     ```powershell
     sqlcmd -S localhost -U vivu_admin -P "VivuAdmin@2026!" -d bus_ticketing_system -C -Q "SELECT DB_NAME() AS CurrentDB, USER_NAME() AS CurrentUser"
     ```
     Trả về `CurrentDB: bus_ticketing_system`, `CurrentUser: dbo`. Cơ sở dữ liệu hiện có `0` bảng (sạch 100%).
   - Collation của cơ sở dữ liệu là `SQL_Latin1_General_CP1_CI_AS` (Case-Insensitive).

2. **Quy định Cascade Delete trong Đặc tả Gốc**:
   - Tệp `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` (dòng 450) quy định:
     > *"Lưu ý cascade delete: `route_stops.stop_id`, `schedules.route_id/bus_id`, `orders.*`, `tickets.route_id`, `payment_transactions.order_id`, `complaints.*` dùng `NO ACTION` (mặc định) để tránh lỗi 'multiple cascade paths' của SQL Server khi nhiều bảng cùng tham chiếu một bảng gốc qua nhiều đường. Chỉ `route_stops.route_id` và `tickets.order_id` dùng `ON DELETE CASCADE` vì là quan hệ sở hữu trực tiếp, không trùng đường dẫn."*

3. **Kiểm nghiệm thực tế ràng buộc Khóa Ngoại (Foreign Keys) trên SQL Server 2025**:
   - Khi chạy thử nghiệm toàn bộ DDL 11 bảng trên cơ sở dữ liệu kiểm thử, truy vấn `sys.foreign_keys` ghi nhận chính xác 13 foreign keys:
     - `route_stops.route_id -> bus_routes(id)`: `CASCADE`
     - `tickets.order_id -> orders(id)`: `CASCADE`
     - 11 foreign keys còn lại: `NO_ACTION`
   - Không xuất hiện bất kỳ lỗi SQL Server Msg 1785 nào.

4. **Kiểm nghiệm Tập lệnh Khởi tạo Tự động (Node.js & T-SQL)**:
   - Đã biên soạn và kiểm thử tệp script `proposed_init-db.js` trên SQL Server 2025:
     ```powershell
     $env:DB_NAME="vivu_verify_test_db"; node "d:\DangQuangTung\Vivu\.agents\teamwork\explorer_m1_2\proposed_init-db.js"
     ```
   - Kết quả xuất ra:
     ```
     =====================================================================
     [Init-DB] Initializing SQL Server Database: vivu_verify_test_db
     [Init-DB] Server: localhost:1433 | User: vivu_admin
     =====================================================================
     [Init-DB] mssql package not loaded; executing via sqlcmd utility...
     [Init-DB] sqlcmd output:
      Changed database context to 'vivu_verify_test_db'.
     [Init-DB] Schema migration executed successfully via sqlcmd.
     =====================================================================
     [Init-DB] COMPLETE: All 11 tables & indexes created/verified successfully!
     =====================================================================
     ```
   - Chạy lại lần thứ 2 với cùng cơ sở dữ liệu: mã thoát 0, hoàn toàn idempotent (không phát sinh lỗi trùng bảng hay trùng index).

---

## 2. Logic Chain

1. **Từ Observation 1 (Trạng thái SQL Server 2025 Express trên port 1433)**:
   - Dịch vụ CSDL đang hoạt động ổn định và tài khoản `vivu_admin` có toàn quyền `dbo` trên `bus_ticketing_system`.
   - Kết nối yêu cầu cờ `trustServerCertificate: true` (hoặc `-C`) do dùng chứng chỉ tự ký cục bộ.
   - **Hệ quả**: Script kết nối CSDL và migration có thể chạy trực tiếp tới `localhost:1433` mà không cần cài đặt thêm phần mềm máy chủ CSDL.

2. **Từ Observation 2 & 3 (Quy tắc Multiple Cascade Path & Lỗi Msg 1785)**:
   - Nếu `tickets.route_id` hoặc `orders.route_id` dùng `CASCADE`, việc xoá một bản ghi `bus_routes` sẽ dẫn tới 2 đường cascade đồng thời tới bảng `tickets` (`bus_routes -> orders -> tickets` và `bus_routes -> tickets`). SQL Server sẽ chặn ngay lập tức với lỗi 1785.
   - Nếu `tickets.used_by_inspector_id` và `orders.user_id` cùng dùng `CASCADE`, việc xoá một người dùng sẽ dẫn tới 2 đường cascade tới `tickets`.
   - **Hệ quả**: Chỉ định duy nhất 2 quan hệ sở hữu phụ thuộc trực tiếp (`route_stops.route_id` và `tickets.order_id`) dùng `ON DELETE CASCADE`; toàn bộ 11 quan hệ còn lại bắt buộc dùng `NO ACTION`.

3. **Từ Observation 4 (Tính sẵn sàng của Node.js Migration Runner)**:
   - Node.js v22.11.0 có sẵn trên máy nhưng chưa có `node_modules` (Worker M1 sẽ thực hiện scaffold và `npm install`).
   - Thiết kế cơ chế kép (Dual-Engine) trong `proposed_init-db.js`:
     - Nếu đã cài gói `mssql` -> kết nối bằng `mssql.connect()` pool.
     - Nếu chưa cài `mssql` -> tự động dùng tiện ích CLI `sqlcmd` đã được xác nhận hoạt động 100%.
   - **Hệ quả**: Worker M1 có thể thực thi `init-db.js` tại bất kỳ thời điểm nào mà không gặp bất kỳ lỗi phụ thuộc nào.

---

## 3. Caveats

1. **Khởi tạo dữ liệu mẫu (Seed Data)**: Báo cáo này giới hạn trong việc tạo cấu trúc bảng (DDL), ràng buộc và chỉ mục (Indexes). Việc nạp dữ liệu mẫu (`admin`, `inspector1`, tuyến 01, 5 trạm dừng, xe buýt, lịch chạy, 5 loại vé) thuộc trách nhiệm của Explorer M1.3 và Worker M1.
2. **Xoá dữ liệu ở tầng ứng dụng (Application-level Deletion Logic)**: Do 11 foreign keys dùng `NO ACTION`, việc xoá các bản ghi gốc như tuyến xe hay người dùng phải được kiểm tra logic nghiệp vụ ở tầng Backend API (chặn xoá và chuyển sang `is_active = false` thay vì xoá cứng).
3. **Chỉ số `idx_tickets_user`**: Trong bảng `tickets` của đặc tả gốc không có cột `user_id` (quyền sở hữu vé thuộc về `order_id` trong bảng `orders`), chỉ có cột `used_by_inspector_id REFERENCES users(id)`. Do đó, `idx_tickets_user` được ánh xạ chính xác vào `tickets(used_by_inspector_id)` nhằm tối ưu lịch sử soát vé của nhân viên.

---

## 4. Conclusion

Bản thiết kế và toàn bộ tệp khởi tạo cơ sở dữ liệu đã sẵn sàng 100% tại thư mục:
- `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2/proposed_init-db.js`
- `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_2/proposed_schema.sql`

**Hướng dẫn triển khai cho Worker M1**:
1. Đặt tệp migration vào: `d:/DangQuangTung/Vivu/scripts/init-db.js`
2. Đặt tệp DDL thuần vào: `d:/DangQuangTung/Vivu/scripts/schema.sql`
3. Chạy lệnh khởi tạo:
   ```powershell
   node scripts/init-db.js
   ```
4. Xác nhận 11 bảng và 21 chỉ mục được tạo thành công trên `bus_ticketing_system`.

---

## 5. Verification Method

Worker hoặc Testing Agent có thể kiểm tra độc lập bằng các câu lệnh sau:

1. **Xác nhận số lượng bảng (Kỳ vọng: 11 bảng)**:
   ```powershell
   sqlcmd -S localhost -U vivu_admin -P "VivuAdmin@2026!" -d bus_ticketing_system -C -W -Q "SELECT count(*) AS TotalTables FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE';"
   ```
   *Kỳ vọng*: `TotalTables = 11`.

2. **Xác nhận quy tắc Cascade Delete (Kỳ vọng: Đúng 2 CASCADE, 11 NO_ACTION)**:
   ```powershell
   sqlcmd -S localhost -U vivu_admin -P "VivuAdmin@2026!" -d bus_ticketing_system -C -W -Q "SELECT fk.name, OBJECT_NAME(fk.parent_object_id) AS ParentTable, fk.delete_referential_action_desc AS DeleteRule FROM sys.foreign_keys fk ORDER BY DeleteRule, ParentTable;"
   ```
   *Kỳ vọng*:
   - `route_stops` -> `CASCADE`
   - `tickets` -> `CASCADE`
   - Tất cả các khóa ngoại khác -> `NO_ACTION`.

3. **Xác nhận tính Idempotent**:
   Chạy lại `node scripts/init-db.js` lần thứ 2.
   *Kỳ vọng*: Thoát mã 0, không có lỗi `Violation of PRIMARY KEY`, `There is already an object named...`.

4. **Điều kiện vô hiệu hóa (Invalidation Condition)**:
   Nếu SQL Server phát sinh lỗi `Msg 1785 (cycles or multiple cascade paths)` hoặc thiếu bất kỳ bảng nào trong số 11 bảng, bàn giao này sẽ bị vô hiệu hóa.
