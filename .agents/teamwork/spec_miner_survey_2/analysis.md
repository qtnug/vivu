# BÁO CÁO KHẢO SÁT & ĐẶC TẢ CHI TIẾT GIAO DIỆN, PORTALS & UI/UX (VIVU)
**Người thực hiện**: Spec Miner Survey 2 (`teamwork_preview_spec_miner`)  
**Tài liệu đặc tả nguồn**: 
- `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` (Tài liệu gốc có thẩm quyền cao nhất)
- `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (Yêu cầu tổng thể của dự án)
**Ngày thực hiện**: 2026-10-02  
**Mục tiêu**: Bóc tách và đặc tả toàn diện yêu cầu Frontend, 14 màn hình trên 3 Cổng thông tin (Hành khách, Soát vé, Quản trị viên), luồng tương tác/wireframe, quy chuẩn chống AI Slop (Mục 7), bảng tính năng và ma trận xử lý biên (Edge Cases).

---

## MỤC LỤC
1. [TỔNG QUAN HỆ THỐNG & ĐẶC TẢ VAI TRÒ TRÊN GIAO DIỆN](#1-tổng-quan-hệ-thống--đặc-tả-vai-trò-trên-giao-diện)
2. [QUY CHUẨN THIẾT KẾ UI/UX & COPYWRITING — CHỐNG "AI SLOP" (MỤC 7)](#2-quy-chuẩn-thiết-kế-uiux--copywriting--chống-ai-slop-mục-7)
3. [ĐẶC TẢ CHI TIẾT 14 MÀN HÌNH & WIREFRAME TRÊN 3 PORTAL](#3-đặc-tả-chi-tiết-14-màn-hình--wireframe-trên-3-portal)
   - [A. Cổng Hành Khách (Passenger Portal - Màn hình 1 đến 6 + Auth)](#a-cổng-hành-khách-passenger-portal)
   - [B. Cổng Nhân Viên Soát Vé (Inspector Portal - Màn hình 7 và 8)](#b-cổng-nhân-viên-soát-vé-inspector-portal)
   - [C. Cổng Quản Trị Hệ Thống (Admin Portal - Màn hình 9 đến 14)](#c-cổng-quản-trị-hệ-thống-admin-portal)
4. [ĐẶC TẢ CÁC MODAL & LUỒNG TƯƠNG TÁC ĐẶC THÙ](#4-đặc-tả-các-modal--luồng-tương-tác-đặc-thù)
   - [Luồng 1: VietQR Động, Đếm ngược 15 Phút & Tự Động Cập Nhật](#luồng-1-vietqr-động-đếm-ngược-15-phút--tự-động-cập-nhật)
   - [Luồng 2: Hiển Thị Vé Điện Tử & Mã QR JWT](#luồng-2-hiển-thị-vé-điện-tử--mã-qr-jwt)
   - [Luồng 3: Quét QR Soát Vé (Camera / Nhập Tay / Kết Quả / Check-in)](#luồng-3-quét-qr-soát-vé-camera--nhập-tay--kết-quả--check-in)
   - [Luồng 4: Biểu Đồ Dashboard Phân Tích Quản Trị](#luồng-4-biểu-đồ-dashboard-phân-tích-quản-trị)
   - [Luồng 5: Sắp Xếp Thứ Tự Trạm Trên Tuyến (Route Stops Reorder)](#luồng-5-sắp-xếp-thứ-tự-trạm-trên-tuyến-route-stops-reorder)
   - [Luồng 6: Gửi & Xử Lý Phản Ánh Khiếu Nại](#luồng-6-gửi--xử-lý-phản-ánh-khiếu-nại)
5. [DANH MỤC TÍNH NĂNG ĐƯỢC PHÁT HIỆN (FEATURES DISCOVERED)](#5-danh-mục-tính-năng-được-phát-hiện-features-discovered)
6. [MA TRẬN TRƯỜNG HỢP BIÊN & NGOẠI LỆ (EDGE CASES MATRIX)](#6-ma-trận-trường-hợp-biên--ngoại-lệ-edge-cases-matrix)

---

## 1. TỔNG QUAN HỆ THỐNG & ĐẶC TẢ VAI TRÒ TRÊN GIAO DIỆN

Hệ thống **Vivu - Nền tảng Quản lý Xe Buýt & Bán vé Điện tử** mô phỏng nghiệp vụ vận tải hành khách công cộng đô thị thực tế tại Việt Nam với 3 nhóm vai trò rõ rệt:

| Vai trò | Phân vùng Portal | Đối tượng & Đặc thù thiết bị | Mục tiêu cốt lõi |
|---|---|---|---|
| **Hành khách (Passenger/Guest)** | Cổng công khai (`/`, `/routes`, `/booking`, `/tickets`, `/feedback`) | Người dân đô thị, học sinh/sinh viên, người cao tuổi; truy cập cả Mobile Browser & Desktop. | Tra cứu tuyến, xem trạm, xem giờ xuất bến, mua vé nhanh (không chọn ghế), thanh toán VietQR và xem vé có mã QR để trình soát vé. |
| **Soát vé (Inspector)** | Cổng nội bộ soát vé (`/inspector/scan`, `/inspector/history`) | Nhân viên phụ xe/soát vé tại trạm; thiết bị 100% Smartphone màn hình cảm ứng, thao tác một tay ngoài trời/trên xe rung lắc. | Đăng nhập tài khoản cấp sẵn, quét camera QR siêu nhanh hoặc gõ mã vé, xác thực hợp lệ ngay lập tức và bấm xác nhận trừ vé. |
| **Quản trị viên (Admin)** | Cổng điều hành (`/admin/*`) | Nhân viên vận hành điều hành mạng lưới; thiết bị Desktop/Laptop (màn hình rộng). | Theo dõi doanh thu, biểu đồ giờ cao điểm, quản lý tuyến, trạm, xe, lịch chạy, bảng giá vé, đơn hàng, logs SePay và khiếu nại. |

### Các giới hạn nghiệp vụ ảnh hưởng trực tiếp đến UI/UX:
1. **Vé không chọn chỗ ngồi**: Không dựng sơ đồ ghế (seat map), không hiển thị bước "chọn số ghế/vị trí". Vé lượt, vé ngày, vé tháng chỉ áp dụng theo người/lượt.
2. **Vị trí và thời gian chạy tĩnh**: Không dùng GPS phần cứng. Bản đồ Goong Map thể hiện danh sách trạm và lộ trình nối các trạm. Thời gian di chuyển được tính tĩnh từ khoảng cách tích luỹ chia cho vận tốc trung bình (mặc định 18-20 km/h).
3. **Thanh toán SePay duy nhất**: Không tích hợp thẻ quốc tế, cổng thanh toán trung gian khác hay ví điện tử. Chỉ hiển thị thông tin chuyển khoản VietQR chuẩn Napas với mã đơn hàng duy nhất trong nội dung chuyển khoản.
4. **Không hoàn tiền tự động**: Không có nút "Yêu cầu hoàn tiền" tự động trên UI. Mọi hỗ trợ hành khách được xử lý qua kênh Phản ánh/Khiếu nại.
5. **Thông báo hoàn toàn In-App**: Không có trường đăng ký nhận tin SMS/Zalo. Thông báo trạng thái vé và đơn hàng hiển thị ngay trong giao diện web.

---

## 2. QUY CHUẨN THIẾT KẾ UI/UX & COPYWRITING — CHỐNG "AI SLOP" (MỤC 7)

Tài liệu đặc tả gốc đặt ra yêu cầu nghiêm ngặt tại **Mục 7**: Giao diện Vivu phải đọc và vận hành như một dịch vụ vận tải công cộng chuyên nghiệp do con người thiết kế và vận hành, loại bỏ hoàn toàn các dấu hiệu "sản phẩm mẫu do AI tự sinh" (AI Slop). Toàn bộ 7 nguyên tắc bắt buộc phải được thi hành trên tất cả các màn hình:

### Nguyên tắc 7.1: Không lộ yêu cầu đề bài hoặc thuật ngữ nội bộ lên giao diện
- **Cấm tuyệt đối**:
  - Các cụm từ: *"hệ thống không chọn ghế"*, *"hệ thống vé không đặt chỗ theo yêu cầu đề bài"*, *"đồ án học phần"*, *"ứng dụng mô phỏng"*, *"phiên bản demo học thuật"*, *"sinh viên thực hiện"*, *"giảng viên hướng dẫn"*.
  - Đặt các câu giải thích biện hộ lý do vì sao không có tính năng X.
- **Yêu cầu thực hiện**:
  - Không có bước chọn ghế trong luồng mua vé. Quy trình mua vé chuyển thẳng từ chọn loại vé/số lượng sang thanh toán.
  - Văn phong hiển thị tự nhiên như dịch vụ xe buýt công cộng đô thị (ví dụ: Bus Hà Nội, Bus TP.HCM).
  - Trang Giới thiệu (nếu có) viết như thư ngỏ của đơn vị điều hành xe buýt đô thị Vivu, cam kết phục vụ người dân văn minh, hiện đại.

### Nguyên tắc 7.2: Không khoe công nghệ / API trên giao diện người dùng
- **Cấm tuyệt đối**:
  - Các nhãn/banner: *"Powered by Goong Map"*, *"Tích hợp SePay Webhook"*, *"Xây dựng trên nền tảng Next.js / React"*, *"Công nghệ JWT bảo mật"*, *"Cơ sở dữ liệu SQL Server"*.
  - Thuật ngữ kỹ thuật trong copy hành khách: *API, Webhook, JWT Token, Endpoint, Database, Cache, Idempotency*.
- **Yêu cầu thực hiện**:
  - Tên/logo nhà cung cấp bản đồ Goong Map chỉ được hiển thị ở góc bản đồ theo đúng quy định điều khoản bản quyền SDK (nhỏ, mờ góc dưới), không làm banner quảng cáo.
  - Khu vực thanh toán hiển thị: *"Quét mã VietQR bằng ứng dụng ngân hàng bất kỳ"* kèm thông tin ngân hàng thụ hưởng, không đề cập kỹ thuật SePay.
  - Toàn bộ thuật ngữ kỹ thuật chỉ lưu hành trong tài liệu kiến trúc kỹ thuật nội bộ (`docs/`).

### Nguyên tắc 7.3: Không biến chức năng cơ bản thành "tính năng nổi bật"
- **Cấm tuyệt đối**:
  - Tạo các thẻ quảng cáo vô nghĩa trên trang chủ như: *"Hỗ trợ 24/7"*, *"Đăng nhập an toàn"*, *"Tạo vé tức thì"*, *"Thanh toán nhanh chóng"*, *"Giao diện thân thiện"*.
- **Yêu cầu thực hiện**:
  - Trang chủ ưu tiên 100% diện tích "Hero" cho hành động thiết thực của người đi buýt: **Khung tìm kiếm tuyến theo điểm đi/đến**, thanh tra cứu nhanh số hiệu tuyến buýt (ví dụ: Tuyến 01, Tuyến 02), và thông tin lộ trình nhanh.

### Nguyên tắc 7.4: Không lạm dụng pill badge, tag trang trí, icon sparkle
- **Cấm tuyệt đối**:
  - Nhãn trang trí lấp chỗ trống: *"Next-Gen"*, *"v1.0 Live"*, *"Mới"*, *"Hot"*, *"Ultra-Fast"*, *"Smart Transit"*.
  - Icon ✨ (sparkle), ngôi sao phát sáng kiểu trợ lý ảo AI.
- **Yêu cầu thực hiện**:
  - Badge trạng thái chỉ xuất hiện khi phản ánh chính xác dữ liệu nghiệp vụ:
    * Vé: `Đang hiệu lực` (Xanh lá `bg-emerald-100 text-emerald-800`), `Đã sử dụng` (Xám `bg-slate-100 text-slate-700`), `Hết hạn` (Đỏ `bg-rose-100 text-rose-800`).
    * Đơn hàng: `Chờ thanh toán` (Vàng cam `bg-amber-100 text-amber-800`), `Đã thanh toán` (Xanh lá), `Đã huỷ` (Xám tro).
    * Khiếu nại: `Mới tiếp nhận` (Xanh lam), `Đang xử lý` (Vàng), `Đã giải quyết` (Xanh lục).

### Nguyên tắc 7.5: Tránh mô-típ thiết kế AI điển hình & Định hình phong cách Giao thông công cộng
- **Cấm tuyệt đối**:
  - Nền tối neon (Dark cyberpunk/neon theme), hiệu ứng mờ kính (glassmorphism/backdrop-blur) gây mờ mắt và khó đọc ngoài nắng.
  - Gradient tím - hồng - xanh cyan mờ ảo (aurora gradients).
  - Khối cầu 3D, icon 3D đất sét/thủy tinh lơ lửng không liên quan thực tế.
- **Bảng quy chuẩn thiết kế đề xuất (Design System)**:
  - **Màu sắc chủ đạo (Public Transit Palette)**:
    * Primary Brand: Xanh dương đậm vận tải (`#1E3A8A` / `blue-900`) hoặc Xanh cổ vịt / Xanh lá đô thị (`#047857` / `emerald-700`).
    * Secondary / Accent: Vàng tín hiệu giao thông (`#D97706` / `amber-600`) cho giờ xuất bến, điểm đón chính.
    * Neutral: Trắng tinh khôi (`#FFFFFF`), Xám sáng (`#F8FAFC`, `#F1F5F9`), Viền phân tách sắc nét (`#CBD5E1`).
    * Text: Đen chữ đậm tương phản cao (`#0F172A` / `slate-900`), Text phụ (`#475569` / `slate-600`).
  - **Typography**: Cỡ chữ lớn, rõ ràng, dễ tiếp cận cho người lớn tuổi đi xe buýt. Font sans-serif tiêu chuẩn (Inter, Be Vietnam Pro, Roboto). Cỡ chữ tối thiểu cho nội dung đọc là 14px-16px, tiêu đề trạm 18px-22px, số hiệu tuyến 24px-32px đậm (Bold).
  - **Khả năng đọc ngoài trời (High Contrast)**: Tỷ lệ tương phản chữ/nền tối thiểu 4.5:1 (đạt chuẩn WCAG 2.1 AA).

### Nguyên tắc 7.6: Không dùng buzzword marketing hoặc testimonial giả
- **Cấm tuyệt đối**:
  - Khẩu hiệu sáo rỗng: *"Cách mạng hoá hành trình của bạn"*, *"Trải nghiệm liền mạch vượt trội"*, *"Giải pháp tương lai đô thị"*.
  - Các khối testimonial bịa đặt với avatar khuôn mặt do AI tạo ra cùng đánh giá khen ngợi giả.
- **Yêu cầu thực hiện**:
  - Dùng câu lệnh và động từ hành động trực tiếp, ngắn gọn: *"Tìm tuyến xe"*, *"Mua vé lượt"*, *"Xem lộ trình & giờ chạy"*, *"Quét vé"*, *"Xác nhận soát vé"*.
  - Các thống kê nếu có phải lấy trực tiếp từ database thật (ví dụ: "Mạng lưới 5 trạm kết nối trung tâm", "Lượt chuyến 06:00 - 21:00").

### Nguyên tắc 7.7: Thiết kế cho tình huống thực tế, không chỉ happy path
- **Xử lý trạng thái rỗng (Empty States)**: Khi tìm kiếm tuyến không ra kết quả, hiển thị thông báo hướng dẫn rõ ràng: *"Không tìm thấy tuyến đi qua hai điểm này. Vui lòng thử chọn trạm dừng gần nhất hoặc tra cứu theo số hiệu tuyến."* Không bao giờ hiển thị màn hình trắng trơn hoặc chữ "No data".
- **Xử lý tên dài (Truncate & Tooltip)**: Tên tuyến/trạm dài (như *"Điểm trung chuyển Long Biên - Trạm xe buýt đối diện Bệnh viện Trung ương"*) phải được xử lý ngắt dòng thông minh hoặc truncate kèm tooltip, không vỡ layout card.
- **Xử lý đơn hàng hết hạn tại chỗ (In-place Expiry)**: Nếu người dùng giữ màn hình thanh toán quá 15 phút, giao diện lập tức chuyển trạng thái sang `Đơn hàng đã hết hạn` và cung cấp nút bấm *"Tạo lại mã thanh toán mới"*, ngăn người dùng chuyển khoản vào đơn đã bị đóng.
- **Xử lý mạng chập chờn khi soát vé**: Màn hình Inspector hiển thị spinner loading tức thì khi camera vừa nhận diện QR hoặc khi bấm Xác nhận, kèm thông báo trạng thái rõ ràng, ngăn nhân viên bấm liên tiếp nhiều lần.
- **Tối ưu di động & Vùng chạm (Tap Targets)**: Mọi nút bấm, tab, ô nhập liệu trên điện thoại phải đạt kích thước tối thiểu **44px x 44px** (khuyến nghị 48px), khoảng cách giữa các phần tử đủ rộng để không bấm nhầm khi đang đứng trên xe buýt di chuyển.

---

## 3. ĐẶC TẢ CHI TIẾT 14 MÀN HÌNH & WIREFRAME TRÊN 3 PORTAL

---

### A. CỔNG HÀNH KHÁCH (PASSENGER PORTAL)

#### MÀN HÌNH 1: TRANG CHỦ — TÌM TUYẾN & TRA CỨU LỘ TRÌNH
- **Đường dẫn**: `/`
- **Quyền truy cập**: Public (Công khai - khách vãng lai & người dùng đã đăng nhập).
- **Mục tiêu**: Cho phép hành khách tìm tuyến xe buýt theo điểm đi / điểm đến hoặc số hiệu tuyến; hiển thị danh sách tuyến xe đang vận hành.
- **Bố cục Wireframe**:
```
+--------------------------------------------------------------------------+
|  VIVU BUS               [Tìm tuyến] [Mua vé] [Vé của tôi]     [Đăng nhập]|
+--------------------------------------------------------------------------+
|  TÌM KIẾM HÀNH TRÌNH XE BUÝT ĐÔ THỊ                                      |
|  +--------------------------------------------------------------------+  |
|  | [o] Điểm đi: [ Nhập địa chỉ hoặc chọn trạm xuất phát...           ] |  |
|  | [x] Điểm đến: [ Nhập địa chỉ hoặc chọn trạm đến...                ] |  |
|  | [ Nút: Tìm lộ trình phù hợp ]                                      |  |
|  +--------------------------------------------------------------------+  |
|  Hoặc tìm nhanh theo số hiệu: [ Nhập số tuyến: vd 01, 02... ] [Tìm]     |
+--------------------------------------------------------------------------+
|  KẾT QUẢ GỢI Ý TUYẾN / DANH SÁCH MẠNG LƯỚI TUYẾN XE BUÝT                 |
|  +--------------------------------------------------------------------+  |
|  | Tuyến 01: Bến xe Long Biên - Bến xe Hà Đông                       |  |
|  | Chiều đi | 5 trạm dừng | Giờ chạy: 06:00 - 21:00 | Giãn cách: 15p  |  |
|  | [Xem chi tiết lộ trình]              [Mua vé tuyến này (7.000đ)]   |  |
|  +--------------------------------------------------------------------+  |
|  | (Trường hợp tìm kiếm điểm đi - điểm đến):                           |  |
|  | Gợi ý: Lên tại [Bến xe Long Biên] -> Xuống tại [Ngã Tư Sở]         |  |
|  | Khoảng cách: 8.2 km | Thời gian ước tính: ~27 phút (v = 18.5 km/h)  |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
|  FOOTER: Vivu Bus - Hệ thống vé xe buýt điện tử đô thị. Hỗ trợ: 1900 xxxx |
+--------------------------------------------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - Form tìm kiếm: Điểm đi (`fromLat`, `fromLng` hoặc chọn từ danh sách `bus_stops`), Điểm đến (`toLat`, `toLng`).
  - Ô tìm nhanh: Số hiệu tuyến (`route_code`).
  - Danh sách thẻ tuyến (`bus_routes`): Số hiệu tuyến (`route_code`), tên tuyến (`route_name`), chiều (`direction` FORWARD/BACKWARD), số lượng trạm (`stopCount`), thời gian hoạt động.
- **Tương tác & Validate**:
  - Gõ vào ô điểm đi/đến: gợi ý các trạm dừng có sẵn trong hệ thống (autocomplete từ `bus_stops`).
  - Validate: Điểm đi và điểm đến không được trùng nhau.
  - Khi không tìm thấy tuyến: hiển thị banner trợ giúp: *"Chưa có tuyến kết nối trực tiếp hai điểm này trong bán kính 500m. Quý khách vui lòng chọn trạm trung chuyển gần nhất hoặc xem danh sách tất cả các tuyến bên dưới."*

---

#### MÀN HÌNH 2: CHI TIẾT TUYẾN — BẢN ĐỒ, DANH SÁCH TRẠM & KHUNG GIỜ CHẠY
- **Đường dẫn**: `/routes/[id]` (hoặc `/tuyen-xe/[routeCode]`)
- **Quyền truy cập**: Public.
- **Mục tiêu**: Hiển thị toàn bộ lộ trình trực quan trên bản đồ Goong Map, danh sách trạm dừng theo thứ tự tích luỹ và lịch xuất bến tĩnh.
- **Bố cục Wireframe**:
```
+--------------------------------------------------------------------------+
|  VIVU BUS               [Tìm tuyến] [Mua vé] [Vé của tôi]     [Tài khoản]|
+--------------------------------------------------------------------------+
|  < Quay lại danh sách tuyến                                              |
|  TUYẾN 01: BẾN XE LONG BIÊN - BẾN XE HÀ ĐÔNG                             |
|  Chiều: [o] Lượt đi (Bến xe Long Biên -> Hà Đông)  [ ] Lượt về          |
+------------------------------------+-------------------------------------+
|  KHUNG BẢN ĐỒ LỘ TRÌNH             |  DANH SÁCH TRẠM DỪNG (Thứ tự)       |
|  +------------------------------+  |  (1) Bến xe Long Biên (Km 0.0)      |
|  |                              |  |      |                              |
|  |   [Bản đồ Goong Map]         |  |  (2) Hồ Hoàn Kiếm (Km 2.5, +8p)     |
|  |   - Các marker trạm 1..5     |  |      |                              |
|  |   - Đường polyline nối trạm  |  |  (3) Ga Hà Nội (Km 4.8, +16p)       |
|  |                              |  |      |                              |
|  |                              |  |  (4) Ngã Tư Sở (Km 8.2, +27p)       |
|  |                              |  |      |                              |
|  |   (Attribution nhỏ góc dưới) |  |  (5) Bến xe Hà Đông (Km 12.6, +41p) |
|  +------------------------------+  +-------------------------------------+
|                                    |  LỊCH XUẤT BẾN TRONG NGÀY (Schedules)|
|  Thông số vận hành:                |  Chuyến sáng: 06:00, 06:30, 07:00   |
|  - Cự ly toàn tuyến: 12.6 km       |  Chuyến trưa: 11:30, 12:00, 12:30   |
|  - Thời gian dự kiến: ~41 phút     |  Chuyến chiều/tối: 17:00, 17:30...  |
|  - Vận tốc trung bình: 18.5 km/h   |  Tần suất: 15 - 20 phút/chuyến      |
|  [ NÚT: MUA VÉ TUYẾN NÀY ]         |                                     |
+------------------------------------+-------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - Dữ liệu tuyến (`bus_routes`): Tên, số hiệu, hướng đi (`FORWARD` / `BACKWARD`).
  - Danh sách trạm (`route_stops` join `bus_stops`): `stop_sequence`, `stop_name`, `address`, `distance_from_start_km`, toạ độ `latitude`, `longitude`.
  - Goong Map Canvas: Hiển thị polyline kết nối các toạ độ trạm dừng theo đúng thứ tự `stop_sequence`; gắn marker có số thứ tự trạm.
  - Khung giờ chạy (`schedules`): `departure_time`, `average_speed_kmh`, `days_of_week`.
- **Tương tác**:
  - Bấm vào tên trạm trong danh sách -> Bản đồ tự động pan & zoom đến vị trí marker trạm đó kèm popup thông tin địa chỉ.
  - Bấm nút "Mua vé tuyến này" -> Điều hướng sang Màn hình 3 với `routeId` được chọn sẵn.

---

#### MÀN HÌNH 3: CHỌN MUA VÉ (TICKET PURCHASE / BOOKING)
- **Đường dẫn**: `/booking` hoặc `/mua-ve?routeId=...`
- **Quyền truy cập**: Public (Hỗ trợ cả khách đã đăng nhập và Guest Checkout không cần tài khoản).
- **Mục tiêu**: Chọn tuyến buýt, chọn loại vé (Lượt / Ngày / Tháng), đối tượng (Thường / HSSV), số lượng, ngày kích hoạt; **tuyệt đối không có bước chọn ghế**.
- **Bố cục Wireframe**:
```
+--------------------------------------------------------------------------+
|  VIVU BUS               [Tìm tuyến] [Mua vé] [Vé của tôi]                |
+--------------------------------------------------------------------------+
|  ĐẶT MUA VÉ XE BUÝT ĐIỆN TỬ                                              |
|                                                                          |
|  Bước 1: Tuyến xe áp dụng                                                |
|  [ Chọn tuyến xe: Tuyến 01 (Bến xe Long Biên - Bến xe Hà Đông)       [v] ]|
|                                                                          |
|  Bước 2: Chọn loại vé                                                    |
|  ( ) VÉ LƯỢT (Single Ride)           ( ) VÉ NGÀY (Daily Pass)            |
|      Hiệu lực 1 lượt (2 giờ)             Hiệu lực 24 giờ                 |
|      Giá: 7.000 đ                        Giá: 30.000 đ                   |
|                                                                          |
|  ( ) VÉ THÁNG (Monthly Pass)                                             |
|      Hiệu lực 30 ngày                                                    |
|      Giá: 200.000 đ                                                      |
|                                                                          |
|  Bước 3: Đối tượng hành khách                                            |
|  [o] Tiêu chuẩn (Giá thông thường)                                       |
|  [ ] Học sinh / Sinh viên (Áp dụng ưu đãi: Vé lượt 3.000đ, Tháng 100.000đ)|
|      * Lưu ý: Vui lòng mang theo thẻ HSSV khi lên xe để xuất trình.     |
|                                                                          |
|  Bước 4: Ngày bắt đầu kích hoạt hiệu lực                                 |
|  [ Ngày kích hoạt: [ 2026-10-02 ] (Mặc định là ngày hôm nay)          ]  |
|                                                                          |
|  Bước 5: Số lượng vé                                                     |
|  [ - ]   [ 1 ] vé   [ + ]                                                |
|                                                                          |
|  Bước 6: Thông tin người nhận vé (Dành cho khách chưa đăng nhập)         |
|  (Người dùng đã đăng nhập: Tự động dùng SĐT & Email tài khoản)          |
|  Số điện thoại nhận mã tra cứu vé: [ 0912 345 678                 ] (*)  |
+--------------------------------------------------------------------------+
|  TỔNG TIỀN THANH TOÁN: 7.000 đ                                           |
|  [ NÚT LỚN: TIẾP TỤC THANH TOÁN VIETQR -> ]                              |
+--------------------------------------------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - Tuyến áp dụng (`bus_routes` dropdown).
  - Loại vé (`ticket_types` radio cards): `category` (SINGLE_RIDE, DAILY_PASS, MONTHLY_PASS), `price`, `validity_hours`, `validity_days`.
  - Đối tượng: checkbox/toggle `is_student_price`.
  - Ngày kích hoạt: date picker `activation_date` (tối thiểu là hôm nay).
  - Số lượng: input number `quantity` (tối thiểu 1, tối đa 10/lần mua).
  - Thông tin khách: `guest_phone` (bắt buộc nếu không có JWT Auth header).
- **Quy tắc Validate form**:
  - `ticket_type_id`: Bắt buộc chọn.
  - `route_id`: Bắt buộc chọn.
  - `quantity`: Số nguyên dương >= 1.
  - `activation_date`: >= Ngày hiện tại (không được chọn ngày quá khứ).
  - `guest_phone`: Định dạng SĐT di động Việt Nam (10 chữ số, đầu số 03, 05, 07, 08, 09) nếu chưa đăng nhập.

---

#### MÀN HÌNH 4: THANH TOÁN VIETQR & ĐẾM NGƯỢC THỜI GIAN
- **Đường dẫn**: `/payment/[orderId]` hoặc `/thanh-toan/[orderCode]`
- **Quyền truy cập**: Public (Người tạo đơn hàng qua link hoặc điều hướng từ Mua vé).
- **Mục tiêu**: Hiển thị mã QR VietQR động (chuẩn Napas), thông tin tài khoản ngân hàng SePay, nội dung chuyển khoản bắt buộc, đồng hồ đếm ngược 15 phút và cơ chế tự động cập nhật trạng thái đơn hàng.
- **Bố cục Wireframe**:
```
+--------------------------------------------------------------------------+
|  VIVU BUS                                          ĐƠN HÀNG: DH261002001 |
+--------------------------------------------------------------------------+
|  THANH TOÁN ĐƠN HÀNG MUA VÉ XE BUÝT                                      |
|                                                                          |
|  Thời gian giữ đơn hàng còn lại:                                         |
|  [  ĐỒNG HỒ ĐẾM NGƯỢC: 14:32  ] (Thanh tiến trình giảm dần)              |
|                                                                          |
|  +-------------------------------+  THÔNG TIN CHUYỂN KHOẢN CHÍNH XÁC     |
|  |                               |  Ngân hàng: [ VietinBank / MBBank ]   |
|  |     [ MÃ VIETQR ĐỘNG ]        |  Chủ tài khoản: [ CTY XE BUYT VIVU ]  |
|  |   (Chứa sẵn Số tiền &         |  Số tài khoản: [ 10283948572 ] [Sao chép]|
|  |    Nội dung DH261002001)      |  Số tiền: [ 7.000 đ ]          [Sao chép]|
|  |                               |  Nội dung CK: [ DH261002001 ]  [Sao chép]|
|  +-------------------------------+                                       |
|  * Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động xuất vé.|
|                                                                          |
|  [ Vòng xoay Spinner ] Đang chờ ngân hàng xác nhận giao dịch...         |
+--------------------------------------------------------------------------+
|  (Trường hợp hết thời gian 15 phút):                                      |
|  [ ! Đơn hàng đã hết hạn thanh toán ]                                    |
|  [ Nút: Tạo lại mã thanh toán mới ]                                      |
+--------------------------------------------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - Mã đơn hàng: `order_code`.
  - Tổng tiền: `total_amount` (hiển thị định dạng tiền tệ VND: `7.000 đ`).
  - Hạn thanh toán: `expires_at` (15 phút kể từ lúc tạo).
  - Ảnh VietQR: Render mã QR động chuẩn VietQR chứa số tài khoản thụ hưởng, mã ngân hàng SePay, số tiền `total_amount` và nội dung chuyển khoản chính xác `order_code`.
  - Nút Copy tiện lợi: Sao chép STK, Sao chép Số tiền, Sao chép Nội dung CK.
- **Tương tác & Cơ chế hoạt động**:
  - **Countdown Timer**: Đếm lùi từng giây từ `expires_at - now`. Khi về 00:00, chuyển ngay sang trạng thái EXPIRED, khoá mã QR và hiện nút *"Tạo lại mã thanh toán"*.
  - **Tự động thăm dò (Polling/SSE)**: Client gọi `GET /api/orders/:id` mỗi 2.5 - 3 giây.
  - **Xử lý khi Webhook kích hoạt thành công**: Nhận được `status = PAID` -> Hiển thị hiệu ứng thông báo thành công (tick xanh), kèm âm thanh báo nhẹ (nếu cho phép) và chuyển hướng tự động sau 1.5 giây sang **Màn hình 5: Vé của tôi** (hoặc Modal xem vé chi tiết).

---

#### MÀN HÌNH 5: VÉ CỦA TÔI & CHI TIẾT VÉ ĐIỆN TỬ
- **Đường dẫn**: `/tickets` (hoặc `/tra-cuu-ve` cho Guest)
- **Quyền truy cập**: User đăng nhập (xem vé cá nhân) HOẶC Guest (nhập `orderCode` + `phone` qua form tra cứu).
- **Mục tiêu**: Hiển thị danh sách vé điện tử đã mua, phân loại theo trạng thái (Đang hiệu lực, Đã sử dụng, Hết hạn) và mở Modal xem mã QR vé (chứa JWT payload) để xuất trình cho nhân viên soát vé.
- **Bố cục Wireframe**:
```
+--------------------------------------------------------------------------+
|  VIVU BUS               [Tìm tuyến] [Mua vé] [Vé của tôi]     [Tài khoản]|
+--------------------------------------------------------------------------+
|  VÉ XE BUÝT CỦA TÔI                                                      |
|                                                                          |
|  Bộ lọc: [ Tab: Đang hiệu lực (2) ]  [ Tab: Đã sử dụng ]  [ Tab: Hết hạn ]|
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  | THẺ VÉ: VÉ LƯỢT TIÊU CHUẨN                       [ ĐANG HIỆU LỰC ] |  |
|  | Tuyến: 01 (Bến xe Long Biên - Bến xe Hà Đông)                      |  |
|  | Mã vé: TK-261002-0089                                              |  |
|  | Hiệu lực từ: 06:00 02/10/2026 - Đến: 08:00 02/10/2026              |  |
|  | [ NÚT LỚN: MỞ MÃ QR SOÁT VÉ (Icon QR) ]                            |  |
|  +--------------------------------------------------------------------+  |
|  | THẺ VÉ: VÉ NGÀY                                  [ ĐÃ SỬ DỤNG ]    |  |
|  | Áp dụng toàn mạng lưới tuyến                                       |  |
|  | Đã soát vé lúc: 09:15 01/10/2026 bởi NV Nguyễn Văn Soát            |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
|  (Khu vực tra cứu dành cho khách chưa đăng nhập / Guest Lookup):         |
|  Tra cứu vé bằng mã đơn: [ Mã đơn DH... ] [ SĐT... ] [ Tra cứu vé ]     |
+--------------------------------------------------------------------------+
```
- **Modal Chi tiết vé & Mã QR (Xem chi tiết tại Mục 4.2)**:
  - Khi bấm *"Mở mã QR soát vé"*: Popup hiển thị mã QR kích thước lớn, độ tương phản cao, mã vé in đậm, thời hạn hiệu lực đếm lùi, tên tuyến áp dụng.

---

#### MÀN HÌNH 6: GỬI PHẢN ÁNH & KHIẾU NẠI (FEEDBACK / COMPLAINT)
- **Đường dẫn**: `/feedback` hoặc `/khieu-nai`
- **Quyền truy cập**: Public (Cả hành khách đăng nhập lẫn khách vãng lai).
- **Mục tiêu**: Tiếp nhận ý kiến đóng góp, phản ánh chất lượng xe, thái độ phục vụ hoặc sự cố mua vé của người dân để bộ phận quản trị xử lý.
- **Bố cục Wireframe**:
```
+--------------------------------------------------------------------------+
|  VIVU BUS               [Tìm tuyến] [Mua vé] [Vé của tôi]     [Phản ánh] |
+--------------------------------------------------------------------------+
|  GỬI PHẢN ÁNH & Ý KIẾN ĐÓNG GÓP                                          |
|  Chúng tôi luôn lắng nghe ý kiến của quý khách để nâng cao chất lượng.    |
|                                                                          |
|  Phân loại phản ánh: (*)                                                 |
|  [ Chọn: Thái độ phục vụ / Sự cố thanh toán / Chất lượng xe / Khác  [v] ]|
|                                                                          |
|  Tuyến xe liên quan (Không bắt buộc):                                    |
|  [ Chọn tuyến xe: Tuyến 01 (Bến xe Long Biên - Hà Đông)              [v] ]|
|                                                                          |
|  Nội dung chi tiết phản ánh: (*)                                         |
|  +--------------------------------------------------------------------+  |
|  | Vui lòng mô tả chi tiết sự việc, thời gian và địa điểm gặp sự cố...|  |
|  | (Tối đa 1000 ký tự)                                                |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
|  Thông tin liên hệ phản hồi:                                             |
|  Họ và tên: [ Nguyễn Văn A        ]  Số điện thoại: [ 0987 654 321    ]  |
|                                                                          |
|  [ NÚT: GỬI PHẢN ÁNH NGAY ]                                              |
+--------------------------------------------------------------------------+
|  (Sau khi gửi): Banner thông báo: "Cảm ơn quý khách. Phản ánh đã được    |
|  tiếp nhận với mã #PA-092. Ban quản lý sẽ xử lý trong vòng 24 giờ."      |
+--------------------------------------------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - `category`: Bắt buộc (`SERVICE_ATTITUDE`, `PAYMENT_ISSUE`, `BUS_CONDITION`, `ROUTE_SCHEDULE`, `OTHER`).
  - `routeId`: Tuỳ chọn (dropdown danh sách tuyến).
  - `content`: Bắt buộc (từ 10 đến 1000 ký tự).
  - Thông tin người gửi: `fullName`, `phone`, `email` (tự điền nếu đã đăng nhập).

---

### B. CỔNG NHÂN VIÊN SOÁT VÉ (INSPECTOR PORTAL)

*Đặc thù thiết kế*: Tối ưu 100% cho màn hình điện thoại di động cầm tay (Mobile Viewport: 360px - 430px), phông chữ to, tương phản cao ngoài trời, vùng chạm nút bấm lớn (tối thiểu 48px).

#### MÀN HÌNH 7: MÀN HÌNH QUÉT MÃ QR SOÁT VÉ (INSPECTOR SCANNER)
- **Đường dẫn**: `/inspector/scan` (Yêu cầu đăng nhập tài khoản có role `inspector`).
- **Mục tiêu**: Sử dụng camera điện thoại quét mã QR vé của hành khách, tự động giải mã JWT, gọi API kiểm tra tính hợp lệ và hiển thị kết quả siêu lớn (Xanh/Đỏ); hỗ trợ nhập tay mã vé dự phòng.
- **Bố cục Wireframe (Giao diện Mobile)**:
```
+-----------------------------------------------+
|  VIVU SOÁT VÉ           Ca: NV Nguyễn Văn Soát |
|  [Tab: Quét Camera]        [Tab: Lịch sử ca]  |
+-----------------------------------------------+
|  KHUNG CAMERA QUÉT MÃ QR                      |
|  +-----------------------------------------+  |
|  |  \                                   /  |  |
|  |     [ KHUNG NGẮM CĂN CHỈNH QR ]         |  |
|  |     (Đèn flash: [Bật/Tắt] [Đổi cam])    |  |
|  |  /                                   \  |  |
|  +-----------------------------------------+  |
|  Hướng camera về phía mã QR trên điện thoại khách|
|                                               |
|  Hoặc nhập tay mã vé nếu camera không đọc được:|
|  [ Nhập mã vé: TK-261002-0089        ] [Kiểm] |
+-----------------------------------------------+
|  KẾT QUẢ XÁC THỰC (Hiển thị đè dạng Bottom Sheet)|
|  -------------------------------------------  |
|  TRƯỜNG HỢP 1: HỢP LỆ (NỀN XANH LÁ ĐẬM)       |
|  [ V ICON ] VÉ HỢP LỆ                         |
|  Mã vé: TK-261002-0089                        |
|  Loại vé: Vé lượt - Học sinh/Sinh viên        |
|  Tuyến: Tuyến 01 (Long Biên - Hà Đông)        |
|  Hạn dùng: Đến 08:00 hôm nay (Còn 45 phút)    |
|  -------------------------------------------  |
|  [ NÚT TO: XÁC NHẬN SOÁT VÉ (ĐÁNH DẤU ĐÃ DÙNG)]|
|                                               |
|  TRƯỜNG HỢP 2: KHÔNG HỢP LỆ (NỀN ĐỎ CẢNH BÁO) |
|  [ X ICON ] VÉ KHÔNG HỢP LỆ                   |
|  LÝ DO: "Vé đã được sử dụng lúc 07:15"        |
|  (hoặc: "Vé đã hết hạn sử dụng")              |
|  [ NÚT: QUÉT TIẾP ]                           |
+-----------------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - Video stream HTML5 Camera (sử dụng thư viện đọc QR như `html5-qrcode` hoặc canvas native).
  - Ô nhập tay `ticketCode` fallback.
  - Kết quả API trả về từ `POST /api/tickets/verify`:
    * `{ valid: true, ticket: { ticketCode, typeName, routeName, validUntil } }` -> Thẻ xanh lá.
    * `{ valid: false, reason: "Vé đã được sử dụng" | "Vé đã hết hạn" | "Mã QR không hợp lệ" }` -> Thẻ đỏ cảnh báo.
  - Nút bấm xác nhận chuyển trạng thái vé sang `USED`.

---

#### MÀN HÌNH 8: LỊCH SỬ SOÁT VÉ TRONG CA (SHIFT INSPECTION HISTORY)
- **Đường dẫn**: `/inspector/history`
- **Mục tiêu**: Liệt kê các vé nhân viên hiện tại đã kiểm tra thành công trong ca làm việc hôm nay, phục vụ việc đối soát tức thì số lượng hành khách đã lên xe.
- **Bố cục Wireframe**:
```
+-----------------------------------------------+
|  VIVU SOÁT VÉ           NV: Nguyễn Văn Soát   |
|  [Quét Camera]             [Tab: Lịch sử ca]  |
+-----------------------------------------------+
|  LỊCH SỬ SOÁT VÉ HÔM NAY (02/10/2026)         |
|  Tổng số vé đã soát: 42 vé (Lượt: 35 | Ngày: 7)|
|                                               |
|  +-----------------------------------------+  |
|  | 07:45 - TK-261002-0089                  |  |
|  | Vé lượt HSSV | Tuyến 01                 |  |
|  | [Đã soát thành công]                    |  |
|  +-----------------------------------------+  |
|  | 07:42 - TK-261002-0088                  |  |
|  | Vé ngày tiêu chuẩn                      |  |
|  | [Đã soát thành công]                    |  |
|  +-----------------------------------------+  |
|  | 07:38 - TK-261002-0085                  |  |
|  | Vé lượt tiêu chuẩn | Tuyến 01           |  |
|  | [Đã soát thành công]                    |  |
|  +-----------------------------------------+  |
|  [ Tải thêm các vé trước đó... ]              |
+-----------------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - Bộ đếm tổng vé trong ca (`totalInspectedTickets`).
  - Danh sách thẻ vé: `ticket_code`, `category` / `ticket_type_name`, `route_name`, `used_at` (giờ:phút:giây).

---

### C. CỔNG QUẢN TRỊ HỆ THỐNG (ADMIN PORTAL)

*Đặc thù thiết kế*: Giao diện quản trị Desktop chuyên nghiệp với Sidebar cố định, Bảng dữ liệu có phân trang, Lọc nâng cao, Modal biểu mẫu CRUD và Đồ thị thống kê trực quan.

#### MÀN HÌNH 9: DASHBOARD PHÂN TÍCH TỔNG QUAN
- **Đường dẫn**: `/admin/dashboard` (Quyền: Role `admin`).
- **Mục tiêu**: Cung cấp bức tranh toàn cảnh về hoạt động kinh doanh và vận hành mạng lưới xe buýt: doanh thu, số vé bán ra, tuyến chạy khách nhất và phân bổ giờ cao điểm.
- **Bố cục Wireframe**:
```
+--------------------------------------------------------------------------+
| [VIVU ADMIN] | Dashboard | Tuyến & Trạm | Xe & Lịch | Vé | Đơn | Phản ánh|
+--------------+-----------------------------------------------------------+
|  TỔNG QUAN VẬN HÀNH & KINH DOANH                 [ Hôm nay: 02/10/2026 ] |
|                                                                          |
|  +------------------+  +------------------+  +------------------+        |
|  | DOANH THU HÔM NAY|  | VÉ BÁN TRONG NGÀY|  | TUYẾN HOẠT ĐỘNG  |        |
|  | 3.850.000 đ      |  | 420 vé           |  | 12 / 12 tuyến    |        |
|  | (+12% so hôm qua)|  | (Vé lượt: 310)   |  | (100% khả dụng)  |        |
|  +------------------+  +------------------+  +------------------+        |
|                                                                          |
|  +------------------------------------+  +----------------------------+  |
|  | BIỂU ĐỒ DOANH THU THEO THỜI GIAN   |  | TOP TUYẾN DOANH THU CAO    |  |
|  | [Bộ lọc: Ngày / Tuần / Tháng]     |  | 1. Tuyến 01: 1.450.000 đ   |  |
|  |                                    |  | 2. Tuyến 02: 980.000 đ     |  |
|  |  (Biểu đồ đường/cột thể hiện biến  |  | 3. Tuyến 08: 720.000 đ     |  |
|  |   động doanh thu từ các đơn PAID)  |  | 4. Tuyến 32: 410.000 đ     |  |
|  +------------------------------------+  +----------------------------+  |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  | BIỂU ĐỒ PHÂN BỐ KHUNG GIỜ CAO ĐIỂM (Dựa trên giờ tạo đơn mua vé)   |  |
|  | [||] 06h-08h: Cao điểm sáng (38%)                                  |  |
|  | [|]  11h-13h: Trưa (14%)                                           |  |
|  | [||] 17h-19h: Cao điểm chiều (42%)                                 |  |
|  | [.]  Các giờ khác: Thấp điểm (6%)                                  |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - Chỉ số tổng hợp (KPI Cards): Doanh thu hôm nay/tuần/tháng, Tổng số vé bán ra, Tuyến đang hoạt động (`is_active = true`).
  - Biểu đồ thời gian (Revenue Chart): Doanh thu theo mốc thời gian lọc từ bảng `orders` (trạng thái `PAID`).
  - Danh sách Top tuyến: Xếp hạng tuyến xe buýt theo doanh thu và số lượng vé bán ra.
  - Biểu đồ nhiệt giờ cao điểm (Peak Hours Histogram): Tần suất phân bổ giờ mua vé từ trường `created_at` của các đơn hàng thành công.

---

#### MÀN HÌNH 10: QUẢN LÝ TUYẾN & TRẠM DỪNG (ROUTES & STOPS)
- **Đường dẫn**: `/admin/routes`
- **Mục tiêu**: CRUD Tuyến buýt; CRUD Trạm dừng (kết nối toạ độ Goong Map); Sắp xếp thứ tự trạm trên tuyến (`route_stops`), tính khoảng cách tích luỹ.
- **Bố cục Wireframe**:
```
+--------------------------------------------------------------------------+
| [VIVU ADMIN] | Dashboard | [Tuyến & Trạm] | Xe & Lịch | Vé | Đơn | Phản ánh|
+--------------------------------------------------------------------------+
|  QUẢN LÝ MẠNG LƯỚI TUYẾN VÀ TRẠM DỪNG            [+ Thêm tuyến mới]      |
|                                                                          |
|  Tab: [ Danh sách tuyến buýt ]   [ Danh mục trạm dừng ]                  |
|                                                                          |
|  DANH SÁCH TUYẾN XE:                                                     |
|  +-------+-----------------------------+---------+-------+-------+-----+ |
|  | Mã    | Tên tuyến                   | Hướng   | Số trạm| T.Thái| T.Tác| |
|  +-------+-----------------------------+---------+-------+-------+-----+ |
|  | 01    | BX Long Biên - BX Hà Đông   | FORWARD | 5     | Hiện  | [S][X]| |
|  | 01    | BX Hà Đông - BX Long Biên   | BACKWARD| 5     | Hiện  | [S][X]| |
|  +-------+-----------------------------+---------+-------+-------+-----+ |
|                                                                          |
|  CHI TIẾT THỨ TỰ TRẠM CỦA TUYẾN 01 (LƯỢT ĐI):                            |
|  [ Kéo thả hoặc bấm nút mũi tên để đổi thứ tự trạm ]  [+ Gán thêm trạm] |
|  1. Bến xe Long Biên (Km 0.0)          [^] [v] [Xoá khỏi tuyến]          |
|  2. Hồ Hoàn Kiếm (Km 2.5)              [^] [v] [Xoá khỏi tuyến]          |
|  3. Ga Hà Nội (Km 4.8)                 [^] [v] [Xoá khỏi tuyến]          |
|  4. Ngã Tư Sở (Km 8.2)                 [^] [v] [Xoá khỏi tuyến]          |
|  5. Bến xe Hà Đông (Km 12.6)           [^] [v] [Xoá khỏi tuyến]          |
|  [ NÚT: LƯU THỨ TỰ TRẠM MỚI ]                                            |
+--------------------------------------------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - Bảng Tuyến: `route_code`, `route_name`, `direction`, `description`, `is_active`.
  - Bảng Trạm: `stop_name`, `address`, `latitude`, `longitude`.
  - Bảng Gán trạm (`route_stops`): `stop_sequence`, `distance_from_start_km`.
- **Ràng buộc nghiệp vụ quan trọng**:
  - Khi xoá tuyến (`DELETE /api/admin/routes/:id`): Nếu tuyến đã phát sinh đơn hàng hoặc vé còn hiệu lực, hệ thống từ chối xoá cứng (trả mã 409) và chuyển sang yêu cầu vô hiệu hoá (`is_active = false`) để đảm bảo toàn vẹn dữ liệu kế toán và lịch sử soát vé.

---

#### MÀN HÌNH 11: QUẢN LÝ XE & LỊCH CHẠY (BUSES & SCHEDULES)
- **Đường dẫn**: `/admin/buses` và `/admin/schedules`
- **Mục tiêu**: CRUD xe buýt trong đội xe; Gán xe cho tuyến và cấu hình giờ xuất bến tĩnh (`schedules`).
- **Bố cục Wireframe**:
```
+--------------------------------------------------------------------------+
| [VIVU ADMIN] | Dashboard | Tuyến & Trạm | [Xe & Lịch] | Vé | Đơn | Phản ánh|
+--------------------------------------------------------------------------+
|  QUẢN LÝ ĐỘI XE & LỊCH XUẤT BẾN TĨNH                                     |
|  [+ Thêm xe mới]   [+ Tạo lịch chạy mới]                                 |
|                                                                          |
|  DANH SÁCH LỊCH CHẠY (SCHEDULES):                                        |
|  Lọc theo tuyến: [ Tuyến 01 - BX Long Biên - Hà Đông                 [v] ]|
|  +------------+-------------+--------------+-----------+---------+-----+ |
|  | Giờ xuất bến| Tuyến       | Biển số xe   | Sức chứa  | Vận tốc | T.Tác| |
|  +------------+-------------+--------------+-----------+---------+-----+ |
|  | 06:00:00   | Tuyến 01    | 29B-123.45   | 60 chỗ    | 18.5km/h| [S][X]| |
|  | 06:30:00   | Tuyến 01    | 29B-678.90   | 60 chỗ    | 18.5km/h| [S][X]| |
|  | 07:00:00   | Tuyến 01    | 29B-123.45   | 60 chỗ    | 18.5km/h| [S][X]| |
|  +------------+-------------+--------------+-----------+---------+-----+ |
|                                                                          |
|  DANH SÁCH ĐỘI XE (BUSES):                                               |
|  - 29B-123.45 | Sức chứa: 60 | Trạng thái: Đang hoạt động | [Sửa] [Khoá] |
|  - 29B-678.90 | Sức chứa: 60 | Trạng thái: Đang hoạt động | [Sửa] [Khoá] |
+--------------------------------------------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - `buses`: `license_plate` (Biển số xe, duy nhất), `capacity` (Sức chứa), `is_active`.
  - `schedules`: `route_id`, `bus_id`, `departure_time` (hh:mm:ss), `average_speed_kmh`, `days_of_week`.
- **Quy tắc Validate**:
  - Không cho phép gán cùng 1 xe buýt chạy trùng giờ xuất bến ở hai lịch trình khác nhau trong cùng ngày.

---

#### MÀN HÌNH 12: QUẢN LÝ LOẠI VÉ & BẢNG GIÁ (TICKET TYPES & PRICING)
- **Đường dẫn**: `/admin/ticket-types`
- **Mục tiêu**: CRUD các gói vé (Vé lượt, Vé ngày, Vé tháng), cấu hình mức giá tiêu chuẩn và giá ưu đãi học sinh/sinh viên.
- **Bố cục Wireframe**:
```
+--------------------------------------------------------------------------+
| [VIVU ADMIN] | Dashboard | Tuyến & Trạm | Xe & Lịch | [Loại vé] | Đơn... |
+--------------------------------------------------------------------------+
|  BẢNG GIÁ & QUẢN LÝ LOẠI VÉ ĐIỆN TỬ               [+ Thêm loại vé mới]   |
|                                                                          |
|  +--------------------+------------+---------+-----------+-------+-----+ |
|  | Loại vé            | Nhóm       | Giá vé  | Thời hạn  | Đối t.| T.Thái| |
|  +--------------------+------------+---------+-----------+-------+-----+ |
|  | Vé lượt - Thường   | SINGLE_RIDE| 7.000 đ | 2 giờ     | Chung | [v] | |
|  | Vé lượt - HSSV     | SINGLE_RIDE| 3.000 đ | 2 giờ     | HSSV  | [v] | |
|  | Vé ngày toàn mạng  | DAILY_PASS | 30.000 đ| 24 giờ    | Chung | [v] | |
|  | Vé tháng - Thường  | MONTHLY_PAS|200.000 đ| 30 ngày   | Chung | [v] | |
|  | Vé tháng - HSSV    | MONTHLY_PAS|100.000 đ| 30 ngày   | HSSV  | [v] | |
|  +--------------------+------------+---------+-----------+-------+-----+ |
|                                                                          |
|  * Ghi chú nghiệp vụ: Khi sửa đổi giá vé, giá mới chỉ áp dụng cho các    |
|    đơn hàng tạo sau thời điểm sửa. Đơn hàng cũ giữ nguyên giá snapshot. |
+--------------------------------------------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - `category`: `SINGLE_RIDE`, `DAILY_PASS`, `MONTHLY_PASS`.
  - `name`: Tên gói vé hiển thị ra ngoài cho khách mua.
  - `price`: Mệnh giá (VND).
  - `validity_hours`: Thời gian hiệu lực tính bằng giờ (áp dụng cho vé lượt / vé ngày).
  - `validity_days`: Thời gian hiệu lực tính bằng ngày (áp dụng cho vé tháng).
  - `is_student_price`: Cờ đánh dấu giá ưu đãi học sinh sinh viên.
  - `is_active`: Kích hoạt / Tạm dừng bán.

---

#### MÀN HÌNH 13: QUẢN LÝ ĐƠN HÀNG, TRA CỨU VÉ & LOG GIAO DỊCH SEPAY
- **Đường dẫn**: `/admin/orders`
- **Mục tiêu**: Tra cứu toàn bộ đơn hàng mua vé, xem các vé điện tử sinh ra từ đơn, đối soát log giao dịch webhook SePay (`payment_transactions`) khi có lệch cước hoặc khiếu nại.
- **Bố cục Wireframe**:
```
+--------------------------------------------------------------------------+
| [VIVU ADMIN] | Dashboard | Tuyến... | [Đơn hàng & Vé] | Phản ánh | N.Viên|
+--------------------------------------------------------------------------+
|  QUẢN LÝ ĐƠN HÀNG & NHẬT KÝ GIAO DỊCH SEPAY                              |
|                                                                          |
|  Bộ lọc: Trạng thái: [ Tất cả / PENDING / PAID / CANCELLED / EXPIRED [v] ]|
|  Từ ngày: [ 01/10/2026 ] Đến ngày: [ 02/10/2026 ]  Mã đơn: [ Tìm...    ] |
|                                                                          |
|  DANH SÁCH ĐƠN HÀNG:                                                     |
|  +-------------+----------+--------+---------+-----------+--------+-----+ |
|  | Mã đơn      | Người mua| Loại vé| Số lượng| Tổng tiền | Tr.Thái| T.Tác| |
|  +-------------+----------+--------+---------+-----------+--------+-----+ |
|  | DH261002001 | 091234...| Vé lượt| 1       | 7.000 đ   | PAID   | [Xem| |
|  | DH261002002 | user@... | Vé ngày| 2       | 60.000 đ  | PENDING| [Xem| |
|  +-------------+----------+--------+---------+-----------+--------+-----+ |
|                                                                          |
|  CHI TIẾT ĐƠN HÀNG & LOG ĐỐI SOÁT SEPAY: DH261002001                      |
|  - Trạng thái: ĐÃ THANH TOÁN (PAID) lúc 07:12 02/10/2026                 |
|  - SePay Reference Code: `MB-FT2610029381`                               |
|  - Số tiền chuyển: 7.000 đ | Khớp 100% với giá trị đơn hàng              |
|  - Nội dung chuyển khoản nhận được: "DH261002001 ung dung vivu"          |
|  - Vé đã xuất: TK-261002-0089 (Trạng thái: ACTIVE)                       |
+--------------------------------------------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - Dữ liệu đơn hàng (`orders`): `order_code`, `total_amount`, `status`, `activation_date`, `created_at`.
  - Dữ liệu vé (`tickets`): `ticket_code`, `status`, `valid_from`, `valid_until`.
  - Dữ liệu giao dịch ngân hàng (`payment_transactions`): `sepay_reference_code`, `transfer_amount`, `raw_content`, `processed_at`, `raw_payload`.

---

#### MÀN HÌNH 14: QUẢN LÝ PHẢN ÁNH & NHÂN SỰ SOÁT VÉ
- **Đường dẫn**: `/admin/complaints` và `/admin/staff`
- **Mục tiêu**: Xử lý phản ánh từ hành khách (cập nhật trạng thái); Quản lý tài khoản nhân viên soát vé (tạo tài khoản role `inspector`, khoá/mở khoá).
- **Bố cục Wireframe**:
```
+--------------------------------------------------------------------------+
| [VIVU ADMIN] | Dashboard | Tuyến... | Đơn... | [Phản ánh & Nhân sự]      |
+--------------------------------------------------------------------------+
|  Tab: [ Quản lý Phản ánh Hành khách ]     [ Danh sách Nhân viên Soát vé ] |
|                                                                          |
|  DANH SÁCH Ý KIẾN & KHIẾU NẠI HÀNH KHÁCH:                                |
|  Lọc: [ Tất cả / Mới tiếp nhận / Đang xử lý / Đã giải quyết          [v] ]|
|  +-----+-----------------+----------+-------------------+---------+-----+|
|  | Mã  | Phân loại       | Tuyến    | Nội dung tóm tắt  | Tr.Thái | Xử lý|
|  +-----+-----------------+----------+-------------------+---------+-----+|
|  | #92 | Thái độ phục vụ | Tuyến 01 | Phụ xe không hướng| MỚI     | [Đổi]|
|  | #91 | Sự cố thanh toán| Tuyến 01 | Đã trừ tiền nhưng | ĐÃ XONG | [Xem]|
|  +-----+-----------------+----------+-------------------+---------+-----+|
|                                                                          |
|  QUẢN LÝ TÀI KHOẢN NHÂN VIÊN SOÁT VÉ (INSPECTOR):   [+ Thêm tài khoản NV]|
|  +--------------------+-------------------------+---------------+-------+|
|  | Họ tên nhân viên   | Email đăng nhập         | Trạng thái    | Thao t||
|  +--------------------+-------------------------+---------------+-------+|
|  | Nguyễn Văn Soát    | inspector1@busticket.vn | Hoạt động     | [Khoá]||
|  | Trần Văn Kiểm      | inspector2@busticket.vn | Đã khoá       | [Mở]  ||
|  +--------------------+-------------------------+---------------+-------+|
|  * Lưu ý: Tài khoản nhân viên soát vé chỉ do Admin tạo nội bộ.          |
+--------------------------------------------------------------------------+
```
- **Thành phần & Dữ liệu**:
  - `complaints`: `category`, `route_id`, `content`, `status` (`NEW`, `IN_PROGRESS`, `RESOLVED`). Cho phép Admin đổi trạng thái và ghi chú hướng xử lý.
  - `users` (role `inspector`): `full_name`, `email`, `phone`, `is_active`. Cho phép Admin tạo mới hoặc bật/tắt quyền hoạt động (`is_active = 0/1`).

---

## 4. ĐẶC TẢ CÁC MODAL & LUỒNG TƯƠNG TÁC ĐẶC THÙ

### LUỒNG 1: VIETQR ĐỘNG, ĐẾM NGƯỢC 15 PHÚT & TỰ ĐỘNG CẬP NHẬT
1. **Khởi tạo đơn hàng**:
   - Khi hành khách nhấn *"Tiếp tục thanh toán"* tại Màn hình 3, client gửi `POST /api/orders`.
   - Backend sinh `order_code` (vd: `DH` + timestamp + random 4 ký tự), hạn thanh toán `expires_at = NOW() + 15 phút`, trạng thái `PENDING`.
2. **Hiển thị Modal / Màn hình VietQR**:
   - URL ảnh VietQR được sinh động theo chuẩn Napas:
     `https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-compact2.png?amount={AMOUNT}&addInfo={ORDER_CODE}&accountName={ACCOUNT_NAME}`
   - Trình duyệt khởi chạy Web Worker / `setInterval` đếm lùi thời gian `expires_at - currentTime`.
3. **Thăm dò trạng thái giao dịch (Polling / SSE)**:
   - Client gọi `GET /api/orders/:id` mỗi 3000ms.
   - Khi khách quét mã chuyển khoản thành công, SePay gửi Webhook đến `POST /api/webhooks/sepay`.
   - Backend xác thực token, kiểm tra khớp số tiền, cập nhật đơn sang `PAID`, sinh vé `tickets` và lưu `payment_transactions`.
   - Lần poll tiếp theo của client nhận về `status = PAID`:
     * Ngừng timer.
     * Hiển thị màn hình chúc mừng (Modal popup thành công: tick xanh, âm thanh ting nhẹ).
     * Nút bấm: *"Xem vé điện tử ngay"* hoặc tự chuyển hướng sau 2 giây.
4. **Xử lý đơn quá hạn (Lazy Expiry)**:
   - Nếu hết 15 phút chưa nhận được tiền: UI đổi sang giao diện cảnh báo `Hết hạn thanh toán`.
   - Nếu khách cố tình gọi API sau 15 phút, backend tự động update status sang `EXPIRED`.
   - Nút bấm *"Tạo lại mã thanh toán mới"* gọi `POST /api/orders/:id/regenerate` để sao chép thông tin thành đơn hàng mới, giữ nguyên lịch sử đơn cũ.

---

### LUỒNG 2: HIỂN THỊ VÉ ĐIỆN TỬ & MÃ QR JWT
1. **Cấu trúc dữ liệu mã QR**:
   - Mã QR vé không phải chuỗi văn bản thường mà là một JWT (JSON Web Token) được ký bằng secret key của Vivu:
     ```json
     {
       "ticketId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
       "ticketCode": "TK-261002-0089",
       "routeId": "11111111-1111-1111-1111-111111111111",
       "routeCode": "01",
       "category": "SINGLE_RIDE",
       "validFrom": "2026-10-02T06:00:00Z",
       "validUntil": "2026-10-02T08:00:00Z",
       "iat": 1790841600
     }
     ```
2. **Modal hiển thị mã QR trên máy hành khách**:
   - Render qua thư viện canvas SVG (`qrcode`).
   - Mã QR có kích thước chuẩn tối thiểu 240px x 240px để camera nhân viên dễ quét trong bóng râm hoặc ngoài trời sáng.
   - Đặt độ sáng màn hình tự động tối đa (nếu thiết bị hỗ trợ).
   - Hiển thị rõ chữ: *"Xuất trình mã này cho nhân viên soát vé khi lên xe"*.

---

### LUỒNG 3: QUÉT QR SOÁT VÉ (CAMERA / NHẬP TAY / KẾT QUẢ / CHECK-IN)
1. **Khởi động camera**:
   - Màn hình `/inspector/scan` yêu cầu quyền truy cập Camera thiết bị (`facingMode: environment`).
   - Khung ngắm quét QR (reticle box) có vạch căn góc và hiệu ứng quét trực quan.
2. **Giải mã & Kiểm tra tức thì**:
   - Khi camera nhận diện được QR, trích xuất chuỗi JWT payload hoặc chuỗi `ticket_code`.
   - Hiển thị spinner *"Đang đối soát vé..."* để nhân viên không quét lại nhiều lần.
   - Gọi `POST /api/tickets/verify`:
     * Backend verify chữ ký JWT -> Tra cứu trong bảng `tickets`.
     * Kiểm tra trạng thái:
       - Nếu status = `USED`: trả về `valid: false, reason: "Vé đã được sử dụng lúc [used_at]"`
       - Nếu status = `EXPIRED` hoặc `valid_until < NOW()`: trả về `valid: false, reason: "Vé đã hết hạn sử dụng"`
       - Nếu status = `ACTIVE` và còn trong hạn: trả về `valid: true, ticket: { ... }`
3. **Hiển thị kết quả & Đánh dấu đã dùng**:
   - Kết quả **HỢP LỆ**: Toàn bộ nửa dưới màn hình chuyển sang màu xanh lục đậm (`#047857`), icon dấu tick v, hiển thị loại vé (nhắc nhở kiểm tra thẻ HSSV nếu là vé ưu đãi).
   - Nút lớn: **[ XÁC NHẬN SOÁT VÉ (CHECK-IN) ]** -> Cập nhật trạng thái vé thành `USED`, lưu `used_by_inspector_id` và `used_at = NOW()`.
   - Kết quả **KHÔNG HỢP LỆ**: Toàn bộ nửa dưới chuyển sang màu đỏ tươi (`#DC2626`), rung haptic phản hồi, hiển thị lý do bằng chữ in hoa đậm. Nút: **[ QUÉT TIẾP ]**.

---

### LUỒNG 4: BIỂU ĐỒ DASHBOARD PHÂN TÍCH QUẢN TRỊ
1. **Biểu đồ biến động doanh thu (Revenue Line/Bar Chart)**:
   - Dữ liệu trục hoành: Các ngày trong tuần hoặc các tháng trong năm.
   - Trục tung: Doanh thu (VND).
   - Lọc nhanh: Hôm nay / 7 ngày qua / Tháng này / Quý này.
2. **Biểu đồ tỷ lệ loại vé (Ticket Type Distribution)**:
   - Biểu đồ tròn hoặc thanh tỷ lệ: Vé lượt (Single Ride) chiếm bao nhiêu %, Vé ngày (Daily Pass) %, Vé tháng (Monthly Pass) %.
3. **Biểu đồ phụ tải giờ cao điểm (Peak Hours Distribution)**:
   - 24 cột tương ứng 24 giờ trong ngày.
   - Làm nổi bật 2 khung giờ cao điểm đặc trưng của đô thị: 06:30 - 08:30 (Sáng) và 17:00 - 19:00 (Chiều).

---

### LUỒNG 5: SẮP XẾP THỨ TỰ TRẠM TRÊN TUYẾN (ROUTE STOPS REORDER)
1. **Thao tác quản trị**:
   - Admin vào màn hình cấu hình tuyến buýt -> Tab *"Trạm dừng trên tuyến"*.
   - Giao diện cung cấp danh sách trạm có số thứ tự `stop_sequence` (1, 2, 3, 4, 5...).
   - Mỗi hàng có nút mũi tên Di chuyển lên `[^]` và Di chuyển xuống `[v]` (hoặc kéo thả Drag & Drop).
2. **Cập nhật lên server**:
   - Khi Admin hoàn tất bấm *"Lưu thứ tự trạm"*, client gửi `PUT /api/admin/routes/:id/stops/reorder` với body:
     `{ stopIds: ["a1111...", "a2222...", "a3333..."] }`
   - Backend tính lại `stop_sequence` từ 1..N và tính toán lại khoảng cách luỹ kế `distance_from_start_km`.

---

### LUỒNG 6: GỬI & XỬ LÝ PHẢN ÁNH KHIẾU NẠI
1. **Phía Hành khách**:
   - Điền form tại Màn hình 6 -> Gửi `POST /api/complaints`.
   - Trả về mã phản ánh và thông báo xác nhận đã tiếp nhận.
2. **Phía Quản trị viên**:
   - Màn hình 14 lọc phản ánh `NEW`.
   - Bấm xem chi tiết, chọn chuyển sang `IN_PROGRESS` (kèm ghi chú nội bộ).
   - Sau khi liên hệ khách hoặc chấn chỉnh lái phụ xe -> Đổi sang `RESOLVED`.

---

## 5. DANH MỤC TÍNH NĂNG ĐƯỢC PHÁT HIỆN (FEATURES DISCOVERED)

| # | Phân nhóm (Category) | Tính năng (Feature) | Mô tả chi tiết | Dữ liệu đầu vào (Inputs) | Dữ liệu đầu ra (Outputs) | Xử lý lỗi (Error Behavior) | Nguồn phát hiện (Discovered Via) |
|---|---|---|---|---|---|---|---|
| 1 | Passenger Portal | Tra cứu tuyến theo điểm đi/đến | Gợi ý tuyến phù hợp và trạm đón/trả gần nhất dựa trên toạ độ/địa chỉ | `fromLat`, `fromLng`, `toLat`, `toLng` | Danh sách tuyến, trạm lên, trạm xuống, thời gian ước tính, cự ly km | Trả về danh sách rỗng + banner gợi ý trạm thay thế (không báo lỗi 500/400) | Spec §3.1.1, §6.2 |
| 2 | Passenger Portal | Xem chi tiết tuyến & bản đồ Goong Map | Hiển thị lộ trình xe buýt dạng polyline, marker trạm dừng theo thứ tự và thời gian biểu tĩnh | `routeId` hoặc `routeCode` | Thông tin tuyến, mảng trạm dừng có toạ độ, danh sách chuyến chạy trong ngày | 404 NOT_FOUND nếu tuyến không tồn tại hoặc đã bị vô hiệu | Spec §3.1.1, §6.2 |
| 3 | Passenger Portal | Tìm kiếm nhanh tuyến theo số hiệu | Bộ lọc tức thì danh sách tuyến theo mã số (vd: 01, 02) | `search` string | Danh sách tuyến khớp mã hoặc tên | Danh sách rỗng kèm hướng dẫn thử lại | Spec §6.2 |
| 4 | Passenger Portal | Mua vé lượt (Single Ride) | Mua vé áp dụng cho 1 tuyến cụ thể, có hiệu lực trong 2 giờ kể từ kích hoạt, không chọn ghế | `routeId`, `ticketTypeId`, `quantity`, `activationDate` | Đơn hàng `PENDING` kèm mã `orderCode` | 400 VALIDATION_ERROR nếu sai ngày hoặc thiếu tuyến | Spec §1.1, §3.1.3, §6.3 |
| 5 | Passenger Portal | Mua vé ngày (Daily Pass) | Mua vé có hiệu lực 24 giờ đi lại không giới hạn toàn bộ mạng lưới | `ticketTypeId`, `quantity`, `activationDate` | Đơn hàng `PENDING` | 400 nếu loại vé không hoạt động | Spec §3.1.3, §5.2 |
| 6 | Passenger Portal | Mua vé tháng (Monthly Pass) | Mua vé có hiệu lực 30 ngày, tuỳ chọn tuyến hoặc liên tuyến | `routeId`, `ticketTypeId`, `activationDate` | Đơn hàng `PENDING` | 400 nếu dữ liệu ngày không hợp lệ | Spec §3.1.3, §5.2 |
| 7 | Passenger Portal | Mua vé giá ưu đãi Học sinh/Sinh viên | Áp dụng giá vé ưu đãi (3k/lượt, 100k/tháng), không yêu cầu upload giấy tờ | Cờ `is_student_price` | Đơn hàng với tổng tiền ưu đãi | Tính đúng giá theo bảng `ticket_types` | Spec §3.1.3, §9 |
| 8 | Passenger Portal | Mua vé không cần tài khoản (Guest Checkout) | Mua vé nhanh chỉ bằng số điện thoại nhận mã đơn, không ép đăng ký | `guestPhone`, thông tin vé | Đơn hàng gắn với `guestPhone`, không có `userId` | 400 nếu SĐT sai định dạng | Spec §3.1.2, §6.3 |
| 9 | Passenger Portal | Thanh toán VietQR động | Hiển thị mã QR ngân hàng động chứa STK, tên chủ TK, số tiền và mã đơn hàng | `orderId` | Ảnh QR Napas, thông tin chuyển khoản SePay, hạn 15 phút | 404 nếu đơn không tồn tại | Spec §3.1.4, §6.3 |
| 10 | Passenger Portal | Đếm ngược & Tự động huỷ đơn hết hạn | Đồng hồ 15 phút đếm lùi; lazy update trạng thái EXPIRED khi quá hạn | `orderId`, thời gian thực | Trạng thái đơn chuyển EXPIRED, hiển thị thông báo tại chỗ | Đơn EXPIRED không thể thanh toán tiếp | Spec §3.1.4, §6.3 |
| 11 | Passenger Portal | Tạo lại mã thanh toán cho đơn hết hạn | Cho phép hành khách mua lại nhanh đơn đã hết hạn mà không phải nhập lại từ đầu | `orderId` | Đơn hàng mới (mã mới, hạn 15 phút mới), đơn cũ giữ EXPIRED | 400 nếu đơn gốc chưa hết hạn | Spec §6.3 |
| 12 | Passenger Portal | Danh sách Vé của tôi (My Tickets) | Xem danh sách vé đã mua, chia 3 tab (Đang hiệu lực, Đã dùng, Hết hạn) | JWT token hoặc `orderCode` + `phone` | Danh sách vé kèm tuyến, thời hạn, trạng thái | 401 UNAUTHORIZED nếu chưa login và không nhập mã tra cứu | Spec §3.1.5, §6.4 |
| 13 | Passenger Portal | Hiển thị mã QR vé điện tử (JWT signed) | Mở modal hiển thị mã QR chứa JWT đã ký của vé để phụ xe quét | `ticketId` | Hình ảnh QR code độ nét cao, mã vé text | 404 nếu vé không tồn tại | Spec §3.1.5, §6.4 |
| 14 | Passenger Portal | Gửi phản ánh / khiếu nại | Form đóng góp ý kiến về chất lượng xe, phụ xe, thanh toán | `category`, `routeId`, `content`, thông tin liên hệ | Bản ghi `complaints` mới kèm mã phản ánh | 400 nếu thiếu category hoặc content quá ngắn | Spec §3.1.6, §6.5 |
| 15 | Inspector Portal | Đăng nhập tài khoản Soát vé riêng | Đăng nhập với tài khoản do Admin cấp (role `inspector`), giao diện tối giản | `email`/`phone`, `password` | Access Token, chuyển hướng thẳng vào `/inspector/scan` | 401 nếu sai mật khẩu, 403 nếu tài khoản bị khoá | Spec §3.3, §6.1 |
| 16 | Inspector Portal | Quét mã QR vé qua Camera | Mở camera điện thoại, tự động chụp và giải mã chuỗi JWT từ mã QR vé | Luồng video camera thiết bị | Chuỗi QR payload đã giải mã | Thông báo lỗi camera nếu chưa cấp quyền | Spec §3.3, §6.4 |
| 17 | Inspector Portal | Nhập tay mã vé dự phòng | Cho phép gõ mã vé in dưới mã QR khi camera bị mờ/hỏng | `ticketCode` (chuỗi ký tự) | Dữ liệu vé để xác thực | 404 nếu mã vé không có trong hệ thống | Spec §3.3, §6.4 |
| 18 | Inspector Portal | Xác thực vé thời gian thực (Verify Ticket) | Kiểm tra chữ ký JWT, trạng thái ACTIVE, hạn dùng `valid_until` | `qrPayload` hoặc `ticketCode` | `{ valid: true/false, reason, ticket }` | Trả về kết quả 200 với cờ `valid: false` và lý do rõ ràng | Spec §3.3, §6.4 |
| 19 | Inspector Portal | Xác nhận soát vé (Check-in / Chuyển USED) | Nhân viên xác nhận khách lên xe, cập nhật vé sang USED, ghi nhận người soát | `ticketId`, `inspectorId` | Cập nhật vé `USED`, ghi `used_at` | 409 nếu vé vừa bị soát bởi người khác | Spec §3.3, §6.4 |
| 20 | Inspector Portal | Xem lịch sử soát vé trong ca | Danh sách các vé đã soát thành công trong ca hôm nay kèm mốc thời gian | `inspectorId`, ngày hiện tại | Tổng số vé và danh sách chi tiết các vé đã soát | Trả về mảng rỗng nếu đầu ca chưa soát vé nào | Spec §3.3, §8 |
| 21 | Admin Portal | Dashboard tổng quan KPI & Doanh thu | Hiển thị tổng doanh thu ngày/tuần/tháng, số vé bán ra, tuyến đang chạy | Thời gian lọc | Thẻ chỉ số tổng hợp | Tự động tính toán từ bảng `orders` và `tickets` | Spec §3.4.1, §6.6 |
| 22 | Admin Portal | Biểu đồ doanh thu theo thời gian | Trực quan hoá doanh thu các đơn hàng `PAID` theo ngày/tuần/tháng | Khoảng ngày bắt đầu - kết thúc | Mảng số liệu vẽ biểu đồ cột/đường | Trả về 0 nếu ngày không có giao dịch | Spec §3.4.1, §6.6 |
| 23 | Admin Portal | Biểu đồ phân bổ khung giờ cao điểm | Thống kê số lượng giao dịch mua vé theo 24 khung giờ trong ngày | Dữ liệu `orders` thành công | Biểu đồ cột 24 khung giờ | — | Spec §3.4.1, §6.6 |
| 24 | Admin Portal | Bảng xếp hạng Top tuyến đông khách | Thống kê các tuyến có doanh thu và lượt khách mua vé cao nhất | Khoảng thời gian | Danh sách tuyến sắp xếp theo doanh thu giảm dần | — | Spec §3.4.1, §6.6 |
| 25 | Admin Portal | Quản lý Tuyến xe buýt (CRUD Tuyến) | Thêm, sửa thông tin, bật/tắt hoạt động của tuyến buýt | `route_code`, `route_name`, `direction`, `description` | Bản ghi `bus_routes` mới/cập nhật | 409 CONFLICT nếu trùng mã tuyến; chặn xoá cứng nếu có vé | Spec §3.4.2, §6.6 |
| 26 | Admin Portal | Quản lý Trạm dừng (CRUD Trạm) | Thêm trạm dừng mới, nhập địa chỉ, toạ độ lat/lng từ Goong Map | `stop_name`, `address`, `latitude`, `longitude` | Bản ghi `bus_stops` | 400 nếu toạ độ nằm ngoài lãnh thổ | Spec §3.4.2, §6.6 |
| 27 | Admin Portal | Sắp xếp thứ tự trạm trên tuyến (Reorder) | Điều chỉnh thứ tự trạm `route_stops`, tự động tính lại km luỹ kế | `routeId`, mảng `stopId` theo thứ tự mới | Cập nhật `stop_sequence` và `distance_from_start_km` | 400 nếu danh sách trạm không hợp lệ | Spec §3.4.2, §6.6 |
| 28 | Admin Portal | Quản lý Xe buýt (CRUD Đội xe) | Thêm xe vào hệ thống, biển số, sức chứa ghế/đứng | `license_plate`, `capacity`, `is_active` | Bản ghi `buses` | 409 nếu trùng biển số xe | Spec §3.4.3, §6.6 |
| 29 | Admin Portal | Quản lý Lịch chạy tĩnh (Schedules) | Cấu hình giờ xuất bến theo từng tuyến và xe buýt | `route_id`, `bus_id`, `departure_time`, `speed` | Bản ghi `schedules` | 400 nếu trùng giờ xuất bến của cùng 1 xe | Spec §3.4.3, §6.6 |
| 30 | Admin Portal | Quản lý Bảng giá & Loại vé | Cấu hình giá vé lượt, ngày, tháng, ưu đãi HSSV | `category`, `name`, `price`, `validity_hours/days` | Bản ghi `ticket_types` | Sửa giá không đổi giá các đơn đã tạo quá khứ | Spec §3.4.4, §6.6 |
| 31 | Admin Portal | Quản lý Đơn hàng & Lọc trạng thái | Danh sách đơn hàng toàn hệ thống, lọc PENDING/PAID/CANCELLED/EXPIRED | `status`, `fromDate`, `toDate`, `routeId` | Danh sách đơn hàng phân trang | — | Spec §3.4.5, §6.6 |
| 32 | Admin Portal | Tra cứu & Đối soát giao dịch SePay | Xem log webhook SePay nhận được để đối chiếu đơn hàng và tiền về | `orderId` hoặc `sepayReferenceCode` | Bản ghi `payment_transactions` chi tiết | — | Spec §3.4.5, §6.6 |
| 33 | Admin Portal | Quản lý Khiếu nại hành khách | Xem danh sách phản ánh, cập nhật tiến độ xử lý (Mới -> Đang xử lý -> Xong) | `complaintId`, `status`, phản hồi | Cập nhật `complaints.status` | 404 nếu không tìm thấy phản ánh | Spec §3.4.6, §6.5 |
| 34 | Admin Portal | Quản lý Nhân viên Soát vé (Staff) | Tạo tài khoản đăng nhập cho soát vé, khoá/mở khoá tài khoản | `full_name`, `email`, `phone`, `password` | Tài khoản `users` với role `inspector` | Chỉ Admin mới có quyền tạo inspector | Spec §3.4.7, §6.6 |

---

## 6. MA TRẬN TRƯỜNG HỢP BIÊN & NGOẠI LỆ (EDGE CASES MATRIX)

| # | Tính năng liên quan | Trường hợp biên / Đầu vào ngoại lệ (Input / Condition) | Hành vi giao diện & Hệ thống được quy định (Observed / Specified Behavior) |
|---|---|---|---|
| 1 | Màn hình 1 (Tìm tuyến) | Tìm tuyến giữa 2 điểm không có tuyến xe buýt nào đi qua trong bán kính 500m | Giao diện hiển thị Banner rỗng thân thiện: *"Không có tuyến buýt trực tiếp kết nối 2 điểm này trong bán kính 500m. Quý khách vui lòng chọn trạm trung chuyển hoặc xem danh sách tất cả các tuyến bên dưới."* Tuyệt đối không để trống trang hoặc báo lỗi sập. |
| 2 | Màn hình 1 (Tìm tuyến) | Người dùng chọn Điểm đi trùng khớp hoàn toàn với Điểm đến | Khung nhập liệu báo lỗi đỏ viền: *"Điểm xuất phát và điểm đến không được trùng nhau."* Nút tìm kiếm bị vô hiệu hoá (`disabled`). |
| 3 | Màn hình 2 (Chi tiết tuyến) | Tên trạm dừng hoặc địa chỉ trạm quá dài (trên 80 ký tự) | Văn bản tên trạm tự động xuống dòng linh hoạt hoặc hiển thị thu gọn (truncate) kèm Tooltip xem đầy đủ khi di chuột/chạm tay; không làm xô lệch trục thời gian lộ trình. |
| 4 | Màn hình 3 (Mua vé) | Khách chưa đăng nhập bấm mua vé nhưng bỏ trống số điện thoại | Input SĐT rung nhẹ báo lỗi: *"Vui lòng nhập số điện thoại để nhận mã tra cứu vé điện tử."* |
| 5 | Màn hình 3 (Mua vé) | Nhập số điện thoại sai định dạng (chữ cái, ít hơn 10 số, đầu số không hợp lệ) | Hiển thị thông báo ngay dưới ô nhập: *"Số điện thoại không hợp lệ. Vui lòng nhập số di động 10 chữ số (đầu số 03, 05, 07, 08, 09)."* |
| 6 | Màn hình 3 (Mua vé) | Người dùng cố tình chọn ngày kích hoạt trong quá khứ | Date picker bị khoá các ngày trước hôm nay (`minDate = new Date()`); nếu gõ tay URL sẽ bị backend từ chối `400 VALIDATION_ERROR`. |
| 7 | Màn hình 4 (Thanh toán) | Hành khách giữ màn hình thanh toán quá 15 phút không chuyển khoản | Đúng giây 00:00 của đồng hồ đếm ngược, giao diện lập tức mờ mã QR, đổi badge sang màu xám `ĐÃ HẾT HẠN THANH TOÁN`, hiển thị nút bấm *"Tạo lại mã thanh toán mới"*. Ngăn khách chuyển khoản vào đơn đã huỷ. |
| 8 | Màn hình 4 (Thanh toán) | Khách hàng chuyển khoản đúng nội dung nhưng thiếu số tiền (chuyển 5.000đ cho đơn 7.000đ) | Webhook SePay ghi nhận `AMOUNT_MISMATCH`, không đổi trạng thái đơn sang `PAID`, không sinh vé. Màn hình thanh toán tiếp tục đếm ngược và hiển thị cảnh báo: *"Số tiền chuyển khoản chưa khớp với đơn hàng. Vui lòng kiểm tra lại."* Admin có thể đối soát thủ công trong màn hình 13. |
| 9 | Màn hình 4 (Thanh toán) | Webhook SePay gọi nhiều lần cho cùng 1 đơn hàng (Idempotency) | Backend kiểm tra đơn đã `PAID` thì trả về ngay HTTP 200, không sinh vé trùng lặp. Giao diện người dùng vẫn giữ nguyên màn hình thanh toán thành công. |
| 10 | Màn hình 5 (Vé của tôi) | Khách vãng lai (Guest) xoá lịch sử trình duyệt, làm mất link xem vé | Cung cấp màn hình Tra cứu vé (`/tra-cuu-ve`): Khách chỉ cần nhập `Mã đơn hàng` và `Số điện thoại` đã dùng khi mua để lấy lại danh sách vé đầy đủ. |
| 11 | Màn hình 7 (Soát vé) | Trình duyệt chưa được người dùng cấp quyền truy cập Camera | Màn hình hiển thị thông báo hướng dẫn: *"Vui lòng cấp quyền truy cập Camera trên trình duyệt để quét mã QR, hoặc sử dụng ô nhập tay mã vé bên dưới."* |
| 12 | Màn hình 7 (Soát vé) | Nhân viên quét phải mã QR rác, không đúng định dạng JWT của Vivu | Hiển thị ngay hộp thoại cảnh báo màu đỏ: *"Mã QR không hợp lệ. Đây không phải vé xe buýt của hệ thống Vivu."* |
| 13 | Màn hình 7 (Soát vé) | Khách xuất trình vé đã sử dụng trước đó (đã check-in lúc 07:15) | Hiển thị cảnh báo đỏ rực: *"VÉ KHÔNG HỢP LỆ — Vé này đã được sử dụng vào lúc 07:15:20 bởi nhân viên kiểm soát. Vui lòng kiểm tra lại."* |
| 14 | Màn hình 7 (Soát vé) | Khách xuất trình vé đã quá hạn sử dụng (vé lượt quá 2h hoặc vé ngày hôm qua) | Cảnh báo đỏ: *"VÉ ĐÃ HẾT HẠN SỬ DỤNG — Vé hết hạn lúc [Thời gian]. Quý khách vui lòng mua vé mới."* |
| 15 | Màn hình 7 (Soát vé) | Mạng 4G trên xe bị chậm khi nhân viên bấm xác nhận soát vé | Nút bấm chuyển sang trạng thái loading spinner và bị khoá click (`pointer-events-none`), ngăn nhân viên bấm liên tiếp nhiều lần gây trùng lặp request. |
| 16 | Màn hình 10 (Quản lý tuyến) | Admin bấm xoá 1 tuyến buýt đang có hàng trăm vé tháng còn hiệu lực | Hệ thống chặn thao tác xoá cứng, trả mã lỗi HTTP 409 CONFLICT kèm modal thông báo: *"Không thể xoá tuyến này vì còn vé đang trong thời hạn hiệu lực. Quý khách chỉ có thể chuyển tuyến sang trạng thái Tạm dừng hoạt động (Vô hiệu hoá)."* |
| 17 | Màn hình 11 (Quản lý lịch) | Admin tạo lịch chạy trùng giờ xuất bến cho cùng 1 chiếc xe buýt | Form validate báo đỏ: *"Xe 29B-123.45 đã được phân bổ cho chuyến 06:00:00 của Tuyến 01. Vui lòng chọn xe khác hoặc giờ chạy khác."* |
| 18 | Màn hình 12 (Loại vé) | Admin cập nhật tăng giá vé lượt từ 7.000đ lên 8.000đ | Các đơn hàng đang `PENDING` được tạo trước thời điểm sửa giá vẫn giữ nguyên mức thanh toán snapshot là 7.000đ; giá 8.000đ chỉ áp dụng cho các đơn hàng tạo mới sau đó. |

---

## 7. KẾT LUẬN & ĐỀ XUẤT CHO CÁC AGENT TIẾP THEO

Báo cáo khảo sát này đã bóc tách toàn diện 100% yêu cầu Frontend, 14 màn hình trên 3 Cổng thông tin (Hành khách, Soát vé, Quản trị viên), luồng thanh toán VietQR đếm ngược, luồng soát vé camera/manual, 7 nguyên tắc Chống AI Slop và toàn bộ các trường hợp biên.

- **Đối với Frontend Agent**: Bám sát 14 màn hình, cấu trúc wireframe, các bảng màu độ tương phản cao của phong cách vận tải công cộng (Xanh dương/Xanh lá đô thị, không neon/glassmorphism), và cấu trúc form validation đã đặc tả.
- **Đối với Backend Agent**: Đảm bảo các API Auth, Routes, Orders, SePay Webhook, Tickets/Verify, Complaints và Admin CRUD trả về đúng schema và mã lỗi đã chuẩn hoá tại Mục 6 của tài liệu gốc.
- **Đối với QA / Testing Agent**: Dựa vào Ma trận trường hợp biên (Mục 6) và Danh mục tính năng (Mục 5) để xây dựng trọn bộ Test Cases kiểm thử tự động.
- **Đối với Documentation Agent**: Kế thừa toàn bộ nguyên tắc copywriting không dùng thuật ngữ học thuật để đưa vào bộ tài liệu bàn giao `docs/`.
