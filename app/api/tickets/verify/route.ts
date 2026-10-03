import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { requireInspectorOrAdmin, verifyTicketQr } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireInspectorOrAdmin(req);
    if (authCheck.errorResponse) return authCheck.errorResponse;
    const inspectorId = authCheck.user!.userId;


    const body = await req.json();
    const { qrPayload, ticketCode } = body;

    if (!qrPayload && !ticketCode) {
      return NextResponse.json(
        { valid: false, reason: 'Vui lòng cung cấp mã QR hoặc mã vé' },
        { status: 200 }
      );
    }

    let searchCode = ticketCode?.trim();

    if (qrPayload) {
      const decoded = verifyTicketQr(qrPayload);
      if (!decoded || !decoded.ticketCode) {
        return NextResponse.json(
          { valid: false, reason: 'Mã QR không hợp lệ hoặc sai chữ ký bảo mật' },
          { status: 200 }
        );
      }
      searchCode = decoded.ticketCode;
    }

    const ticket = store.tickets.find((t) => t.ticket_code === searchCode);
    if (!ticket) {
      return NextResponse.json(
        { valid: false, reason: 'Mã vé không tồn tại trong hệ thống' },
        { status: 200 }
      );
    }

    // Check expiration
    if (new Date(ticket.valid_until).getTime() < Date.now() || ticket.status === 'EXPIRED') {
      ticket.status = 'EXPIRED';
      return NextResponse.json(
        { valid: false, reason: 'Vé đã hết hạn sử dụng', ticket },
        { status: 200 }
      );
    }

    // Check active
    if (ticket.status !== 'ACTIVE' && ticket.status !== 'USED') {
      return NextResponse.json(
        { valid: false, reason: 'Vé không ở trạng thái hiệu lực', ticket },
        { status: 200 }
      );
    }

    const typeName = (ticket.ticket_type_name || '').toLowerCase();
    const isMultiUse = typeName.includes('tháng') || typeName.includes('ngày') || typeName.includes('toàn mạng');
    const isTransferTicket = typeName.includes('liên tuyến');

    const scanCount = ((ticket as any).scan_count || 0) + 1;
    (ticket as any).scan_count = scanCount;

    if (isMultiUse) {
      // Daily and Monthly passes can be scanned unlimited times until expiration
      ticket.used_at = new Date().toISOString();
      ticket.used_by_inspector_id = inspectorId;
      return NextResponse.json({
        valid: true,
        message: `Soát vé thành công — Vé ${ticket.ticket_type_name} hợp lệ (Lần quét thứ ${scanCount})`,
        ticket,
      });
    }

    if (isTransferTicket) {
      // Transfer ticket allows 2 scans (for 2 buses)
      if (scanCount > 2) {
        return NextResponse.json({
          valid: false,
          reason: 'Vé liên tuyến đã được soát đủ 2 chặng xe',
          ticket,
        });
      }
      if (scanCount === 2) {
        ticket.status = 'USED';
      }
      ticket.used_at = new Date().toISOString();
      ticket.used_by_inspector_id = inspectorId;
      return NextResponse.json({
        valid: true,
        message: `Soát vé thành công — Chặng ${scanCount}/2 của vé liên tuyến hợp lệ`,
        ticket,
      });
    }

    // Single ride: Already used check
    if (ticket.status === 'USED') {
      const usedTime = ticket.used_at ? new Date(ticket.used_at).toLocaleTimeString('vi-VN') : '';
      return NextResponse.json(
        {
          valid: false,
          reason: `Vé đã được sử dụng ${usedTime ? `lúc ${usedTime}` : 'trước đó'}`,
          ticket,
        },
        { status: 200 }
      );
    }

    // Valid ticket: Update to USED
    ticket.status = 'USED';
    ticket.used_at = new Date().toISOString();
    ticket.used_by_inspector_id = inspectorId;

    return NextResponse.json({
      valid: true,
      message: 'Soát vé thành công — Vé lượt hợp lệ',
      ticket,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
