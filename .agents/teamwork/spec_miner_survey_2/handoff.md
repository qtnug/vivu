# BÁO CÁO BÀN GIAO KHẢO SÁT ĐẶC TẢ GIAO DIỆN & UI/UX (HANDOFF REPORT)

**Tác giả**: Spec Miner Survey 2 (`teamwork_preview_spec_miner`)  
**Thư mục làm việc**: `d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_2`  
**Ngày báo cáo**: 2026-10-02  
**Loại bàn giao**: Hard Handoff (Hoàn tất 100% nhiệm vụ khảo sát đặc tả Frontend, Portals, Wireframes & Anti-AI-Slop)

---

## 1. OBSERVATION (Quan sát trực tiếp)

1. **Tài liệu đặc tả có thẩm quyền cao nhất**:
   - Tệp `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` (643 dòng, 38.194 bytes).
   - Tệp `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (68 dòng, 6.262 bytes).
2. **Quan sát chi tiết về các cổng thông tin và màn hình** (Trích dẫn trực tiếp từ `thiet-ke-he-thong-xe-buyt.md`, Mục 8, Dòng 612-633):
   > "## 8. Danh sách màn hình chính (wireframe mô tả)  
   > **Hành khách:**  
   > 1. Trang chủ — tìm tuyến theo điểm đi/đến  
   > 2. Chi tiết tuyến — bản đồ + danh sách trạm + khung giờ  
   > 3. Chọn vé — loại vé, số lượng, ngày kích hoạt  
   > 4. Thanh toán — QR VietQR + đếm ngược  
   > 5. Vé của tôi — danh sách vé (đang dùng / đã dùng / hết hạn)  
   > 6. Gửi phản ánh  
   > **Nhân viên soát vé:**  
   > 7. Màn hình quét QR (full-screen camera, kết quả lớn, rõ ràng)  
   > 8. Lịch sử soát vé trong ca  
   > **Admin:**  
   > 9. Dashboard tổng quan  
   > 10. Quản lý tuyến/trạm  
   > 11. Quản lý xe & lịch chạy  
   > 12. Quản lý loại vé  
   > 13. Quản lý đơn hàng  
   > 14. Quản lý phản ánh"
3. **Quan sát về các nguyên tắc Chống AI Slop** (Mục 7, Dòng 568-609):
   - Quy định rõ ràng 7 nguyên tắc bắt buộc:
     * 7.1: Không lộ yêu cầu đề bài hoặc thuật ngữ nội bộ lên giao diện (dòng 572-576).
     * 7.2: Không khoe công nghệ/API trên giao diện người dùng (dòng 577-581).
     * 7.3: Không biến chức năng cơ bản thành "tính năng nổi bật" (dòng 582-585).
     * 7.4: Không lạm dụng pill badge, tag trang trí, icon sparkle ✨ (dòng 586-590).
     * 7.5: Tránh mô-típ thiết kế AI điển hình: cấm neon dark, aurora gradient, glassmorphism, 3D floating clay; ưu tiên độ tương phản cao ngoài trời, typography cho người già (dòng 591-596).
     * 7.6: Không dùng buzzword marketing hoặc testimonial giả (dòng 597-601).
     * 7.7: Thiết kế cho tình huống thực tế, không chỉ happy path (empty states, truncate text, order timeout in-place, slow network loading, mobile touch target ≥ 44-48px) (dòng 602-609).
4. **Quan sát về mô hình dữ liệu và nghiệp vụ hỗ trợ UI**:
   - `orders`: có trường `activation_date`, `expires_at` (15 phút), trạng thái `PENDING`, `PAID`, `CANCELLED`, `EXPIRED`.
   - `tickets`: chứa `qr_payload` (JWT đã ký), `ticket_code`, `status` (`ACTIVE`, `USED`, `EXPIRED`, `CANCELLED`), `used_at`, `used_by_inspector_id`.
   - `ticket_types`: 3 nhóm `SINGLE_RIDE` (validity_hours: 2h), `DAILY_PASS` (validity_hours: 24h), `MONTHLY_PASS` (validity_days: 30 ngày); cờ ưu đãi `is_student_price`.
   - `complaints`: có các trạng thái `NEW`, `IN_PROGRESS`, `RESOLVED`.
   - `route_stops`: có `stop_sequence` và `distance_from_start_km` với ràng buộc `uq_route_sequence`.
5. **Quan sát trạng thái mã nguồn hiện tại trong workspace**:
   - Lệnh `list_dir d:/DangQuangTung/Vivu` cho thấy thư mục hiện chỉ chứa tài liệu `.agents` và `thiet-ke-he-thong-xe-buyt.md`, chưa có source code triển khai.

---

## 2. LOGIC CHAIN (Chuỗi lập luận và suy diễn)

1. **Từ Quan sát 1 & 2**: Hệ thống yêu cầu 3 Cổng thông tin (Passenger, Inspector, Admin) với đúng 14 màn hình độc lập. Mỗi màn hình tương ứng với một URL route rõ ràng trong kiến trúc Next.js App Router/Pages Router (`/`, `/routes/[id]`, `/booking`, `/payment/[id]`, `/tickets`, `/feedback`, `/inspector/scan`, `/inspector/history`, `/admin/dashboard`, `/admin/routes`, `/admin/buses`, `/admin/ticket-types`, `/admin/orders`, `/admin/complaints`).
2. **Từ Quan sát 2 & 4**: Luồng mua vé và thanh toán (Màn hình 3 và 4) liên kết chặt chẽ với SePay VietQR. Do không có chọn ghế, luồng checkout phải cực kỳ ngắn gọn (chọn loại vé -> số lượng -> ngày đi -> SĐT nhận vé nếu là khách vãng lai -> thanh toán). Mã VietQR phải được render động kèm đếm ngược 15 phút và lazy-expiry trên cả client lẫn server.
3. **Từ Quan sát 2 & 4**: Cổng Inspector (Màn hình 7 và 8) cần thiết kế Mobile-first tuyệt đối (viewport 360-430px). Nửa dưới màn hình khi quét phải đổi màu kích thước lớn (Xanh lục khi `valid: true`, Đỏ rực khi `valid: false` kèm nguyên nhân cụ thể). Nhân viên soát vé cần thao tác 1 chạm để xác nhận trừ vé `USED`.
4. **Từ Quan sát 3**: Mục 7 "Chống AI Slop" là điều kiện tiên quyết về chất lượng nghiệm thu của hệ thống Vivu. Nếu frontend xuất hiện các câu chữ sáo rỗng, badge vô nghĩa, hoặc hiệu ứng neon/glassmorphism mờ mắt, dự án sẽ vi phạm tiêu chuẩn nghiệm thu R5 trong `ORIGINAL_REQUEST.md`. Do đó, bảng quy chuẩn thiết kế (Transit-first palette, typography chuẩn AA, động từ hành động ngắn gọn, xử lý chu đáo trạng thái rỗng và mạng chập chờn) đã được tổng hợp chi tiết trong `analysis.md` để Frontend Agent tuân thủ 100%.
5. **Từ Quan sát 4 & 5**: Vì chưa có source code, tài liệu khảo sát `analysis.md` đóng vai trò là "Khuôn mẫu thiết kế giao diện và đặc tả tương tác" chuẩn xác để các agent tiếp theo (Frontend, Backend, QA Testing, Documentation) có thể thi công song song mà không bị xung đột về giao diện, route, payload, hay thông báo lỗi.

---

## 3. CAVEATS (Lưu ý & Giả định)

1. **Nhà cung cấp bản đồ Goong Map**: Tài liệu đặc tả nêu Goong Map SDK (`v1/direction`, `v1/geocode`, `v1/place`). Nếu trong môi trường phát triển chưa có Goong API Key hợp lệ, frontend có thể tích hợp fallback hiển thị bản đồ maptiler/leaflet hoặc hiển thị sơ đồ timeline trạm dừng (Route Stops Timeline) mà không làm gián đoạn trải nghiệm người dùng.
2. **Quyền truy cập Camera trên trình duyệt**: Việc quét camera QR trên Web yêu cầu ngữ cảnh bảo mật (`https://` hoặc `http://localhost`). Trong môi trường test hoặc thiết bị không có camera, màn hình Màn hình 7 đã được đặc tả sẵn ô nhập tay mã vé (`ticketCode`) dự phòng.
3. **Không có hệ thống thanh toán qua cổng thẻ/ví**: Toàn bộ hệ thống thanh toán chỉ hỗ trợ VietQR qua SePay và tài khoản ngân hàng duy nhất.

---

## 4. CONCLUSION (Kết luận)

1. Đã hoàn thành bóc tách chi tiết toàn bộ 14 màn hình trên 3 Cổng thông tin (Hành khách, Soát vé, Admin) với đầy đủ bố cục wireframe ASCII, dữ liệu hiển thị, quy tắc validation và các tương tác cốt lõi.
2. Đã hệ thống hoá 7 nguyên tắc Chống AI Slop từ Mục 7 thành bộ quy chuẩn giao diện công cộng thực tế (bảng màu, typography, từ vựng cấm/khuyến khích, xử lý lỗi tại chỗ).
3. Đã xây dựng Danh mục tính năng (34 tính năng) và Ma trận trường hợp biên (18 edge cases) chi tiết làm cơ sở vững chắc cho Frontend Agent phát triển và QA Agent kiểm thử.
4. Toàn bộ báo cáo phân tích chi tiết đã được ghi đầy đủ tại `d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_2/analysis.md`.

---

## 5. VERIFICATION METHOD (Phương pháp kiểm chứng độc lập)

Để kiểm chứng tính xác thực và đầy đủ của báo cáo bàn giao này:
1. **Kiểm tra tệp phân tích**:
   - Mở và đối chiếu tệp `d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_2/analysis.md`.
   - Xác nhận có đủ 14 màn hình, 7 nguyên tắc chống AI Slop, 6 luồng tương tác chuyên sâu, bảng Features Discovered (34 mục) và Edge Cases (18 mục).
2. **Đối chiếu chéo với đặc tả gốc**:
   - So khớp danh sách 14 màn hình với Mục 8 của `thiet-ke-he-thong-xe-buyt.md` (dòng 612-633).
   - So khớp 7 nguyên tắc với Mục 7 của `thiet-ke-he-thong-xe-buyt.md` (dòng 568-609).
   - So khớp schema bảng dữ liệu và endpoint API với Mục 5 và Mục 6 của `thiet-ke-he-thong-xe-buyt.md`.
3. **Điều kiện vô hiệu hoá kết luận (Invalidation Conditions)**:
   - Nếu phát hiện bất kỳ màn hình nào trong số 14 màn hình bị bỏ sót hoặc thiếu luồng xác thực/validation.
   - Nếu có vi phạm bất kỳ nguyên tắc nào trong 7 nguyên tắc Chống AI Slop.
