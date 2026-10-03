# Original User Request

## Initial Request — 2026-10-02T12:22:10Z

Xây dựng hoàn chỉnh nền tảng Quản lý Xe Buýt & Bán vé Điện tử (Vivu) theo đúng file thiết kế đặc tả thiet-ke-he-thong-xe-buyt.md với 3 vai trò (Hành khách, Soát vé, Admin), cơ sở dữ liệu SQL Server, thanh toán SePay VietQR, kiểm thử toàn diện không còn lỗi và bộ báo cáo tài liệu bàn giao chuyên nghiệp.

Working directory: d:/DangQuangTung/Vivu
Integrity mode: development

Tài liệu đặc tả gốc: file:///d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md

Requested team: Một đội ngũ phát triển web đầy đủ gồm nhiều agent: tối thiểu 1 agent kiểm thử/testing review web đến khi hết lỗi, 1 agent chuyên tạo báo cáo/tài liệu, và các agent phát triển khác (Frontend, Backend, Database).

## Requirements

### R1. Passenger Portal (Cổng hành khách)
- Tra cứu tuyến xe buýt theo số hiệu, tên, điểm đi/đến; xem danh sách trạm dừng theo thứ tự và thời gian biểu (timetable).
- Mua vé (Vé lượt, Vé ngày, Vé tháng; giá thường và học sinh/sinh viên; vé không chọn chỗ); hỗ trợ cả đăng nhập và mua dạng khách (guest checkout).
- Thanh toán VietQR động với mã đơn hàng, đếm ngược thời gian hết hạn (15 phút), tự động cập nhật khi thanh toán thành công.
- Quản lý "Vé của tôi" (hiển thị vé đang hiệu lực, đã dùng, hết hạn kèm mã QR JWT); form gửi phản ánh/khiếu nại.

### R2. Inspector Portal (Cổng nhân viên soát vé)
- Giao diện tối ưu di động cho nhân viên soát vé với đăng nhập riêng.
- Quét mã QR vé qua camera hoặc nhập thủ công mã vé; giải mã JWT và gọi API xác thực vé (kiểm tra trạng thái ACTIVE, thời hạn, đánh dấu USED khi xác nhận).
- Hiển thị kết quả trực quan (Xanh: Hợp lệ / Đỏ: Không hợp lệ + lý do cụ thể); danh sách lịch sử vé đã soát trong ca.

### R3. Admin Portal (Cổng quản trị hệ thống)
- Dashboard phân tích: doanh thu theo ngày/tuần/tháng, số vé bán ra, top tuyến đông khách, biểu đồ khung giờ cao điểm.
- Quản lý tuyến và trạm (CRUD tuyến, CRUD trạm dừng, sắp xếp thứ tự trạm trên tuyến `route_stops`).
- Quản lý xe và lịch chạy (CRUD xe, phân bổ xe theo tuyến, cấu hình giờ xuất bến `schedules`).
- Quản lý loại vé & bảng giá (CRUD vé lượt, vé ngày, vé tháng, ưu đãi HSSV).
- Quản lý đơn hàng, tra cứu vé, xem log giao dịch SePay.
- Quản trị tài khoản nhân viên soát vé và xử lý phản ánh từ hành khách.

### R4. Backend REST API & Database Architecture (SQL Server)
- Kết nối và khởi tạo cơ sở dữ liệu Microsoft SQL Server (hoặc cấu hình Prisma/TypeORM/T-SQL tương thích SQL Server SQLEXPRESS cục bộ) theo đúng schema DDL trong đặc tả (`users`, `bus_routes`, `bus_stops`, `route_stops`, `buses`, `schedules`, `ticket_types`, `orders`, `tickets`, `payment_transactions`, `complaints`).
- Nạp đầy đủ Seed Data mẫu (tuyến 01 Long Biên - Hà Đông, 5 trạm dừng, xe mẫu, lịch chạy, các loại vé chuẩn).
- Triển khai toàn bộ REST API theo chuẩn mục 6: Auth (JWT), Routes & Stops, Orders, SePay Webhook (`POST /api/webhooks/sepay` xử lý idempotent, cập nhật trạng thái đơn, sinh vé QR JWT), Ticket verification, Complaints, Admin CRUD.

### R5. Quy chuẩn Thiết kế UI/UX & Copywriting (Chống "AI Slop")
- Tuân thủ tuyệt đối 7 nguyên tắc mục 7: không hiển thị thuật ngữ nội bộ/đồ án học phần; không quảng cáo công nghệ (SePay, Next.js); không badge vô nghĩa; giao diện phong cách giao thông công cộng hiện đại, chuyên nghiệp, độ tương phản cao, responsive mượt mà trên di động.

### R6. Đội ngũ Agent: Kiểm thử Toàn diện (QA Testing Agent)
- Xây dựng bộ test tự động (API test suite & end-to-end flow test) bao phủ: đăng ký/đăng nhập, mua vé, webhook SePay, soát vé hợp lệ & không hợp lệ, phân quyền Admin/Inspector/Passenger.
- Chạy kiểm thử lặp lại, phát hiện và sửa toàn bộ lỗi (bug-free) cho đến khi 100% test case pass và build dự án thành công không lỗi linter/type-check.

### R7. Đội ngũ Agent: Tài liệu & Báo cáo Bàn giao (Documentation Agent)
- Tạo tài liệu báo cáo kỹ thuật và hướng dẫn sử dụng chi tiết tại thư mục `docs/`:
  1. Báo cáo kiến trúc hệ thống & cơ sở dữ liệu (`docs/architecture_and_db.md`).
  2. Hướng dẫn cài đặt, cấu hình môi trường và chạy ứng dụng (`docs/deployment_guide.md`).
  3. Tài liệu đặc tả API và hướng dẫn tích hợp SePay Webhook (`docs/api_documentation.md`).
  4. Hướng dẫn sử dụng cho 3 vai trò: Hành khách, Soát vé, Quản trị viên (`docs/user_manual.md`).
  5. Báo cáo kết quả kiểm thử và nghiệm thu chức năng (`docs/test_report.md`).

## Acceptance Criteria

### Functional & API
- [ ] Database SQL Server được tạo thành công với đầy đủ 10 bảng và seed data chuẩn.
- [ ] Luồng mua vé và thanh toán VietQR hoạt động chính xác từ tạo đơn PENDING -> webhook thanh toán -> sinh vé ACTIVE với QR JWT.
- [ ] Luồng soát vé của Inspector xác thực đúng vé ACTIVE, chặn vé USED/EXPIRED và cập nhật sang USED thành công.
- [ ] Đầy đủ 14 màn hình hoạt động theo wireframe mô tả, đúng giao diện không có AI slop.
- [ ] Phân quyền bảo mật JWT chính xác: Passenger không vào được Admin/Inspector; Inspector chỉ vào được trang soát vé; Admin quản trị toàn diện.

### Quality & Verification
- [ ] Toàn bộ bộ test tự động chạy pass 100% không có lỗi.
- [ ] Dự án build thành công (`npm run build`) không lỗi TypeScript hay linter.
- [ ] Có đầy đủ bộ tài liệu bàn giao tại thư mục `docs/` gồm 5 tài liệu hoàn chỉnh.
