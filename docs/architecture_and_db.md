# Báo cáo Kiến trúc Hệ thống & Cơ sở Dữ liệu — Vivu Platform

> Dự án: **Nền tảng Quản lý Xe Buýt & Bán vé Điện tử (Vivu)**  
> Phiên bản: `1.0.0` (Production Ready)  
> Ngày lập: 03/10/2026  

---

## 1. Tổng quan Kiến trúc

Hệ thống được xây dựng theo mô hình **Monorepo / Fullstack Next.js App Router** hiện đại:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND CLIENTS (React 19)                     │
│  - Cổng Hành khách (Tra cứu tuyến, Mua vé, VietQR, Vé của tôi)          │
│  - Cổng Soát vé Inspector (Camera quét QR di động, Xác thực vé)         │
│  - Cổng Quản trị Admin (Dashboard doanh thu, Điều hành CRUD)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST JSON
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   BACKEND REST API (Next.js Route Handlers)            │
│  - Authentication & JWT Token Service (bcrypt, jwt)                    │
│  - Order & VietQR Billing Service                                      │
│  - SePay Idempotent Webhook Handler                                    │
│  - Ticket Lifecycle & JWT QR Signer/Verifier                           │
│  - Transit Operation & Timetable Service                               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Connection Pool (mssql / tedious)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              DATABASE LAYER (Microsoft SQL Server 2025 Express)        │
│  - Schema 11 bảng DDL quan hệ                                          │
│  - Ràng buộc khóa ngoại an toàn (tránh multiple cascade paths)         │
│  - Chỉ mục tìm kiếm & Index tọa độ địa lý                              │
│  - Dữ liệu Seed mẫu chính thức (Tuyến 01, 5 trạm, xe, lịch, giá vé)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Thiết kế Cơ sở Dữ liệu (SQL Server DDL)

Cơ sở dữ liệu gồm 11 bảng quan hệ:

| # | Tên bảng | Chức năng chính | Ghi chú khóa ngoại & Cascade |
|---|---|---|---|
| 1 | `users` | Tài khoản người dùng (Passenger, Inspector, Admin) | Mật khẩu băm `bcrypt` |
| 2 | `bus_routes` | Danh mục tuyến xe buýt (mã, tên, chiều đi/về) | Mã tuyến `UNIQUE` |
| 3 | `bus_stops` | Danh mục trạm dừng đón/trả khách | Tọa độ `DECIMAL(10, 7)` |
| 4 | `route_stops` | Thứ tự trạm trên từng tuyến & cự ly km tích luỹ | `ON DELETE CASCADE` theo `route_id`, `NO ACTION` theo `stop_id` |
| 5 | `buses` | Danh sách phương tiện xe buýt (biển số, sức chứa) | Biển số `UNIQUE` |
| 6 | `schedules` | Khung giờ xuất bến tĩnh trong ngày | Gán theo xe và tuyến |
| 7 | `ticket_types` | Bảng giá các loại vé (Vé lượt, vé ngày, vé tháng) | Cờ `is_student_price` |
| 8 | `orders` | Đơn hàng mua vé & thanh toán VietQR | Trạng thái `PENDING`, `PAID`, `EXPIRED`, `CANCELLED` |
| 9 | `tickets` | Vé điện tử đã xuất kèm mã QR JWT | `ON DELETE CASCADE` theo `order_id` |
| 10 | `payment_transactions` | Nhật ký đối soát webhook ngân hàng SePay | Lưu `raw_payload` JSON |
| 11 | `complaints` | Phản ánh, góp ý chất lượng dịch vụ từ hành khách | Trạng thái `NEW`, `IN_PROGRESS`, `RESOLVED` |

### Xử lý Multiple Cascade Paths của SQL Server
Để triệt tiêu lỗi `multiple cascade paths` trong Microsoft SQL Server:
- Chỉ quan hệ sở hữu trực tiếp (`route_stops -> bus_routes` và `tickets -> orders`) được đặt `ON DELETE CASCADE`.
- Toàn bộ các khóa ngoại còn lại sử dụng `NO ACTION` (mặc định), logic kiểm tra ràng buộc trước khi xóa được xử lý tại tầng ứng dụng (Backend REST API trả mã lỗi `409 CONFLICT`).

---

## 3. Kiến trúc Bảo mật & Mã hóa QR JWT

- **Xác thực phân quyền**: JWT Access Token (hạn 1 ngày) và Refresh Token (hạn 7 ngày). Payload mã hóa vai trò người dùng (`passenger`, `inspector`, `admin`).
- **Mã QR vé điện tử**: Mỗi vé điện tử khi xuất xưởng được ký chữ ký điện tử HMAC-SHA256 (`jwt.sign`) chứa `{ ticketCode, routeId, category, validUntil }`. Nhân viên soát vé khi quét mã sẽ giải mã và kiểm tra trực tiếp chữ ký, bảo đảm vé không thể bị làm giả.
