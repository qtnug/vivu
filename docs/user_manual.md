# Hướng dẫn Sử dụng Hệ thống Xe buýt Vivu

> Dự án: **Nền tảng Quản lý Xe Buýt & Bán vé Điện tử (Vivu)**  
> Dành cho: **Hành khách**, **Nhân viên soát vé**, **Quản trị viên (Admin)**  

---

## Phần 1: Cổng Hành khách (Passenger Portal)

### 1.1 Tra cứu tuyến xe buýt
1. Mở trang chủ hoặc vào menu **"Tra cứu tuyến"** (`/routes`).
2. Nhập số hiệu tuyến (VD: `01`) hoặc tên tuyến vào thanh tìm kiếm.
3. Bấm vào tuyến để xem danh sách trạm dừng theo thứ tự, cự ly km tích luỹ và khung giờ xuất bến tĩnh trong ngày.

### 1.2 Mua vé xe buýt điện tử
1. Vào menu **"Mua vé điện tử"** (`/booking`).
2. Chọn tuyến xe buýt bạn muốn đi.
3. Chọn loại vé:
   - **Vé lượt (Single Ride)**: Áp dụng cho 1 chuyến xe theo tuyến, hiệu lực 2 giờ.
   - **Vé ngày (Daily Pass)**: Đi không giới hạn số chuyến trên tất cả các tuyến trong vòng 24 giờ.
   - **Vé tháng (Monthly Pass)**: Hiệu lực 30 ngày.
   - Chọn đối tượng **Thường** hoặc **Học sinh/Sinh viên** (ưu đãi giảm giá).
4. Chọn số lượng vé và ngày bắt đầu sử dụng (*Lưu ý: Xe buýt đô thị không chọn chỗ ngồi*).
5. Nhập số điện thoại nhận vé (không bắt buộc đăng ký tài khoản).
6. Bấm **"Tiếp tục thanh toán VietQR"**.

### 1.3 Thanh toán VietQR & Nhận vé
1. Màn hình hiển thị mã QR VietQR động và đồng hồ đếm ngược 15 phút.
2. Mở ứng dụng ngân hàng quét mã QR để chuyển khoản với số tiền và nội dung đơn hàng được điền tự động.
3. Hệ thống tự động nhận diện thanh toán thành công và chuyển ngay sang màn hình vé.
4. *(Dành cho người kiểm thử)*: Có thể bấm nút **"Mô phỏng SePay Webhook ngay"** để kiểm tra tính năng thanh toán tức thì.

### 1.4 Xuất trình vé điện tử khi lên xe
1. Vào mục **"Vé của tôi"** (`/my-tickets`).
2. Bấm vào vé đang hiệu lực để mở mã QR kích thước lớn.
3. Đưa mã QR cho nhân viên soát vé trên xe quét.
4. Nếu mua dạng khách, nhập mã đơn hàng hoặc số điện thoại vào ô tra cứu để xem lại vé.

### 1.5 Gửi phản ánh chất lượng dịch vụ
- Vào mục **"Gửi phản ánh"** (`/complaints`) để gửi góp ý về thái độ nhân viên, chất lượng xe hoặc đề xuất mở thêm tuyến.

---

## Phần 2: Cổng Nhân viên Soát vé (Inspector Portal)

Truy cập: `http://localhost:3001/inspector` (Tối ưu giao diện di động cho nhân viên trên xe)

### 2.1 Quét mã QR của hành khách
1. Chọn tab **"Camera QR"**. Hướng camera điện thoại về phía mã QR trên ứng dụng của hành khách.
2. Hệ thống tự động giải mã chữ ký JWT và kiểm tra tính hợp lệ:
   - **Màn hình Xanh (HỢP LỆ)**: Hiển thị tên vé, tuyến, thời hạn còn lại. Hệ thống tự động chuyển trạng thái vé sang `USED` (ĐÃ SỬ DỤNG) để ngăn tái sử dụng.
   - **Màn hình Đỏ (KHÔNG HỢP LỆ)**: Hiển thị lý do cụ thể (Ví dụ: *"Vé đã được sử dụng lúc 07:45"*, *"Vé đã hết hạn"*).
3. Bấm nút **"Tiếp tục soát khách tiếp theo"** để quét hành khách tiếp theo.

### 2.2 Nhập mã vé thủ công (Dự phòng)
- Nếu điện thoại của khách bị vỡ màn hình hoặc camera không quét được: Chuyển sang tab **"Nhập tay"**, gõ mã vé (VD: `TICK-DEMO-001`) và bấm **Xác thực**.

### 2.3 Xem lịch sử soát vé trong ca
- Bấm vào tab **"Lịch sử"** để xem danh sách các vé hợp lệ và vé bị từ chối trong ca làm việc hiện tại.

---

## Phần 3: Cổng Quản trị Vận hành (Admin Portal)

Truy cập: `http://localhost:3001/admin`  
Tài khoản đăng nhập mẫu: `admin@busticket.vn` | Mật khẩu: `Admin@123456`

### 3.1 Dashboard Tổng quan
- Theo dõi doanh thu theo thời gian thực (tổng hợp từ các đơn hàng `PAID`).
- Số lượng vé đã bán ra theo từng chủng loại.
- Biểu đồ xếp hạng các tuyến đông khách nhất và biểu đồ phân bổ khung giờ cao điểm trong ngày.

### 3.2 Quản lý Tuyến & Trạm dừng
- **Tuyến buýt**: Thêm tuyến mới, cập nhật tên tuyến, chiều chạy (`FORWARD`/`BACKWARD`). Xóa tuyến an toàn (ngăn xóa nếu tuyến đang có vé còn hiệu lực).
- **Trạm dừng**: Tạo trạm dừng mới với tọa độ kinh độ/vĩ độ chuẩn xác.
- **Sắp xếp thứ tự trạm**: Cập nhật danh sách trạm trên tuyến và khoảng cách tích luỹ km.

### 3.3 Quản lý Xe & Lịch chạy
- Đăng ký biển số xe mới và sức chứa tiêu chuẩn.
- Cấu hình giờ xuất bến tĩnh (`06:00:00`, `06:15:00`...), gán xe và tốc độ di chuyển ước tính.

### 3.4 Bảng giá & Loại vé
- Điều chỉnh giá vé lượt, vé ngày, vé tháng và mức giá trợ giá cho Học sinh/Sinh viên.

### 3.5 Quản lý Đơn hàng & Nhật ký SePay
- Xem toàn bộ lịch sử đơn hàng, lọc theo trạng thái (`PENDING`, `PAID`, `CANCELLED`).
- Đối soát chi tiết giao dịch thanh toán từ SePay Webhook.

### 3.6 Tiếp nhận Phản ánh & Quản lý Nhân sự
- Xem phản ánh của người dân và cập nhật trạng thái xử lý (`Đang xử lý`, `Đã xử lý`).
- Cấp tài khoản cho nhân viên soát vé mới hoặc khóa tài khoản khi nhân viên nghỉ việc.
