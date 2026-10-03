# 🚌 VIVU - Hệ thống Xe buýt Đô thị & Bán vé Điện tử Hà Nội

Ứng dụng web toàn diện phục vụ tra cứu 149 tuyến xe buýt Hà Nội, tìm lộ trình trực tiếp và liên tuyến thông minh, đặt vé trực tuyến thanh toán tự động qua VietQR, ví vé điện tử QR Code (JWT) và Cổng quản trị Admin & Soát vé.

---

## 🚀 Hướng dẫn Cài đặt & Chạy trên máy mới (Clone & Run)

Khi người khác tải về (Clone) từ GitHub, thực hiện các bước sau:

### 1. Tải mã nguồn về máy
```bash
git clone https://github.com/qtnug/vivu.git
cd vivu
```

### 2. Cài đặt các thư viện phụ thuộc (Dependencies)
```bash
npm install
```

### 3. Cấu hình file môi trường
Tạo file `.env.local` từ file mẫu `.env.example`:
```bash
cp .env.example .env.local
```
*(Trên Windows PowerShell: `Copy-Item .env.example .env.local`)*

### 4. Khởi chạy dự án (Dev Server)
```bash
npm run dev
```
Mở trình duyệt truy cập: **[http://localhost:3000](http://localhost:3000)** (hoặc `http://localhost:3001`).

---

## 🔑 Tài khoản mẫu thử nghiệm (Demo Accounts)

Hệ thống đã thiết lập sẵn các tài khoản demo để trải nghiệm:

| Vai trò | Email / Tên đăng nhập | Mật khẩu | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@busticket.vn` | `Admin@123456` | Toàn quyền Dashboard, Tuyến xe, Bảng giá, Lịch trình, Nhân viên |
| **Nhân viên Soát vé** | `inspector1@busticket.vn` | `Inspector@123456` | Quét Camera QR vé, Tra cứu mã vé, Đếm chặng vé liên tuyến |
| **Hành khách** | `passenger@busticket.vn` | `Passenger@123456` | Mua vé xe buýt, Thanh toán VietQR, Quản lý ví vé cá nhân |

---

## 🛠️ Công nghệ sử dụng
- **Frontend / Backend**: Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide Icons.
- **Bảo mật & Xác thực**: JSON Web Token (JWT), Bcrypt, Role-based Access Control (RBAC).
- **Thanh toán & Bản đồ**: Tích hợp VietQR tự động & Goong Map API.
