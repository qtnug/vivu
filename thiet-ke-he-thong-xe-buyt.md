# Thiết kế hệ thống: Nền tảng Quản lý Xe Buýt & Bán vé Điện tử

> Phạm vi: Đồ án học phần — mô phỏng hệ thống bán vé xe buýt đô thị Việt Nam (vé không chọn chỗ). 3 vai trò: **Người dùng (hành khách)**, **Nhân viên soát vé**, **Admin**.

---

## 1. Tổng quan

### 1.1 Bối cảnh
- Mô hình xe buýt đô thị Việt Nam: hành khách mua vé lượt (single ride), vé ngày (daily pass) hoặc vé tháng (monthly pass) — **không có khái niệm đặt chỗ/ghế**.
- Vị trí xe, thời gian chạy được tính toán/mô phỏng tĩnh (dựa trên lịch trình + tốc độ trung bình), không dùng GPS phần cứng thật.

### 1.2 Vai trò hệ thống

| Vai trò | Mô tả | Quyền chính |
|---|---|---|
| Hành khách (User) | Người dùng công khai, có thể đăng ký tài khoản | Tra cứu tuyến, mua vé, thanh toán, xem vé, gửi phản ánh |
| Nhân viên soát vé (Inspector) | Nhân viên trên xe/tại trạm | Quét QR, xác nhận vé hợp lệ, đánh dấu vé đã dùng |
| Admin | Quản trị hệ thống | Quản lý tuyến/trạm/xe/lịch chạy, loại vé, đơn hàng, xem báo cáo doanh thu, xử lý phản ánh |

### 1.3 Nguyên tắc phạm vi đồ án
- Không tích hợp SMS/Zalo OA — chỉ thông báo trong ứng dụng (in-app notification).
- Không theo dõi GPS thực — vị trí/ETA được tính tĩnh từ lịch chạy.
- Không có luồng hoàn tiền phức tạp hay đa tài khoản ngân hàng — 1 tài khoản SePay duy nhất, huỷ đơn tự động nếu quá hạn thanh toán.
- Không có hệ thống vé liên tuyến hay lịch làm việc nhân viên.

---

## 2. Kiến trúc hệ thống & Tech Stack

### 2.1 Kiến trúc tổng thể

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Passenger Web   │     │   Inspector Web   │     │   Admin Web     │
│  (Next.js/React) │     │  (Next.js/React)  │     │ (Next.js/React) │
└────────┬─────────┘     └─────────┬─────────┘     └────────┬────────┘
         │                         │                         │
         └─────────────┬───────────┴─────────────────────────┘
                        │  REST API (Next.js API Routes / NestJS)
                        ▼
         ┌───────────────────────────────────┐
         │          Backend Server            │
         │  - Auth (JWT)                      │
         │  - Order & Ticket Service           │
         │  - Route/Stop/Schedule Service      │
         │  - Webhook Handler (SePay)          │
         │  - QR Generator & Verifier          │
         └──────────────┬──────────────────────┘
                        │
         ┌──────────────┼──────────────────┐
         ▼                                 ▼
┌─────────────────┐              ┌──────────────────┐
│  SQL Server DB   │              │  External APIs    │
└─────────────────┘              │  - Goong Map API   │
                                   │  - SePay Webhook   │
                                   └──────────────────┘
```

### 2.2 Đề xuất công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js (React) + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes (hoặc NestJS nếu tách riêng) |
| Database | SQL Server |
| Auth | JWT + refresh token, bcrypt cho mật khẩu |
| Bản đồ | Goong Map API (`v1/direction`, `v1/geocode`, `v1/place`) |
| Thanh toán | SePay (webhook + VietQR) |
| QR Code | thư viện `qrcode` (tạo), JWT ký payload vé |
| Triển khai | Vercel (frontend/API), DB hosting riêng (Railway/Neon/MonsterASP) |

---

## 3. Đặc tả chức năng chi tiết

### 3.1 Cổng thông tin hành khách (Passenger Portal)

#### 3.1.1 Tra cứu tuyến & bản đồ
- Tìm kiếm tuyến theo số hiệu, điểm đi/điểm đến.
- Xem danh sách trạm dừng theo thứ tự, hiển thị tuyến đường (polyline) trên bản đồ qua Goong Map.
- Gợi ý tuyến phù hợp khi nhập điểm đi — điểm đến (so khớp trạm gần nhất).
- Ước tính thời gian di chuyển dựa trên khoảng cách + tốc độ trung bình (tĩnh, không real-time).
- Xem khung giờ chạy (timetable) tĩnh theo từng tuyến.

#### 3.1.2 Tài khoản
- Đăng ký / đăng nhập (email + mật khẩu).
- Mua vé dạng khách (guest checkout) — nhập số điện thoại để nhận vé, không bắt buộc tài khoản.
- Trang cá nhân: thông tin, đổi mật khẩu.

#### 3.1.3 Mua vé
- Chọn loại vé:
  - **Vé lượt (Single Ride)** — theo tuyến, hiệu lực 1 chuyến/trong khung giờ nhất định.
  - **Vé ngày (Daily Pass)** — hiệu lực toàn bộ tuyến trong 1 ngày.
  - **Vé tháng (Monthly Pass)** — hiệu lực 30 ngày, có thể giới hạn theo 1 hoặc nhiều tuyến.
  - Giá ưu đãi học sinh/sinh viên (chọn loại khách khi mua, không yêu cầu xác minh giấy tờ — nằm ngoài phạm vi đồ án).
- Chọn số lượng, ngày kích hoạt.
- **Không chọn chỗ ngồi** (explicit, không hiển thị UI ghế).
- Tạo đơn hàng ở trạng thái `PENDING`, sinh mã đơn hàng duy nhất.

#### 3.1.4 Thanh toán
- Hiển thị mã QR VietQR động: số tài khoản, chủ tài khoản, số tiền, nội dung chuyển khoản chứa mã đơn hàng.
- Đếm ngược thời gian hiệu lực đơn hàng (vd 15 phút) — hiển thị trực quan.
- Tự động kiểm tra trạng thái thanh toán (poll hoặc WebSocket/SSE), cập nhật UI khi `PAID`.
- Hết hạn → đơn chuyển `CANCELLED`, cho phép tạo lại mã QR/đơn mới.

#### 3.1.5 Vé điện tử
- Sau khi `PAID`: sinh vé với mã QR (JWT ký, chứa mã vé, loại vé, thời hạn hiệu lực).
- Danh sách "Vé của tôi": vé đang hiệu lực, đã dùng, đã hết hạn.
- Xem chi tiết vé: tuyến áp dụng, thời hạn, trạng thái.
- Lưu tuyến/trạm yêu thích để tra cứu nhanh.

#### 3.1.6 Thông báo & phản ánh
- Thông báo trong ứng dụng: thanh toán thành công, vé sắp hết hạn (daily/monthly pass).
- Form gửi phản ánh/khiếu nại đơn giản (loại phản ánh, nội dung, tuyến liên quan) — admin xem và xử lý.

---

### 3.2 Nghiệp vụ thanh toán SePay (Tự động qua Webhook)

- **Endpoint:** `POST /api/webhooks/sepay`
- **Bảo mật:** xác thực token API trong header, kiểm tra chữ ký/nguồn gọi hợp lệ.
- **Luồng xử lý:**
  1. Nhận payload: `transferAmount`, `content` (chứa mã đơn hàng), `referenceCode`.
  2. Trích xuất mã đơn hàng từ nội dung chuyển khoản (regex).
  3. Đối chiếu đơn hàng: số tiền khớp, trạng thái đang `PENDING` và chưa hết hạn.
  4. Xử lý **idempotent** — nếu đơn đã `PAID`, bỏ qua (tránh xử lý trùng khi webhook gọi lại).
  5. Cập nhật đơn `PAID`, ghi log vào `payment_transactions`.
  6. Sinh vé (`tickets`) tương ứng số lượng trong đơn, mỗi vé có mã QR riêng.
  7. Bắn sự kiện real-time (WebSocket/SSE hoặc polling phía client) để cập nhật UI ngay.
- **Cơ chế tự huỷ:** cron job hoặc kiểm tra khi truy vấn — đơn `PENDING` quá X phút tự chuyển `CANCELLED`.

---

### 3.3 Trang Nhân viên soát vé (Inspector)

- Đăng nhập riêng (role `inspector`), giao diện tối giản, tối ưu cho di động/máy quét.
- **Quét mã QR vé:**
  - Dùng camera thiết bị quét QR, giải mã JWT, xác minh chữ ký & thời hạn.
  - Kiểm tra trạng thái vé: `ACTIVE` → hợp lệ (hiển thị xanh), `USED`/`EXPIRED` → không hợp lệ (hiển thị đỏ + lý do).
  - Xác nhận soát vé → cập nhật trạng thái vé thành `USED`, ghi nhận thời gian + (tuỳ chọn) tuyến đang soát.
- Lịch sử các vé đã soát trong ca làm việc (danh sách đơn giản, không cần module lịch làm việc).
- Nhập thủ công mã vé nếu không quét được QR (dự phòng).

---

### 3.4 Trang Admin

#### 3.4.1 Dashboard
- Tổng quan: doanh thu hôm nay/tuần/tháng, số vé bán ra, số tuyến đang hoạt động.
- Biểu đồ: doanh thu theo thời gian, tuyến bán chạy, khung giờ cao điểm (tính từ dữ liệu `orders`/`tickets` có sẵn, không cần nguồn ngoài).

#### 3.4.2 Quản lý tuyến & trạm
- CRUD tuyến xe buýt (số hiệu, tên, chiều đi/chiều về).
- CRUD trạm dừng, gắn toạ độ (lat/lng) qua Goong Map Geocode.
- Sắp xếp thứ tự trạm theo tuyến (`route_stops`), khoảng cách tích luỹ.

#### 3.4.3 Quản lý xe & lịch chạy
- CRUD xe (biển số, sức chứa).
- Gán xe cho tuyến, cấu hình khung giờ chạy tĩnh (`schedules`).

#### 3.4.4 Quản lý loại vé & giá
- CRUD loại vé (Single Ride / Daily Pass / Monthly Pass), giá, thời hạn hiệu lực, đối tượng áp dụng (thường/học sinh-sinh viên).

#### 3.4.5 Quản lý đơn hàng & vé
- Danh sách đơn hàng, lọc theo trạng thái (`PENDING`, `PAID`, `CANCELLED`).
- Xem chi tiết vé đã sinh ra từ đơn.
- Đối chiếu log giao dịch SePay (`payment_transactions`).

#### 3.4.6 Quản lý phản ánh
- Xem danh sách phản ánh từ hành khách, cập nhật trạng thái xử lý (mới / đang xử lý / đã xử lý).

#### 3.4.7 Quản lý nhân viên
- CRUD tài khoản nhân viên soát vé (tạo tài khoản, khoá/mở tài khoản).

---

## 4. Luồng nghiệp vụ chính (User Flows)

### 4.1 Luồng mua vé — thanh toán — nhận vé
```
Hành khách chọn tuyến + loại vé + số lượng
        ↓
Tạo đơn hàng (PENDING) + mã đơn hàng duy nhất
        ↓
Hiển thị QR VietQR (đếm ngược X phút)
        ↓
   ┌────┴────┐
   ▼         ▼
Thanh toán   Hết hạn
qua SePay    → CANCELLED
   ↓
Webhook SePay xác nhận
   ↓
Đơn → PAID → Sinh vé (QR riêng từng vé)
   ↓
Hành khách xem vé trong "Vé của tôi"
```

### 4.2 Luồng soát vé
```
Nhân viên mở camera quét QR
        ↓
Giải mã + xác thực chữ ký JWT
        ↓
   ┌────┴─────────┐
   ▼               ▼
Vé ACTIVE        Vé USED/EXPIRED/không hợp lệ
→ Hiển thị xanh  → Hiển thị đỏ + lý do
→ Xác nhận
→ Cập nhật USED
```

---

## 5. Thiết kế cơ sở dữ liệu

### 5.1 Sơ đồ quan hệ (mô tả)

- `users` (1) ─── (N) `orders`
- `orders` (1) ─── (N) `tickets`
- `orders` (1) ─── (N) `payment_transactions`
- `bus_routes` (1) ─── (N) `route_stops` ─── (N) `bus_stops`
- `bus_routes` (1) ─── (N) `schedules` ─── (N) `buses`
- `ticket_types` (1) ─── (N) `orders`
- `bus_routes` (1) ─── (N) `tickets` (vé gắn với tuyến áp dụng)

### 5.2 SQL Script đầy đủ (Microsoft SQL Server / T-SQL)

```sql
-- =========================================
-- DATABASE: bus_ticketing_system (SQL Server)
-- =========================================
-- Ghi chú: SQL Server không có kiểu ENUM → dùng VARCHAR + CHECK constraint.
-- UUID → UNIQUEIDENTIFIER (DEFAULT NEWID()). TIMESTAMP → DATETIME2.
-- JSONB → NVARCHAR(MAX) (SQL Server có hàm JSON_VALUE/ISJSON để truy vấn).

CREATE DATABASE bus_ticketing_system;
GO
USE bus_ticketing_system;
GO

-- ---------- USERS ----------
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    full_name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) UNIQUE,
    phone NVARCHAR(20) UNIQUE,
    password_hash NVARCHAR(255),              -- NULL nếu là guest checkout
    role VARCHAR(20) NOT NULL DEFAULT 'passenger'
        CHECK (role IN ('passenger', 'inspector', 'admin')),
    is_student BIT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
GO

-- ---------- BUS ROUTES ----------
CREATE TABLE bus_routes (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    route_code VARCHAR(20) NOT NULL UNIQUE,   -- vd: "01", "02"
    route_name NVARCHAR(255) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('FORWARD', 'BACKWARD')),
    description NVARCHAR(MAX),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- ---------- BUS STOPS ----------
CREATE TABLE bus_stops (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    stop_name NVARCHAR(255) NOT NULL,
    address NVARCHAR(500),
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_bus_stops_coords ON bus_stops(latitude, longitude);
GO

-- ---------- ROUTE_STOPS (thứ tự trạm theo tuyến) ----------
CREATE TABLE route_stops (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    stop_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_stops(id),  -- NO ACTION: tránh xung đột multiple cascade path
    stop_sequence INT NOT NULL,
    distance_from_start_km DECIMAL(6, 2) NOT NULL DEFAULT 0,
    CONSTRAINT uq_route_sequence UNIQUE (route_id, stop_sequence)
);
CREATE INDEX idx_route_stops_route ON route_stops(route_id);
GO

-- ---------- BUSES ----------
CREATE TABLE buses (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    capacity INT NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- ---------- SCHEDULES (lịch chạy tĩnh) ----------
CREATE TABLE schedules (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),
    bus_id UNIQUEIDENTIFIER REFERENCES buses(id),
    departure_time TIME(0) NOT NULL,
    average_speed_kmh DECIMAL(5, 2) NOT NULL DEFAULT 20.0,
    days_of_week VARCHAR(20) NOT NULL DEFAULT 'MON-SUN', -- vd: "MON-FRI"
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_schedules_route ON schedules(route_id);
GO

-- ---------- TICKET TYPES ----------
CREATE TABLE ticket_types (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    category VARCHAR(20) NOT NULL
        CHECK (category IN ('SINGLE_RIDE', 'DAILY_PASS', 'MONTHLY_PASS')),
    name NVARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    validity_hours INT,                       -- cho SINGLE_RIDE / DAILY_PASS
    validity_days INT,                        -- cho MONTHLY_PASS
    is_student_price BIT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1
);
GO

-- ---------- ORDERS ----------
CREATE TABLE orders (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_code VARCHAR(30) NOT NULL UNIQUE,   -- dùng làm nội dung CK
    user_id UNIQUEIDENTIFIER REFERENCES users(id),  -- NULL nếu guest
    guest_phone VARCHAR(20),
    ticket_type_id UNIQUEIDENTIFIER NOT NULL REFERENCES ticket_types(id),
    route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),
    quantity INT NOT NULL DEFAULT 1,
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED')),
    activation_date DATE NOT NULL,
    expires_at DATETIME2 NOT NULL,            -- hết hạn thanh toán
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_code ON orders(order_code);
CREATE INDEX idx_orders_user ON orders(user_id);
GO

-- ---------- TICKETS ----------
CREATE TABLE tickets (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    route_id UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id),
    ticket_code VARCHAR(50) NOT NULL UNIQUE,
    qr_payload NVARCHAR(MAX) NOT NULL,        -- JWT đã ký
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED')),
    valid_from DATETIME2 NOT NULL,
    valid_until DATETIME2 NOT NULL,
    used_at DATETIME2,
    used_by_inspector_id UNIQUEIDENTIFIER REFERENCES users(id),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_code ON tickets(ticket_code);
CREATE INDEX idx_tickets_order ON tickets(order_id);
GO

-- ---------- PAYMENT TRANSACTIONS (log webhook SePay) ----------
CREATE TABLE payment_transactions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    order_id UNIQUEIDENTIFIER REFERENCES orders(id),
    sepay_reference_code VARCHAR(100),
    transfer_amount DECIMAL(12, 2) NOT NULL,
    raw_content NVARCHAR(MAX),
    raw_payload NVARCHAR(MAX),                -- JSON dạng text, dùng ISJSON()/JSON_VALUE() để truy vấn
    processed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX idx_payment_tx_order ON payment_transactions(order_id);
GO

-- ---------- COMPLAINTS (phản ánh) ----------
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
GO

-- =========================================
-- SEED DATA
-- =========================================

-- Admin & Inspector mẫu
INSERT INTO users (full_name, email, password_hash, role) VALUES
(N'Quản trị viên', 'admin@busticket.vn', '$2b$10$HASHEDPASSWORDADMIN', 'admin'),
(N'Nguyễn Văn Soát', 'inspector1@busticket.vn', '$2b$10$HASHEDPASSWORDINSP', 'inspector');

-- Tuyến mẫu: Tuyến 01 (Hà Nội) - Long Biên - Hà Đông
INSERT INTO bus_routes (id, route_code, route_name, direction, description)
VALUES ('11111111-1111-1111-1111-111111111111', '01', N'Bến xe Long Biên - Bến xe Hà Đông', 'FORWARD', N'Tuyến trung tâm nội thành Hà Nội');

-- Trạm mẫu
INSERT INTO bus_stops (id, stop_name, address, latitude, longitude) VALUES
('a1111111-1111-1111-1111-111111111111', N'Bến xe Long Biên', N'Q. Ba Đình, Hà Nội', 21.0423, 105.8550),
('a2222222-1111-1111-1111-111111111111', N'Hồ Hoàn Kiếm', N'Q. Hoàn Kiếm, Hà Nội', 21.0285, 105.8542),
('a3333333-1111-1111-1111-111111111111', N'Ga Hà Nội', N'Q. Hoàn Kiếm, Hà Nội', 21.0245, 105.8412),
('a4444444-1111-1111-1111-111111111111', N'Ngã Tư Sở', N'Q. Đống Đa, Hà Nội', 20.9999, 105.8217),
('a5555555-1111-1111-1111-111111111111', N'Bến xe Hà Đông', N'Q. Hà Đông, Hà Nội', 20.9718, 105.7772);

-- Gán trạm vào tuyến theo thứ tự
INSERT INTO route_stops (route_id, stop_id, stop_sequence, distance_from_start_km) VALUES
('11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 1, 0),
('11111111-1111-1111-1111-111111111111', 'a2222222-1111-1111-1111-111111111111', 2, 2.5),
('11111111-1111-1111-1111-111111111111', 'a3333333-1111-1111-1111-111111111111', 3, 4.8),
('11111111-1111-1111-1111-111111111111', 'a4444444-1111-1111-1111-111111111111', 4, 8.2),
('11111111-1111-1111-1111-111111111111', 'a5555555-1111-1111-1111-111111111111', 5, 12.6);

-- Xe mẫu
INSERT INTO buses (license_plate, capacity) VALUES
('29B-123.45', 60),
('29B-678.90', 60);

-- Lịch chạy mẫu
INSERT INTO schedules (route_id, bus_id, departure_time, average_speed_kmh, days_of_week)
SELECT '11111111-1111-1111-1111-111111111111', id, '06:00:00', 18.5, 'MON-SUN' FROM buses WHERE license_plate = '29B-123.45';

-- Loại vé mẫu
INSERT INTO ticket_types (category, name, price, validity_hours, validity_days, is_student_price) VALUES
('SINGLE_RIDE', N'Vé lượt - Thường', 7000, 2, NULL, 0),
('SINGLE_RIDE', N'Vé lượt - Học sinh/Sinh viên', 3000, 2, NULL, 1),
('DAILY_PASS', N'Vé ngày', 30000, 24, NULL, 0),
('MONTHLY_PASS', N'Vé tháng - Thường', 200000, NULL, 30, 0),
('MONTHLY_PASS', N'Vé tháng - Học sinh/Sinh viên', 100000, NULL, 30, 1);
GO
```

> **Lưu ý cascade delete:** `route_stops.stop_id`, `schedules.route_id/bus_id`, `orders.*`, `tickets.route_id`, `payment_transactions.order_id`, `complaints.*` dùng `NO ACTION` (mặc định) để tránh lỗi *"multiple cascade paths"* của SQL Server khi nhiều bảng cùng tham chiếu một bảng gốc qua nhiều đường. Chỉ `route_stops.route_id` và `tickets.order_id` dùng `ON DELETE CASCADE` vì là quan hệ sở hữu trực tiếp, không trùng đường dẫn. Khi xoá dữ liệu gốc (route, order...), tầng ứng dụng (backend) nên xử lý xoá/chặn theo logic nghiệp vụ thay vì phụ thuộc hoàn toàn vào cascade.

---

## 6. Thiết kế API chi tiết

Quy ước chung: base path `/api`, định dạng `application/json`, xác thực bằng `Authorization: Bearer <JWT>` cho các endpoint cần đăng nhập. Lỗi trả về dạng thống nhất: `{ "error": { "code": "...", "message": "..." } }`.

### 6.1 Xác thực (Auth)

**`POST /api/auth/register`** — Đăng ký tài khoản hành khách
- Body: `{ fullName, email, phone, password }`
- Validate: email đúng định dạng & chưa tồn tại; phone chưa tồn tại; password ≥ 8 ký tự.
- Thành công (201): trả về `user` (không kèm password_hash) + `accessToken` + `refreshToken`.
- Lỗi: 409 nếu email/phone đã tồn tại; 400 nếu thiếu/sai định dạng trường.

**`POST /api/auth/login`** — Đăng nhập
- Body: `{ email, password }` hoặc `{ phone, password }`.
- Validate: so khớp password với `password_hash` (bcrypt compare).
- Thành công (200): `{ user, accessToken, refreshToken }`.
- Lỗi: 401 nếu sai thông tin đăng nhập; 403 nếu `is_active = false`.
- Áp dụng chung cho cả 3 vai trò (passenger/inspector/admin) — hệ thống dựa vào trường `role` trong JWT để phân quyền ở các endpoint khác, không có endpoint đăng nhập riêng cho từng vai trò.

**`POST /api/auth/refresh`** — Làm mới access token
- Body: `{ refreshToken }`.
- Thành công: `{ accessToken }` mới. Lỗi 401 nếu refresh token hết hạn/không hợp lệ.

### 6.2 Tuyến & Trạm (Public)

**`GET /api/routes`** — Danh sách tuyến đang hoạt động
- Query: `?search=` (lọc theo tên/mã tuyến).
- Response: mảng `{ id, routeCode, routeName, direction, stopCount }`.

**`GET /api/routes/:id`** — Chi tiết 1 tuyến
- Response: thông tin tuyến + danh sách trạm theo đúng thứ tự (`stopSequence`) kèm toạ độ, khoảng cách tích luỹ, và khung giờ chạy (`schedules`) gần nhất trong ngày.
- Lỗi: 404 nếu tuyến không tồn tại hoặc `is_active = false`.

**`GET /api/routes/search?fromLat=&fromLng=&toLat=&toLng=`** — Gợi ý tuyến theo điểm đi/đến
- Xử lý: tìm trạm gần nhất với điểm đi và điểm đến (trong bán kính ~500m), sau đó tìm các tuyến có cả hai trạm theo đúng thứ tự `stopSequence` tăng dần.
- Response: danh sách tuyến phù hợp, kèm trạm lên/xuống được chọn, khoảng cách và thời gian di chuyển ước tính (tính từ `distance_from_start_km` và `average_speed_kmh` của tuyến).
- Trường hợp không tìm thấy tuyến phù hợp: trả về mảng rỗng + gợi ý mở rộng bán kính tìm kiếm (không trả lỗi).

### 6.3 Đơn hàng & Thanh toán

**`POST /api/orders`** — Tạo đơn hàng mua vé
- Body: `{ ticketTypeId, routeId, quantity, activationDate, guestPhone? }`. Nếu có `Authorization` header hợp lệ, `userId` lấy từ token; nếu không, bắt buộc `guestPhone`.
- Validate: `ticketTypeId`/`routeId` tồn tại và đang active; `quantity` ≥ 1; `activationDate` không ở quá khứ.
- Xử lý: tính `totalAmount = price * quantity`; sinh `orderCode` duy nhất (vd `DH` + timestamp + random 4 ký tự); đặt `expiresAt = now + 15 phút`; trạng thái `PENDING`.
- Response (201): đơn hàng + nội dung chuyển khoản gợi ý (số tài khoản SePay, nội dung CK chứa `orderCode`) để frontend dựng mã QR VietQR.

**`GET /api/orders/:id`** — Xem trạng thái đơn hàng (dùng để polling)
- Response: `{ status, expiresAt, totalAmount, orderCode }`.
- Nếu `status = PENDING` và đã quá `expiresAt`: tự động cập nhật thành `EXPIRED` trước khi trả về (lazy expiry).

**`POST /api/orders/:id/regenerate`** — Tạo lại mã thanh toán cho đơn đã hết hạn
- Chỉ áp dụng khi đơn ở trạng thái `EXPIRED`/`CANCELLED`: tạo đơn mới sao chép thông tin, đơn cũ giữ nguyên trạng thái (không sửa lịch sử).

**`POST /api/webhooks/sepay`** — Nhận xác nhận thanh toán (server-to-server, không qua trình duyệt)
- Header: `Authorization: Apikey <SEPAY_API_TOKEN>` — xác thực nguồn gọi hợp lệ trước khi xử lý bất kỳ logic nào.
- Body (theo định dạng SePay gửi): `{ transferAmount, content, referenceCode, ... }`.
- Xử lý theo thứ tự: (1) trích mã đơn hàng từ `content`; (2) tìm đơn hàng tương ứng — 404 nếu không có; (3) nếu đơn đã `PAID`, trả về 200 ngay và dừng xử lý (đảm bảo idempotent khi SePay gọi lại webhook); (4) đối chiếu `transferAmount` phải khớp `totalAmount`, nếu lệch trả 400 và ghi log để admin đối soát thủ công; (5) nếu đơn đã quá `expiresAt`, chuyển `EXPIRED` và trả 400; (6) cập nhật đơn `PAID`, ghi bản ghi vào `payment_transactions`, sinh các bản ghi `tickets` tương ứng số lượng trong đơn — mỗi vé có `ticket_code` riêng và QR payload ký riêng.
- Response: 200 `{ message: "OK" }` bất kể SePay có cần nội dung trả về cụ thể hay không — luôn trả 2xx khi đã nhận và xử lý xong để tránh SePay gửi lại không cần thiết; chỉ trả lỗi 4xx khi payload sai định dạng hoặc không xác thực được nguồn gửi.

### 6.4 Vé điện tử

**`GET /api/tickets/me`** — Danh sách vé của hành khách đang đăng nhập
- Query: `?status=ACTIVE|USED|EXPIRED` (lọc tuỳ chọn).
- Response: mảng vé kèm thông tin tuyến áp dụng, thời hạn hiệu lực. Guest checkout không có endpoint này — vé của khách được tra cứu qua `GET /api/tickets/lookup?orderCode=&phone=`.

**`GET /api/tickets/:id`** — Chi tiết 1 vé (bao gồm ảnh QR được sinh từ `qr_payload`).

**`POST /api/tickets/verify`** — Soát vé (role: Inspector)
- Body: `{ qrPayload }` hoặc `{ ticketCode }` (nhập tay dự phòng khi không quét được).
- Xử lý: giải mã & xác minh chữ ký JWT trong `qrPayload`; tra `ticket_code` tương ứng; kiểm tra lần lượt: vé tồn tại → chưa `USED` → chưa quá `valid_until` → đang `ACTIVE`.
- Thành công: cập nhật vé thành `USED`, ghi `used_at` và `used_by_inspector_id`; response 200 `{ valid: true, ticket }`.
- Thất bại: không cập nhật gì cả; response 200 `{ valid: false, reason }` (không dùng mã lỗi HTTP vì đây là kết quả nghiệp vụ bình thường, không phải lỗi hệ thống) — lý do cụ thể: `"Vé đã được sử dụng"`, `"Vé đã hết hạn"`, `"Mã QR không hợp lệ"`.

### 6.5 Phản ánh

**`POST /api/complaints`** — Gửi phản ánh (Passenger/Guest)
- Body: `{ category, content, routeId? }`.

**`GET /api/admin/complaints`** / **`PUT /api/admin/complaints/:id`** — Admin xem & cập nhật trạng thái xử lý.

### 6.6 Admin — Quản lý vận hành

Nhóm endpoint CRUD chuẩn (role: Admin), đều theo mẫu REST thống nhất:

| Tài nguyên | Endpoints | Ghi chú nghiệp vụ |
|---|---|---|
| Tuyến | `GET/POST /api/admin/routes`, `PUT/DELETE /api/admin/routes/:id` | Xoá tuyến chỉ cho phép khi không còn đơn hàng/vé liên quan còn hiệu lực — nếu có, trả 409 và yêu cầu vô hiệu hoá (`is_active = false`) thay vì xoá cứng. |
| Trạm | `GET/POST /api/admin/stops`, `PUT/DELETE /api/admin/stops/:id` | Tạo/sửa trạm yêu cầu toạ độ hợp lệ (gợi ý qua Goong Geocode ở phía frontend trước khi gửi). |
| Gán trạm vào tuyến | `POST /api/admin/routes/:id/stops`, `PUT /api/admin/routes/:id/stops/reorder` | `reorder` nhận mảng thứ tự `stopId` mới, backend tính lại `stop_sequence` và `distance_from_start_km`. |
| Xe | `GET/POST /api/admin/buses`, `PUT/DELETE /api/admin/buses/:id` | — |
| Lịch chạy | `GET/POST /api/admin/schedules`, `PUT/DELETE /api/admin/schedules/:id` | Validate không trùng giờ chạy cho cùng 1 xe. |
| Loại vé | `GET/POST /api/admin/ticket-types`, `PUT/DELETE /api/admin/ticket-types/:id` | Sửa giá không ảnh hưởng đơn hàng đã tạo trước đó (đơn lưu `total_amount` snapshot tại thời điểm mua). |
| Nhân viên soát vé | `GET/POST /api/admin/staff`, `PUT /api/admin/staff/:id` (khoá/mở tài khoản) | Chỉ Admin tạo được tài khoản role `inspector`; không có đăng ký công khai cho vai trò này. |

**`GET /api/admin/orders`** — Danh sách & lọc đơn hàng
- Query: `?status=&fromDate=&toDate=&routeId=`.

**`GET /api/admin/dashboard`** — Số liệu tổng quan
- Response: doanh thu theo ngày/tuần/tháng (tổng hợp từ `orders` trạng thái `PAID`), số vé bán ra, top tuyến theo doanh thu, phân bố theo khung giờ (dựa trên `created_at` của đơn hàng `PAID`).

### 6.7 Mã lỗi chuẩn hoá

| Code | HTTP Status | Ý nghĩa |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Dữ liệu đầu vào không hợp lệ |
| `UNAUTHORIZED` | 401 | Chưa đăng nhập / token hết hạn |
| `FORBIDDEN` | 403 | Không đủ quyền (sai role) |
| `NOT_FOUND` | 404 | Không tìm thấy tài nguyên |
| `CONFLICT` | 409 | Xung đột dữ liệu (trùng email, đơn đã xử lý...) |
| `ORDER_EXPIRED` | 400 | Đơn hàng đã hết hạn thanh toán |
| `AMOUNT_MISMATCH` | 400 | Số tiền chuyển khoản không khớp đơn hàng |

---

## 7. Nguyên tắc UI/UX & copywriting — bắt buộc, tránh "AI slop"

> Mục tiêu: giao diện phải đọc như một dịch vụ công thực thụ do con người thiết kế, không phải sản phẩm demo do AI sinh ra. Mọi màn hình ở mục 9 phải tuân thủ toàn bộ 7 nguyên tắc dưới đây.

### 7.1 Không lộ yêu cầu đề bài hoặc thuật ngữ nội bộ lên giao diện
- Cấm tuyệt đối các cụm như "hệ thống không chọn ghế", "đồ án quản lý xe buýt", "ứng dụng mô phỏng", "phiên bản demo học thuật" xuất hiện ở header, footer, trang chủ.
- Copy phải đọc tự nhiên như của một đơn vị vận tải công cộng thật, vd: thay vì "Không hỗ trợ chọn chỗ ngồi (theo yêu cầu đề bài)" → chỉ đơn giản không có bước chọn ghế trong luồng mua vé, không cần giải thích tại sao.
- Trang "Giới thiệu" (nếu có) viết như giới thiệu đơn vị vận hành tuyến buýt, không nhắc đến "đồ án", "sinh viên thực hiện", "giảng viên hướng dẫn".

### 7.2 Không khoe công nghệ/API trên giao diện người dùng
- Cấm hiển thị "Powered by Goong Map", "Tích hợp SePay", "Xây dựng bằng Next.js" như nhãn tính năng hoặc trên trang chủ.
- Logo/tên nhà cung cấp bản đồ chỉ hiển thị ở vị trí bắt buộc theo điều khoản sử dụng (thường là góc bản đồ, dạng nhỏ, không phải banner quảng cáo).
- Thuật ngữ kỹ thuật (API, webhook, JWT, database...) chỉ xuất hiện trong tài liệu kỹ thuật/README, tuyệt đối không lọt vào copy hướng tới hành khách.

### 7.3 Không biến chức năng cơ bản thành "tính năng nổi bật"
- Cấm các badge/card dạng "Hoạt động 24/7", "Đăng nhập bảo mật", "Tạo vé tức thì", "Thanh toán nhanh chóng" — đây là yêu cầu tối thiểu của bất kỳ hệ thống bán vé nào, không phải điểm khác biệt đáng quảng cáo.
- Trang chủ nên tập trung vào hành động chính (tìm tuyến, mua vé) thay vì dàn hàng ngang các "feature card" liệt kê chức năng hiển nhiên.

### 7.4 Không lạm dụng pill badge, tag trang trí, icon sparkle
- Cấm nhãn kiểu "Next-Gen", "v1.0 Live", "Mới", "Ultra-Fast" gắn tuỳ tiện để lấp khoảng trống bố cục.
- Cấm icon ✨ hoặc các icon "lấp lánh" mang hàm ý AI-generated dùng trang trí không có ý nghĩa chức năng.
- Badge trạng thái chỉ dùng khi mang thông tin thật: vd nhãn "Vé đang hiệu lực" / "Đã sử dụng" trên thẻ vé — đây là thông tin cần thiết, không phải trang trí.

### 7.5 Tránh mô-típ thiết kế AI điển hình
- Không dùng theme nền tối kiểu neon, hiệu ứng aurora/gradient tím-xanh mờ ảo, glassmorphism (nền mờ kính) gây khó đọc chữ.
- Không dùng khối cầu 3D trừu tượng, hình minh hoạ clay/glass nổi lơ lửng không liên quan đến nội dung.
- Ưu tiên bảng màu tương phản cao, dễ đọc ngoài trời/trên di động (người dùng tra cứu khi đang đứng chờ xe) — màu chủ đạo nên gợi liên tưởng giao thông công cộng (vd xanh dương/xanh lá đậm, không dùng màu neon).
- Typography rõ ràng, cỡ chữ đủ lớn cho người lớn tuổi — đối tượng sử dụng xe buýt công cộng thực tế khá đa dạng độ tuổi.

### 7.6 Không dùng buzzword marketing hoặc testimonial giả
- Cấm các câu như "Cách mạng hoá hành trình của bạn", "Trải nghiệm liền mạch, vượt trội" trên bất kỳ màn hình nào.
- Cấm review/đánh giá người dùng dạng avatar AI-generated kèm tên giả — nếu cần minh hoạ phần phản hồi, chỉ hiển thị thống kê thật từ hệ thống (vd số lượt đánh giá trung bình), không bịa testimonial.
- Copy toàn hệ thống dùng động từ hành động ngắn gọn: "Tìm tuyến", "Mua vé", "Xem lịch chạy", "Quét để soát vé" — tránh câu văn hoa mỹ, tính từ cảm thán.

### 7.7 Thiết kế cho tình huống thực tế, không chỉ happy path
- Trạng thái rỗng (empty state) khi tìm kiếm không có kết quả: thông báo rõ ràng + gợi ý hành động tiếp theo (vd thử điểm đi/đến khác), không để trắng trang hoặc chỉ hiện "No data".
- Tên trạm/tuyến dài: xử lý truncate có tooltip hoặc wrap hợp lý, không làm vỡ layout.
- Đơn hàng hết hạn giữa chừng khi hành khách đang thao tác: hiển thị thông báo tại chỗ, không để người dùng thanh toán vào đơn đã chết.
- Mạng chậm khi quét QR soát vé: hiển thị trạng thái loading rõ ràng, tránh để nhân viên tưởng máy đứng và quét lại nhiều lần.
- Responsive đầy đủ trên di động — đặc biệt màn hình soát vé của Inspector, vì thiết bị thực tế thường là điện thoại cầm tay, không phải desktop.
- Vùng chạm (tap target) đủ lớn cho các nút thao tác chính, nhất là trên màn hình Inspector dùng ngoài trời, có thể thao tác vội.

---

## 8. Danh sách màn hình chính (wireframe mô tả)

**Hành khách:**
1. Trang chủ — tìm tuyến theo điểm đi/đến
2. Chi tiết tuyến — bản đồ + danh sách trạm + khung giờ
3. Chọn vé — loại vé, số lượng, ngày kích hoạt
4. Thanh toán — QR VietQR + đếm ngược
5. Vé của tôi — danh sách vé (đang dùng / đã dùng / hết hạn)
6. Gửi phản ánh

**Nhân viên soát vé:**
7. Màn hình quét QR (full-screen camera, kết quả lớn, rõ ràng)
8. Lịch sử soát vé trong ca

**Admin:**
9. Dashboard tổng quan
10. Quản lý tuyến/trạm
11. Quản lý xe & lịch chạy
12. Quản lý loại vé
13. Quản lý đơn hàng
14. Quản lý phản ánh

---

## 9. Giới hạn phạm vi (ghi chú cho báo cáo đồ án)

- GPS xe buýt: **mô phỏng/tĩnh**, không dùng thiết bị phần cứng thật.
- Xác minh học sinh/sinh viên: chỉ chọn loại vé, không xác thực giấy tờ.
- Thông báo: chỉ trong ứng dụng, không tích hợp SMS/Zalo.
- Thanh toán: chỉ qua chuyển khoản ngân hàng (SePay), không hỗ trợ thẻ/ví điện tử.
- Không có luồng hoàn tiền tự động — xử lý hoàn tiền (nếu có) thực hiện thủ công ngoài hệ thống.
