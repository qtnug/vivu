# Handoff Report — Spec Miner Survey 1 (Backend, Database & APIs)

**Agent**: `spec_miner_survey_1` (teamwork_preview_spec_miner)  
**Recipient**: `parent` (`891098e1-52e3-4582-a42d-340f57c72e75`)  
**Artifact**: `d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/analysis.md`  
**Date**: 2026-10-02

---

## 1. Observation

Direct observations from authoritative specifications:

1. **Database Schema & Cascade Constraints (`thiet-ke-he-thong-xe-buyt.md:218-450`)**:
   - Database name: `bus_ticketing_system` on Microsoft SQL Server.
   - Primary Keys: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()`.
   - Table catalog: Exactly 11 tables defined in T-SQL script: `users`, `bus_routes`, `bus_stops`, `route_stops`, `buses`, `schedules`, `ticket_types`, `orders`, `tickets`, `payment_transactions`, and `complaints`.
   - SQL Server Multiple Cascade Path restriction explicitly noted: *"route_stops.stop_id, schedules.route_id/bus_id, orders.*, tickets.route_id, payment_transactions.order_id, complaints.* dùng NO ACTION (mặc định) để tránh lỗi 'multiple cascade paths'... Chỉ route_stops.route_id và tickets.order_id dùng ON DELETE CASCADE"* (`thiet-ke-he-thong-xe-buyt.md:450`).
   - Seed data specified verbatim: Admin (`admin@busticket.vn`), Inspector (`inspector1@busticket.vn`), Route 01 (Long Biên - Hà Đông), 5 bus stops (`Bến xe Long Biên`, `Hồ Hoàn Kiếm`, `Ga Hà Nội`, `Ngã Tư Sở`, `Bến xe Hà Đông`), 2 buses (`29B-123.45`, `29B-678.90`), schedule at 06:00:00 (18.5 km/h), and 5 standard ticket types (`SINGLE_RIDE` regular 7k / student 3k; `DAILY_PASS` 30k; `MONTHLY_PASS` regular 200k / student 100k) (`thiet-ke-he-thong-xe-buyt.md:406-448`).

2. **Authentication & Authorization Architecture (`thiet-ke-he-thong-xe-buyt.md:458-476`)**:
   - Unified login endpoint `POST /api/auth/login` for all three roles (`passenger`, `inspector`, `admin`).
   - Role segregation via JWT claims: *"hệ thống dựa vào trường role trong JWT để phân quyền ở các endpoint khác, không có endpoint đăng nhập riêng cho từng vai trò"* (`thiet-ke-he-thong-xe-buyt.md:471`).
   - Token pair: Access token + refresh token (`POST /api/auth/refresh`).
   - Password hashing: `bcrypt` with compare.

3. **Orders & SePay Webhook Idempotency (`thiet-ke-he-thong-xe-buyt.md:121-133`, `507-512`)**:
   - Webhook endpoint: `POST /api/webhooks/sepay` secured with `Authorization: Apikey <SEPAY_API_TOKEN>`.
   - Strict Idempotency: *"nếu đơn đã PAID, trả về 200 ngay và dừng xử lý (đảm bảo idempotent khi SePay gọi lại webhook)"* (`thiet-ke-he-thong-xe-buyt.md:510`).
   - Amount matching: `transferAmount` must match `totalAmount`; mismatch triggers HTTP 400 and audit log.
   - 15-minute countdown and lazy expiry: `expires_at = now + 15 phút`. Expired orders transition to `EXPIRED`.
   - Post-payment ticket generation: Upon `PAID`, atomically generates `quantity` records in `tickets` with unique `ticket_code` and signed JWT QR payloads.

4. **Inspector Ticket Validation Protocol (`thiet-ke-he-thong-xe-buyt.md:521-526`)**:
   - Endpoint: `POST /api/tickets/verify` (role: Inspector).
   - Dual input support: `{ qrPayload }` (camera scanner) or `{ ticketCode }` (manual fallback).
   - Return status contract: Always returns HTTP 200 for validation outcomes:
     - Valid: `{ "valid": true, "ticket": { ... } }` and updates `status = 'USED'`, `used_at`, `used_by_inspector_id`.
     - Invalid: `{ "valid": false, "reason": "Vé đã được sử dụng" | "Vé đã hết hạn" | "Mã QR không hợp lệ" | "Mã vé không tồn tại" }`.
     - Documented justification: *"không dùng mã lỗi HTTP vì đây là kết quả nghiệp vụ bình thường, không phải lỗi hệ thống"* (`thiet-ke-he-thong-xe-buyt.md:525`).

5. **User Request Alignment (`ORIGINAL_REQUEST.md:35-39`, `58-63`)**:
   - Database must be SQL Server (or Prisma/TypeORM/T-SQL compatible with local SQL Server).
   - Seed data, SePay webhook, QR JWT generation, and inspector validation are mandatory acceptance criteria.

---

## 2. Logic Chain

1. **Database Schema Logic**:
   - `bus_ticketing_system` requires relational integrity for multi-party transit ticketing.
   - By following the exact T-SQL DDL in `thiet-ke-he-thong-xe-buyt.md:244-400`, we ensure schema consistency and prevent SQL Server `multiple cascade path` execution errors by adopting the specified `NO ACTION` foreign key constraints and delegating lifecycle checks to the application layer.

2. **Payment & Webhook Idempotency Logic**:
   - Bank webhooks from SePay can deliver duplicate HTTP POST events due to network delays or retry policies.
   - An idempotent handler must check `order.status === 'PAID'` before executing ticket generation or ledger operations. If already paid, returning HTTP 200 immediately prevents duplicate ticket generation and prevents SePay retry loops.
   - Verifying `transferAmount === totalAmount` guarantees financial accuracy, preventing underpayment fraud.

3. **QR JWT & Inspector Validation Logic**:
   - Tickets are presented offline/online via QR codes. By embedding a signed JWT containing `ticketCode`, `routeId`, and validity windows, the system ensures tamper resistance.
   - When verified, checking the database guarantees that single-use tickets cannot be scanned twice (replay attack prevention). Returning HTTP 200 with `{ valid: false, reason: "..." }` guarantees that client scanner apps do not treat business rejections as network/server crashes.

4. **Role Security Logic**:
   - Since all roles share the `/api/auth/login` endpoint, role authorization must be enforced via middleware extracting `role` from the verified JWT payload (`passenger`, `inspector`, `admin`).
   - Inspector accounts must never be publicly self-registered; they are exclusively provisioned by Admins via `POST /api/admin/staff`.

---

## 3. Caveats

1. **External Services**:
   - Goong Map API keys are required for real-time map tiles/polylines and reverse geocoding on the frontend. The backend route search algorithm (`GET /api/routes/search`) operates statically using coordinates and the Haversine formula on `bus_stops` coordinates without requiring external HTTP calls.
   - SePay credentials (`SEPAY_API_TOKEN`, bank account details) must be populated in `.env`.
2. **Local SQL Server Connection**:
   - When deploying with Prisma ORM on Windows, connection string requires `trustServerCertificate=true` if using self-signed SQLEXPRESS certificates.
3. No other caveats.

---

## 4. Conclusion

The specification mining for Backend, Database, APIs, Payment, and Security is 100% complete and documented in detail in `d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/analysis.md`.
All 11 database tables, constraints, seed data, 26 REST API features, security rules, SePay idempotent webhook mechanics, QR JWT payloads, inspector verification rules, and 20 edge cases have been extracted and mapped to authoritative specification sources.

---

## 5. Verification Method

To independently verify these findings:

1. **Inspect Artifact**:
   - Check `d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_1/analysis.md`.
2. **Cross-Reference Authoritative Spec**:
   - Compare Database DDL: `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` lines 244-448.
   - Compare API definitions: `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` lines 458-565.
   - Compare SePay Webhook logic: `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` lines 121-133 & 507-512.
   - Compare Inspector verification logic: `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` lines 521-526.
3. **Invalidation Conditions**:
   - The analysis would be invalidated if any of the 11 database tables were omitted, if the SePay webhook lacked idempotency rules, if the QR token omitted cryptographic JWT signing, or if the inspector API returned 4xx HTTP errors instead of HTTP 200 `{ valid: false, reason }`.
