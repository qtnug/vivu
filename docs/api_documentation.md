# Tài liệu Đặc tả REST API — Vivu Bus Ticketing Platform

> Base Path: `/api`  
> Định dạng: `application/json`  
> Xác thực: `Authorization: Bearer <JWT_ACCESS_TOKEN>`  
> Webhook Header: `Authorization: Apikey <SEPAY_API_TOKEN>`  

---

## 1. Xác thực (Authentication)

### `POST /api/auth/register`
Đăng ký tài khoản hành khách mới.
- **Request Body**:
  ```json
  {
    "fullName": "Nguyễn Văn A",
    "email": "nguyenvana@gmail.com",
    "phone": "0912345678",
    "password": "Password@123"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "user": { "id": "...", "full_name": "Nguyễn Văn A", "email": "nguyenvana@gmail.com", "role": "passenger" },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
  ```

### `POST /api/auth/login`
Đăng nhập cho cả 3 vai trò (Passenger, Inspector, Admin).
- **Request Body**:
  ```json
  { "email": "admin@busticket.vn", "password": "Admin@123456" }
  ```
- **Response (200 OK)**:
  ```json
  {
    "user": { "id": "...", "full_name": "Quản trị viên", "role": "admin" },
    "accessToken": "...",
    "refreshToken": "..."
  }
  ```

### `POST /api/auth/refresh`
Làm mới access token.
- **Request Body**: `{ "refreshToken": "..." }`
- **Response (200 OK)**: `{ "accessToken": "..." }`

---

## 2. Tuyến & Trạm dừng (Public)

### `GET /api/routes`
Lấy danh sách các tuyến xe buýt đang hoạt động.
- **Query Params**: `?search=` (lọc theo mã hoặc tên tuyến)
- **Response**: Mảng các tuyến kèm số lượng trạm dừng (`stopCount`).

### `GET /api/routes/:id`
Lấy chi tiết 1 tuyến buýt, danh sách trạm dừng theo thứ tự (`stopSequence`), cự ly tích luỹ (`distanceFromStartKm`) và khung giờ xuất bến tĩnh (`schedules`).

### `GET /api/routes/search?fromLat=&fromLng=&toLat=&toLng=`
Gợi ý tuyến xe buýt phù hợp theo tọa độ điểm đi và điểm đến.

### `GET /api/ticket-types`
Lấy danh sách các loại vé đang áp dụng kèm giá niêm yết và thời hạn hiệu lực.

---

## 3. Đơn hàng & Thanh toán VietQR

### `POST /api/orders`
Tạo đơn hàng mua vé (hỗ trợ cả tài khoản đăng nhập và Guest checkout qua SĐT).
- **Request Body**:
  ```json
  {
    "ticketTypeId": "tt-daily",
    "routeId": "11111111-1111-1111-1111-111111111111",
    "quantity": 1,
    "activationDate": "2026-10-03",
    "guestPhone": "0988776655"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "order": {
      "id": "...",
      "orderCode": "DH123456ABCD",
      "totalAmount": 30000,
      "quantity": 1,
      "status": "PENDING",
      "expiresAt": "2026-10-03T00:55:00.000Z"
    },
    "payment": {
      "bankName": "MBBank",
      "accountNo": "0987654321",
      "accountName": "CONG TY CP XE BUYT VIVU",
      "amount": 30000,
      "description": "DH123456ABCD",
      "qrImageUrl": "https://img.vietqr.io/image/mbbank-0987654321-compact2.png?..."
    }
  }
  ```

### `GET /api/orders/:id`
Lấy trạng thái đơn hàng (dùng để client polling). Tự động chuyển `EXPIRED` nếu quá 15 phút.

### `POST /api/orders/:id/regenerate`
Tạo lại mã thanh toán mới khi đơn hàng cũ đã hết hạn.

---

## 4. SePay Webhook (Thanh toán Tự động)

### `POST /api/webhooks/sepay`
Nhận thông báo chuyển khoản tự động từ cổng thanh toán SePay.
- **Headers**: `Authorization: Apikey <SEPAY_API_TOKEN>`
- **Request Body**:
  ```json
  {
    "transferAmount": 30000,
    "content": "VIVU CHUYEN KHOAN DH123456ABCD",
    "referenceCode": "MBVCB123456789"
  }
  ```
- **Luồng xử lý**:
  1. Trích xuất mã đơn hàng `DH...` bằng biểu thức chính quy (Regex).
  2. Kiểm tra tính bất biến (**Idempotent**): nếu đơn đã `PAID`, trả về `200 OK` ngay lập tức.
  3. Đối chiếu số tiền chuyển khoản phải khớp với tổng giá trị đơn hàng.
  4. Chuyển trạng thái đơn sang `PAID`, lưu log vào `payment_transactions`.
  5. Tự động sinh `quantity` vé điện tử, mỗi vé có mã vé riêng và chữ ký QR JWT bảo mật.

---

## 5. Vé điện tử & Cổng Soát vé (Inspector)

### `GET /api/tickets/me`
Lấy danh sách vé của hành khách đang đăng nhập (lọc `?status=ACTIVE|USED|EXPIRED`).

### `GET /api/tickets/lookup?orderCode=&phone=`
Tra cứu vé cho khách vãng lai không có tài khoản.

### `GET /api/tickets/:id`
Lấy thông tin vé kèm ảnh mã QR được sinh tự động.

### `POST /api/tickets/verify`
Xác thực vé dành cho Nhân viên soát vé khi khách lên xe.
- **Request Body**: `{ "qrPayload": "<JWT_STRING>" }` hoặc `{ "ticketCode": "TK-DH..." }`
- **Kết quả trả về**:
  - Hợp lệ:
    ```json
    { "valid": true, "message": "Soát vé thành công — Vé hợp lệ", "ticket": { ... } }
    ```
  - Từ chối:
    ```json
    { "valid": false, "reason": "Vé đã được sử dụng lúc 08:30:15" }
    ```

---

## 6. Phản ánh & Quản trị (Admin)

- `POST /api/complaints`: Gửi phản ánh chất lượng dịch vụ.
- `GET /api/admin/dashboard`: Thống kê doanh thu, số vé, top tuyến và biểu đồ khung giờ.
- `GET/POST /api/admin/routes`, `PUT/DELETE /api/admin/routes/:id`: CRUD Tuyến buýt.
- `GET/POST /api/admin/stops`, `PUT/DELETE /api/admin/stops/:id`: CRUD Trạm dừng.
- `POST /api/admin/routes/:id/stops`, `PUT /api/admin/routes/:id/stops/reorder`: Gán và sắp xếp trạm dừng.
- `GET/POST /api/admin/buses`, `PUT/DELETE /api/admin/buses/:id`: Quản lý xe buýt.
- `GET/POST /api/admin/schedules`, `PUT/DELETE /api/admin/schedules/:id`: Quản lý lịch chạy.
- `GET/POST /api/admin/ticket-types`, `PUT/DELETE /api/admin/ticket-types/:id`: Bảng giá vé.
- `GET /api/admin/orders`: Quản lý đơn hàng & nhật ký giao dịch SePay.
- `GET /api/admin/complaints`, `PUT /api/admin/complaints/:id`: Xử lý phản ánh.
- `GET/POST /api/admin/staff`, `PUT /api/admin/staff/:id`: Cấp và khóa tài khoản nhân viên soát vé.
