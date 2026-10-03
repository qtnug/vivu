# Hướng dẫn Cài đặt & Triển khai Hệ thống Vivu

> Dự án: **Nền tảng Quản lý Xe Buýt & Bán vé Điện tử (Vivu)**  
> Môi trường: Microsoft Windows, Node.js v22+, SQL Server 2025 Express  

---

## 1. Yêu cầu Môi trường

- **Node.js**: v18.x trở lên (đã kiểm định tốt trên v22.11.0)
- **NPM**: v10.x trở lên
- **Cơ sở dữ liệu**: Microsoft SQL Server (SQLEXPRESS hoặc Enterprise/Developer)
- **Trình duyệt**: Chrome, Edge, Safari, Firefox

---

## 2. Cấu hình Biến môi trường (`.env.local`)

Tạo tệp `.env.local` tại thư mục gốc với các thông số:

```env
# Application Port
PORT=3001
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Microsoft SQL Server 2025 Express Connection
DB_SERVER=localhost
DB_PORT=1433
DB_USER=vivu_admin
DB_PASSWORD=VivuAdmin@2026!
DB_NAME=bus_ticketing_system
DB_TRUST_SERVER_CERTIFICATE=true
DB_ENCRYPT=false

# JWT Authentication Secrets
JWT_SECRET=vivu_access_token_secret_key_2026_very_secure
JWT_REFRESH_SECRET=vivu_refresh_token_secret_key_2026_very_secure
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# SePay VietQR Payment Integration
SEPAY_API_TOKEN=VIVU_SEPAY_SECRET_TOKEN_2026
SEPAY_BANK_NAME=MBBank
SEPAY_ACCOUNT_NO=0987654321
SEPAY_ACCOUNT_NAME=CONG TY CP XE BUYT VIVU
```

---

## 3. Khởi tạo Cơ sở Dữ liệu & Nạp Seed Data

Chạy các lệnh tự động hóa:

```bash
# 1. Khởi tạo schema 11 bảng CSDL
npm run db:init

# 2. Nạp dữ liệu seed chuẩn (Tuyến 01, 5 trạm dừng, xe mẫu, 5 loại vé, tài khoản Admin/Inspector)
npm run db:seed

# 3. Kiểm định toàn vẹn CSDL (43/43 tiêu chuẩn)
npm run db:verify
```

---

## 4. Khởi chạy Ứng dụng

### Chế độ Development:
```bash
npm run dev
```
Truy cập: `http://localhost:3001`

### Chế độ Production Build:
```bash
npm run build
npm start
```

---

## 5. Tài khoản Truy cập Mẫu

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn chính |
|---|---|---|---|
| **Quản trị viên (Admin)** | `admin@busticket.vn` | `Admin@123456` | Toàn quyền Dashboard, CRUD Tuyến, Trạm, Xe, Lịch, Vé, Phản ánh |
| **Soát vé (Inspector)** | `inspector1@busticket.vn` | `Inspector@123456` | Cổng Soát vé quét QR camera, xác thực vé hợp lệ/từ chối |
| **Hành khách (Passenger)** | `passenger@busticket.vn` | `Passenger@123456` | Tra cứu tuyến, mua vé VietQR, quản lý Vé của tôi |
| **Khách vãng lai (Guest)** | Không cần đăng nhập | — | Nhập SĐT mua vé, tra cứu theo mã đơn hàng tại `/my-tickets` |
