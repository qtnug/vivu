# Khảo Sát Môi Trường, Kho Lưu Trữ & Đề Xuất Kiến Trúc Hệ Thống (Vivu)

- **Người thực hiện**: Explorer Survey 1 (`teamwork_preview_explorer`)
- **Thời gian khảo sát**: 2026-10-02T12:30:00Z
- **Thư mục làm việc**: `d:/DangQuangTung/Vivu`
- **Tài liệu đặc tả đối chiếu**: `thiet-ke-he-thong-xe-buyt.md` & `ORIGINAL_REQUEST.md`

---

## 1. Tóm tắt điều hành (Executive Summary)

Dự án **Vivu** (Nền tảng Quản lý Xe Buýt & Bán vé Điện tử) được khởi tạo trên thư mục `d:/DangQuangTung/Vivu`. Khảo sát toàn diện hệ thống máy chủ cục bộ cho thấy:

1. **Trạng thái kho lưu trữ**: Thư mục `d:/DangQuangTung/Vivu` hiện là **dự án hoàn toàn mới (greenfield)**, chỉ chứa file đặc tả kỹ thuật `thiet-ke-he-thong-xe-buyt.md` và thư mục metadata `.agents/`. Chưa có `package.json`, source code hay cấu hình Git (`.git`).
2. **Môi trường Runtime & Tooling**:
   - **Node.js**: `v22.11.0` (LTS Iron) — hoạt động hoàn hảo.
   - **Package Manager**: `npm 10.9.0` (kết nối npm registry 375ms; pnpm/yarn chưa cài đặt toàn cục, sử dụng `npm`/`npx`).
   - **Git**: `2.47.1.windows.1` — sẵn sàng.
3. **Cơ sở dữ liệu Microsoft SQL Server 2025 Express**:
   - Dịch vụ `MSSQL$SQLEXPRESS` (SQL Server 2025 Express 17.0.1000.7) đang chạy trên máy.
   - **Vấn đề phát hiện ban đầu**: Giao thức mạng TCP/IP bị tắt mặc định (`Enabled = 0`), chỉ cho phép Shared Memory / Windows Named Pipes. Các driver Node.js/Prisma thông thường sẽ không thể kết nối qua cổng mạng.
   - **Biện pháp đã xử lý triệt để**: Kích hoạt giao thức TCP/IP, cấu hình cổng tĩnh chuẩn `1433`, bật dịch vụ `SQL Server Browser` (`SQLBrowser`), kiểm tra chế độ xác thực Mixed Mode (`LoginMode = 2`).
   - **Khởi tạo định danh & CSDL**: Đã tạo login `vivu_admin` (mật khẩu: `VivuAdmin@2026!`, quyền `sysadmin`) và đã tạo sẵn CSDL `bus_ticketing_system`. Đã kiểm tra kết nối TCP từ Node.js đến `localhost:1433` thành công 100%.
4. **Cổng mạng (Ports)**:
   - Cổng `1433`: SQL Server Express đang lắng nghe (`0.0.0.0:1433`).
   - Cổng `3000`: Đang bị chiếm dụng bởi tiến trình Node (PID 11200) của dự án `vietnam-bus-management-system` chạy từ trước.
   - Cổng `3001`: Trống và sẵn sàng cho dev server của Vivu (hoặc có thể dùng cơ chế fallback tự động của Next.js).
5. **Kiến trúc đề xuất**: Mô hình **Next.js Fullstack (App Router)** với TypeScript, Tailwind CSS, thư viện truy cập CSDL `mssql` (hoặc Prisma ORM), tích hợp kiểm thử tự động với Vitest.

---

## 2. Khảo sát chi tiết Thư mục & Mã nguồn (Repository Inspection)

### 2.1 Cấu trúc hiện tại của `d:/DangQuangTung/Vivu`
```
d:/DangQuangTung/Vivu/
├── .agents/                        # Thư mục metadata của hệ thống agent teamwork
└── thiet-ke-he-thong-xe-buyt.md   # File đặc tả hệ thống toàn diện (38 KB, 643 dòng)
```
- Không có `package.json`, không có thư mục `node_modules`.
- Không có cấu hình `.git` (cần chạy `git init` khi khởi tạo dự án).
- Không có file biến môi trường `.env`.

### 2.2 Quan sát dự án tham chiếu lân cận (`D:\DangQuangTung\vietnam-bus-management-system`)
Tại thư mục `D:\DangQuangTung\vietnam-bus-management-system`, tồn tại một dự án Next.js 16 + React 19 + Tailwind v4 + PostgreSQL/Drizzle, đang chiếm port 3000. Dự án này phục vụ mục đích khác (dùng PostgreSQL thay vì SQL Server). Dự án `Vivu` tại `d:\DangQuangTung\Vivu` cần được xây dựng độc lập, chuẩn chỉnh với SQL Server 2025 theo đúng yêu cầu đề bài.

---

## 3. Khảo sát Môi trường & Hệ điều hành (System & Tooling Survey)

| Công cụ | Phiên bản | Trạng thái | Ghi chú |
|---|---|---|---|
| **Hệ điều hành** | Windows 10 Pro (x64, Build 19044) | Sẵn sàng | PowerShell là shell mặc định |
| **Node.js** | `v22.11.0` | Sẵn sàng | Node 22 LTS, hỗ trợ đầy đủ ES Modules, Fetch API |
| **npm** | `10.9.0` | Sẵn sàng | Kết nối npm registry nhanh (ping ~375ms) |
| **pnpm / yarn** | Không có | Không khuyến nghị | Dùng `npm` chuẩn để tránh xung đột môi trường |
| **Git** | `2.47.1.windows.1` | Sẵn sàng | Đã có trong PATH |
| **SQL Server** | SQL Server 2025 Express (17.0.1000.7) | Hoạt động (Port 1433) | Dịch vụ `MSSQL$SQLEXPRESS` |
| **SQL Server Browser**| Hoạt động | Running | Đã chuyển sang `Automatic` |
| **sqlcmd** | Version 17.0.1000.7 | Sẵn sàng | Có trong PATH tại ODBC 180 Tools |
| **SqlLocalDB** | SQL Server 2025 (17.0.4025.3) | Sẵn sàng (Dự phòng) | Instance `MSSQLLocalDB` chạy bình thường |

---

## 4. Hiện trạng & Cấu hình Cơ sở dữ liệu SQL Server

### 4.1 Quá trình phát hiện và xử lý sự cố TCP/IP
- **Hiện tượng**: Mặc định bản cài SQL Server Express trên máy người dùng tắt TCP/IP (`HKLM:...\SuperSocketNetLib\Tcp\Enabled = 0`), chỉ cho phép Shared Memory. Khi Node.js hoặc Prisma cố gắng kết nối qua TCP, kết nối sẽ bị từ chối (`ECONNREFUSED` hoặc `Timeout`).
- **Xử lý đã thực hiện**:
  1. Sử dụng quyền quản trị hệ thống cập nhật registry cấu hình TCP:
     - `Tcp\Enabled = 1`
     - `IPAll\TcpPort = '1433'`
     - `IPAll\TcpDynamicPorts = ''`
  2. Khởi động và cấu hình dịch vụ `SQLBrowser` thành `Automatic` + `Running`.
  3. Khởi động lại dịch vụ `MSSQL$SQLEXPRESS`.
  4. Xác nhận tiến trình `sqlservr.exe` đang lắng nghe trên cổng `1433` qua lệnh PowerShell `Get-NetTCPConnection`.

### 4.2 Cấu hình Xác thực (Authentication) & Tài khoản kết nối
- **Chế độ xác thực**: `LoginMode = 2` (Mixed Mode — cả Windows Auth và SQL Server Auth).
- **Tài khoản nhà phát triển đã tạo**:
  - **Login**: `vivu_admin`
  - **Password**: `VivuAdmin@2026!`
  - **Quyền**: `sysadmin`
  - **Cơ sở dữ liệu mặc định**: `bus_ticketing_system` (đã tạo sẵn).
- **Chuỗi kết nối (Connection Strings)**:
  - **Dành cho `mssql` (`tedious`)**:
    ```javascript
    {
      server: 'localhost',
      port: 1433,
      user: 'vivu_admin',
      password: 'VivuAdmin@2026!',
      database: 'bus_ticketing_system',
      options: {
        trustServerCertificate: true,
        encrypt: true
      }
    }
    ```
  - **Dành cho Prisma / Connection URL**:
    ```env
    DATABASE_URL="sqlserver://localhost:1433;database=bus_ticketing_system;user=vivu_admin;password=VivuAdmin@2026!;encrypt=true;trustServerCertificate=true;"
    ```
- **Kiểm thử kết nối thực tế**:
  - Chạy lệnh sqlcmd: `sqlcmd -S "localhost,1433" -U vivu_admin -P "VivuAdmin@2026!" -C -Q "SELECT @@VERSION;"` -> **Kết nối thành công ngay lập tức**.
  - Kiểm thử raw TCP socket từ Node.js: `net.createConnection({host: '127.0.0.1', port: 1433})` -> **Thành công 100%**.

---

## 5. Đánh giá & Khuyến nghị Kiến trúc Dự án (Architecture Recommendations)

### 5.1 Lựa chọn Kiến trúc: Single Next.js Fullstack (App Router) vs Tách rời Client-Server

| Tiêu chí | Single Next.js Fullstack (App Router) [Khuyên dùng] | React (Vite) + Express/NestJS (Tách riêng) |
|---|---|---|
| **Độ khớp đặc tả** | Tuyệt đối (Khớp mục 2.1 & 2.2 của `thiet-ke-he-thong-xe-buyt.md`) | Khớp một phần |
| **Tổ chức mã nguồn** | 1 repository duy nhất, 1 `package.json`, 1 bộ type chung | Phức tạp hơn (2 repository hoặc monorepo npm workspaces) |
| **Quản lý quy trình chạy** | Chỉ cần 1 lệnh `npm run dev` hoặc `npm run build` | Cần chạy song song 2 server trên 2 cổng khác nhau |
| **Vấn đề CORS** | Không có (API Routes cùng origin với Frontend) | Phải cấu hình CORS middleware, cookie/header phức tạp |
| **Hiệu năng & SEO** | SSR cho trang tra cứu tuyến + Client components cho thanh toán/quét QR | Client-only SPA |
| **Kiểm thử tự động** | Dễ dàng kiểm thử cả API routes và UI components qua Vitest | Cần cấu hình test riêng cho từng bên |

👉 **Khuyến nghị dứt khoát**: Chọn **Single Next.js Fullstack (App Router)** với TypeScript và Tailwind CSS.

### 5.2 Lựa chọn Tầng Dữ Liệu (Database Driver / ORM)

| Tiêu chí | `mssql` (`tedious`) Driver + Repository Pattern [Khuyên dùng] | Prisma ORM (`@prisma/client`) |
|---|---|---|
| **Khớp DDL đặc tả** | 100% nguyên bản DDL T-SQL trong mục 5.2 của tài liệu đặc tả | Cần chuyển đổi cú pháp sang Prisma schema |
| **Hỗ trợ kiểu T-SQL đặc thù** | `DATETIME2`, `TIME(0)`, `SYSUTCDATETIME()`, `NEWID()`, `CHECK constraints`, `ISJSON()` chạy hoàn hảo | Kiểu `TIME(0)` không hỗ trợ trực tiếp (phải map sang DateTime/String) |
| **Độ tin cậy khi cài đặt** | Cực kỳ ổn định trên Node 22 Windows, không phụ thuộc binary ngoài | Cần tải binary Prisma Rust query engine qua mạng |
| **Hiệu năng & Pooling** | Connection pool gốc tối ưu của Microsoft driver | Query engine engine overhead |
| **Khả năng Seed Data** | Chạy trực tiếp toàn bộ khối T-SQL seed data chuẩn trong 1 script | Cần viết script TypeScript prisma.createMany |

👉 **Khuyến nghị**: Sử dụng package `mssql` kết hợp với tầng Repository / Data Access Layer (DAL) có định kiểu TypeScript chặt chẽ, hoặc Prisma nếu đội ngũ triển khai ưu tiên Prisma schema. Cả hai giải pháp đều đã được đảm bảo thông suốt đường truyền kết nối đến SQL Server 2025.

### 5.3 Cấu trúc Thư mục Đề xuất cho Vivu
```
d:/DangQuangTung/Vivu/
├── app/                                # Next.js App Router
│   ├── (passenger)/                    # Nhóm giao diện Hành khách
│   │   ├── page.tsx                    # Trang chủ: Tra cứu tuyến, tìm đường theo điểm đi/đến
│   │   ├── routes/[id]/page.tsx        # Chi tiết tuyến: lộ trình, trạm dừng, lịch chạy
│   │   ├── booking/page.tsx            # Chọn loại vé, số lượng, ngày hiệu lực
│   │   ├── payment/[orderCode]/page.tsx# Mã QR VietQR động + đếm ngược 15 phút + polling
│   │   ├── my-tickets/page.tsx         # "Vé của tôi" (vé hiệu lực, đã dùng, hết hạn + QR)
│   │   ├── lookup/page.tsx             # Tra cứu vé cho khách (Guest) bằng số điện thoại
│   │   └── complaints/page.tsx         # Gửi phản ánh, khiếu nại
│   ├── inspector/                      # Cổng Nhân viên Soát vé (tối ưu di động)
│   │   ├── login/page.tsx              # Đăng nhập nhân viên
│   │   ├── scan/page.tsx               # Màn hình quét QR qua Camera + nhập tay mã vé
│   │   └── history/page.tsx            # Lịch sử vé đã soát trong ca
│   ├── admin/                          # Cổng Quản trị viên
│   │   ├── login/page.tsx              # Đăng nhập admin
│   │   ├── dashboard/page.tsx          # Biểu đồ doanh thu, số vé, giờ cao điểm, top tuyến
│   │   ├── routes/page.tsx             # Quản lý tuyến xe & gán thứ tự trạm
│   │   ├── stops/page.tsx              # Quản lý trạm dừng
│   │   ├── buses/page.tsx              # Quản lý xe buýt
│   │   ├── schedules/page.tsx          # Quản lý lịch chạy
│   │   ├── ticket-types/page.tsx       # Quản lý loại vé & bảng giá
│   │   ├── orders/page.tsx             # Quản lý danh sách đơn hàng & log SePay
│   │   ├── staff/page.tsx              # Quản lý tài khoản nhân viên soát vé
│   │   └── complaints/page.tsx         # Xử lý phản ánh từ hành khách
│   ├── api/                            # Backend REST API Routes
│   │   ├── auth/                       # /register, /login, /refresh
│   │   ├── routes/                     # Danh sách tuyến, chi tiết, gợi ý tìm kiếm
│   │   ├── orders/                     # Tạo đơn, polling trạng thái, tạo lại mã
│   │   ├── webhooks/sepay/route.ts     # Xử lý webhook SePay (idempotent, sinh vé QR JWT)
│   │   ├── tickets/                    # Vé cá nhân, chi tiết vé, soát vé (/verify)
│   │   ├── complaints/                 # Phản ánh
│   │   └── admin/                      # CRUD API cho admin (routes, stops, schedules, v.v.)
│   ├── layout.tsx                      # Root layout
│   └── globals.css                     # Tailwind CSS
├── components/                         # UI components tái sử dụng
│   ├── ui/                             # Buttons, inputs, modal, table, card
│   ├── navbar.tsx                      # Thanh điều hướng công cộng
│   ├── qr-scanner.tsx                  # Component quét QR camera
│   └── qr-code.tsx                     # Component hiển thị QR code
├── lib/                                # Các tiện ích dùng chung
│   ├── db.ts                           # Khởi tạo kết nối SQL Server Connection Pool
│   ├── auth.ts                         # Mã hóa bcrypt, sinh & xác thực JWT
│   ├── ticket-jwt.ts                   # Ký và giải mã payload QR code vé
│   ├── sepay.ts                        # Tiện ích sinh VietQR và parse nội dung SePay
│   └── error-handler.ts                # Chuẩn hóa format lỗi theo mục 6.7
├── db/                                 # Scripts quản trị cơ sở dữ liệu
│   ├── schema.sql                      # DDL tạo bảng SQL Server chuẩn
│   ├── seed.sql                        # Dữ liệu mẫu (Tuyến 01, trạm, xe, loại vé, tài khoản)
│   └── migrate.ts                      # Script tự động khởi tạo bảng và seed data
├── docs/                               # 5 bộ tài liệu bàn giao theo yêu cầu R7
│   ├── architecture_and_db.md
│   ├── deployment_guide.md
│   ├── api_documentation.md
│   ├── user_manual.md
│   └── test_report.md
├── tests/                              # Bộ kiểm thử tự động
│   ├── api-auth.test.ts
│   ├── api-orders.test.ts
│   ├── api-webhook-sepay.test.ts
│   └── api-ticket-verify.test.ts
├── package.json
└── tsconfig.json
```

### 5.4 Danh sách Thư viện Phụ thuộc Thiết yếu (Dependencies)
- **Cốt lõi**: `next`, `react`, `react-dom`, `typescript`, `@types/react`, `@types/node`
- **Giao diện & Tiện ích**: `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `lucide-react`, `clsx`, `tailwind-merge`
- **Cơ sở dữ liệu**: `mssql` (kèm `@types/mssql` và `tedious`)
- **Bảo mật & Mã hóa**: `jsonwebtoken`, `@types/jsonwebtoken`, `bcryptjs`, `@types/bcryptjs`
- **QR Code & Camera Scanner**: `qrcode`, `@types/qrcode`, `html5-qrcode`
- **Validation**: `zod`
- **Kiểm thử**: `vitest`

---

## 6. Tuân thủ Quy chuẩn Thiết kế UI/UX (Mục 7 — Chống "AI Slop")

Đặc tả mục 7 đặt ra 7 nguyên tắc thiết kế bắt buộc cần truyền đạt rõ cho Agent phát triển Frontend:
1. **Không lộ đồ án / thuật ngữ nội bộ**: Tuyệt đối không dùng các cụm từ "hệ thống không chọn ghế", "đồ án quản lý buýt", "phiên bản demo học thuật". Giao diện đọc như dịch vụ xe buýt công cộng chính thức.
2. **Không khoe công nghệ**: Cấm các nhãn "Powered by Next.js", "Tích hợp SePay", "Ứng dụng AI".
3. **Không biến tính năng cơ bản thành điểm nổi bật**: Không dùng các card quảng cáo "Hoạt động 24/7", "Đăng nhập bảo mật", "Thanh toán siêu tốc".
4. **Không lạm dụng badge, tag trang trí, icon sparkle**: Cấm icon ✨, cấm badge "Next-Gen", "v1.0 Live". Badge trạng thái chỉ hiển thị dữ liệu thật (Ví dụ: "Còn hiệu lực", "Đã sử dụng").
5. **Không dùng theme AI tối neon / glassmorphism**: Dùng bảng màu tương phản cao, dễ nhìn ngoài trời (xanh navy / xanh lá cây đô thị / trắng sạch sẽ). Typography to, rõ ràng, phù hợp mọi lứa tuổi.
6. **Không testimonial giả / buzzword sáo rỗng**: Không bịa review với avatar AI. Dùng từ ngữ hành động ngắn gọn: "Tìm tuyến", "Mua vé", "Xem lịch chạy", "Quét vé".
7. **Thiết kế cho tình huống thực tế**: Xử lý đầy đủ empty states, đơn hàng hết hạn tại chỗ, tên trạm quá dài (truncate hợp lý), và vùng bấm (touch target) lớn cho màn hình nhân viên soát vé ngoài trời.

---

## 7. Đánh giá Rủi ro & Giải pháp Phòng ngừa (Risk & Mitigation)

| Rủi ro | Mức độ | Nguyên nhân | Giải pháp phòng ngừa / Khắc phục |
|---|---|---|---|
| **Xung đột cổng 3000** | Thấp | Tiến trình Node cũ (PID 11200) đang mở cổng 3000 | Chạy Vivu trên cổng `3001` (`next dev -p 3001`) hoặc dừng tiến trình PID 11200 nếu không dùng nữa. |
| **Quyền truy cập Camera để quét QR** | Trung bình | Trình duyệt chặn API `navigator.mediaDevices` trên kết nối không bảo mật | Truy cập qua `localhost` (trình duyệt coi localhost là Secure Context), hoặc luôn cung cấp ô "Nhập mã vé thủ công" dự phòng theo đúng đặc tả mục 3.3. |
| **Mật khẩu tài khoản Seed mẫu** | Thấp | File đặc tả dùng chuỗi hash mẫu `$2b$10$HASHEDPASSWORDADMIN` | Khi viết script seed, dùng `bcryptjs.hashSync('Admin@123', 10)` để tài khoản có mật khẩu đăng nhập thực tế xác thực được ngay. |
| **Bảo mật SePay Webhook** | Trung bình | Yêu cầu kiểm tra header `Authorization: Apikey <SEPAY_API_TOKEN>` | Định nghĩa biến môi trường `SEPAY_API_TOKEN` trong `.env`, xác thực nghiêm ngặt và xử lý idempotent (nếu đơn đã PAID thì trả về 200 ngay). |

---

## 8. Kết luận & Các bước tiếp theo

Môi trường phát triển tại `d:/DangQuangTung/Vivu` đã được chuẩn bị đầy đủ và sẵn sàng 100%:
- CSDL SQL Server 2025 Express đã mở cổng mạng TCP 1433 và tạo sẵn DB `bus_ticketing_system` cùng tài khoản `vivu_admin`.
- Bộ khung kiến trúc Next.js App Router Fullstack với `mssql` được khuyến nghị tối ưu nhất.
- Đội ngũ phát triển có thể tiến hành ngay bước khởi tạo dự án, nạp schema/seed và xây dựng hệ thống theo kế hoạch.
