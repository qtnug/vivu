# Dispatch Assignment: Spec Miner Survey 2 (Frontend Portals, UI/UX, Anti-AI-Slop & Wireframes)

- **Identity**: teamwork_preview_spec_miner (Spec Miner Survey 2)
- **Working Directory**: d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_2
- **Authoritative Docs**:
  - `d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md` (MUST READ FIRST)
  - `d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md` (Full specification document)

## Objective
Extract, analyze, and document all Frontend, UI/UX, Portal features, and Wireframe requirements:
1. Inventory all 14 screens across the 3 portals:
   - **Passenger Portal**:
     - Route search, stop list, timetable view
     - Ticket purchase flow (single/daily/monthly, standard/student-discount, seat-free, guest vs logged-in checkout)
     - Dynamic VietQR payment modal/page with 15-minute countdown, real-time polling/SSE status update
     - "My Tickets" list & ticket detail modal with dynamic QR code (JWT payload)
     - Feedback / Complaint submission form
   - **Inspector Portal**:
     - Mobile-optimized interface with dedicated login
     - Camera QR scanner & manual ticket code input
     - Real-time verification result (Green = Valid, Red = Invalid with clear reason)
     - Ticket inspection history of current shift
   - **Admin Portal**:
     - Analytics dashboard: revenue charts (day/week/month), tickets sold, top routes, peak hours
     - Route & Bus Stop management (CRUD, reordering stops on route `route_stops`)
     - Bus & Schedule management (CRUD buses, timetables/departures)
     - Ticket Type & Pricing management
     - Order, Ticket, and SePay Transaction audit logs
     - Inspector account management & Passenger complaint resolution
2. Strictly extract and analyze Section 7 "Quy chuẩn Thiết kế UI/UX & Copywriting (Chống 'AI Slop')":
   - 7 anti-AI-slop principles: professional public transit design, high contrast, clean typography, responsive mobile UX, no academic/internal jargon, no tech advertising (no "Powered by SePay/Next.js"), no meaningless badges.

## Output
Write your comprehensive analysis to `analysis.md` and summary handoff to `handoff.md` in your working directory `d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_2/`.
Report back when finished.

## 2026-10-02T12:24:50Z
[Message] timestamp=2026-10-02T12:24:50Z sender=891098e1-52e3-4582-a42d-340f57c72e75 priority=MESSAGE_PRIORITY_HIGH content=You are Spec Miner Survey 2 (teamwork_preview_spec_miner).
Your working directory is: d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_2
Read your assignment in d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_2/DISPATCH.md
Read d:/DangQuangTung/Vivu/.agents/teamwork/ORIGINAL_REQUEST.md (MANDATORY FIRST)
Read d:/DangQuangTung/Vivu/thiet-ke-he-thong-xe-buyt.md (Authoritative full spec)

Focus: Extract complete Frontend, Portals & UI/UX requirements:
- Detailed breakdown of all 14 screens across Passenger, Inspector, and Admin portals.
- Wireframe structure, interactions, form validations, modal flows (VietQR modal, ticket QR modal, inspector scan camera/manual, dashboard charts).
- Strict extraction of Section 7 "Chống AI Slop" principles (7 rules, styling, typography, professional public transit identity).

Output: Write comprehensive findings to d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_2/analysis.md and summary handoff to d:/DangQuangTung/Vivu/.agents/teamwork/spec_miner_survey_2/handoff.md.
Send a message to parent when completed.
