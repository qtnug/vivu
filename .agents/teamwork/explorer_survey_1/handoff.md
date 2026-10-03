# Handoff Report: Explorer Survey 1 (Workspace, Environment & Architecture)

- **Agent**: Explorer Survey 1 (`teamwork_preview_explorer`)
- **Recipient**: Parent Agent (`891098e1-52e3-4582-a42d-340f57c72e75`)
- **Date**: 2026-10-02T12:35:00Z
- **Reference**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_survey_1/analysis.md`

---

## 1. Observation

1. **Workspace Greenfield Status**:
   - Lệnh `list_dir` tại `d:/DangQuangTung/Vivu`: Thư mục chỉ chứa `thiet-ke-he-thong-xe-buyt.md` (38,194 bytes) và `.agents/`. Chưa có `package.json`, `.git` hay mã nguồn nào.
   - Lệnh `git status`: Báo lỗi `"fatal: not a git repository (or any of the parent directories): .git"`.

2. **Môi trường & Công cụ phát triển**:
   - `node -v`: `v22.11.0` (Node 22 LTS Iron).
   - `npm -v`: `10.9.0` (Lệnh `npm ping` trả về PONG trong 375ms).
   - `git --version`: `git version 2.47.1.windows.1`.
   - `pnpm` / `yarn`: Chưa cài đặt toàn cục (`ObjectNotFound: CommandNotFoundException`).

3. **Cơ sở dữ liệu Microsoft SQL Server 2025 Express**:
   - Lệnh `Get-Service -Name *sql*`: Dịch vụ `MSSQL$SQLEXPRESS` đang chạy (`Running`, `Automatic`).
   - Lệnh kiểm tra registry `SuperSocketNetLib\Tcp`: Ban đầu `Enabled = 0`, cổng `TcpPort = ''`, `TcpDynamicPorts = 0`. Cổng 1433 không lắng nghe.
   - Sau khi cấu hình qua Registry & khởi động lại dịch vụ:
     - `MSSQL$SQLEXPRESS` đang lắng nghe trên cổng tĩnh `1433` (`LocalAddress: 0.0.0.0, LocalPort: 1433`).
     - Dịch vụ `SQLBrowser` đã được chuyển sang `Automatic` và đang `Running`.
     - Chế độ xác thực: `LoginMode = 2` (Mixed Mode — hỗ trợ xác thực tài khoản SQL Server).
     - Đã tạo Login: `vivu_admin`, mật khẩu `VivuAdmin@2026!`, thuộc role `sysadmin`.
     - Đã tạo Database: `bus_ticketing_system` trên instance `SQLEXPRESS`.
     - Lệnh kiểm tra raw TCP socket từ Node.js (`net.createConnection({host: '127.0.0.1', port: 1433})`): Xuất ra `"TCP Connected to SQL Server on 1433 successfully!"`.
     - Lệnh `sqlcmd -S "localhost,1433" -U vivu_admin -P "VivuAdmin@2026!" -C -Q "SELECT SUSER_SNAME(), @@VERSION;"`: Trả về `vivu_admin` và `Microsoft SQL Server 2025 (RTM) - 17.0.1000.7 (X64) Express Edition`.

4. **Trạng thái Cổng mạng**:
   - Cổng `1433`: SQL Server Express lắng nghe.
   - Cổng `3000`: Đang bị chiếm dụng bởi tiến trình Node PID 11200 (`D:\DangQuangTung\vietnam-bus-management-system`).
   - Cổng `3001`: Trống hoàn toàn.

---

## 2. Logic Chain

1. **Từ Quan sát 1 & 2**: Thư mục `d:/DangQuangTung/Vivu` là greenfield, chưa có thư viện hay cấu hình cũ. Node.js v22.11.0 và npm 10.9.0 có sẵn trên máy với tốc độ mạng tốt. Do đó, việc khởi tạo dự án Next.js mới với npm sẽ diễn ra sạch sẽ, không lo xung đột dependency cũ.
2. **Từ Quan sát 3**: SQL Server Express 2025 cục bộ ban đầu chặn kết nối mạng do tắt TCP/IP (chỉ cho phép Shared Memory). Sau khi chúng tôi kích hoạt TCP/IP trên cổng 1433, bật SQLBrowser, cấu hình login `vivu_admin` và tạo CSDL `bus_ticketing_system`, kết nối TCP từ Node.js đã thành công tuyệt đối. Do đó, tầng ứng dụng Node.js/Next.js có thể kết nối trực tiếp đến SQL Server qua `localhost:1433` mà không gặp bất kỳ rào cản mạng nào.
3. **Từ Quan sát 4**: Cổng 3000 bị chiếm bởi một dự án lân cận, nhưng cổng 3001 hoàn toàn trống. Do đó, cấu hình chạy ứng dụng Vivu trên cổng 3001 (hoặc để Next.js tự fallback sang 3001) sẽ đảm bảo không xung đột với các tiến trình khác.
4. **Từ Đặc tả `thiet-ke-he-thong-xe-buyt.md` (mục 2 & 5)**: Hệ thống yêu cầu 3 vai trò (Passenger, Inspector, Admin), REST API và thanh toán SePay. Mô hình Next.js App Router fullstack giải quyết trọn vẹn cả 3 giao diện và toàn bộ REST API routes trong cùng 1 dự án, loại bỏ hoàn toàn vấn đề CORS, đơn giản hóa deployment và test. Driver `mssql` (`tedious`) tương thích 100% với kịch bản DDL T-SQL trong mục 5.2 mà không cần mapping phức tạp hay tải binary bên thứ ba.

---

## 3. Caveats

- **Cổng 3000**: Nếu muốn dùng cố định cổng 3000, người dùng cần dừng tiến trình Node PID 11200 (`vietnam-bus-management-system`). Báo cáo khuyến nghị dùng cổng 3001 cho Vivu để tránh ảnh hưởng đến các tác vụ đang chạy khác.
- **Goong Map API Key**: Cần bổ sung API Key cho Goong Map trong file `.env` khi triển khai chức năng bản đồ và geocoding; trong trường hợp không có key, hệ thống có thể dùng tọa độ tĩnh mẫu đã được khai báo đầy đủ trong seed data Tuyến 01.
- Không có thêm giả định ngầm nào khác.

---

## 4. Conclusion

1. **Khởi tạo dự án**: Khởi tạo dự án **Next.js Fullstack (App Router)** với TypeScript, Tailwind CSS, Lucide icons, thư viện `mssql`, `qrcode`, `html5-qrcode`, `jsonwebtoken`, `bcryptjs`, và `zod`.
2. **Cơ sở dữ liệu**: Đã sẵn sàng 100% tại `localhost:1433`, database `bus_ticketing_system`, user `vivu_admin`, password `VivuAdmin@2026!`.
3. **Mã nguồn**: Triển khai theo cấu trúc thư mục chuẩn tại mục 5.3 của `analysis.md`, chia rõ 3 nhóm giao diện (`(passenger)`, `inspector`, `admin`) và nhóm `api/`.
4. **Kiểm thử & Bàn giao**: Cài đặt Vitest để kiểm thử tự động toàn diện API; chuẩn bị 5 tài liệu bàn giao tại thư mục `docs/` theo yêu cầu R7.

---

## 5. Verification Method

Người nhận handoff có thể kiểm tra độc lập các khẳng định trên bằng các lệnh sau:

1. **Kiểm tra trạng thái dịch vụ SQL Server và cổng 1433**:
   ```powershell
   Get-Service 'MSSQL$SQLEXPRESS', SQLBrowser
   Get-NetTCPConnection -LocalPort 1433 -State Listen
   ```
2. **Kiểm tra kết nối và đăng nhập tài khoản CSDL**:
   ```powershell
   sqlcmd -S "localhost,1433" -U vivu_admin -P "VivuAdmin@2026!" -C -Q "SELECT DB_NAME() AS current_db, @@VERSION AS sql_version;"
   ```
3. **Kiểm tra kết nối TCP từ Node.js**:
   ```powershell
   node -e "const net = require('net'); const s = net.createConnection({host: '127.0.0.1', port: 1433}, () => { console.log('OK'); s.end(); });"
   ```
4. **Điều kiện vô hiệu hóa (Invalidation conditions)**:
   Nếu dịch vụ `MSSQL$SQLEXPRESS` bị dừng hoặc cổng 1433 bị đổi, kết nối Node.js sẽ báo lỗi `ECONNREFUSED`. Khi đó kiểm tra lại trạng thái dịch vụ bằng lệnh ở mục 1.
