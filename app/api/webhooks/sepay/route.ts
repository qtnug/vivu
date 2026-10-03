import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { signTicketQr } from '@/lib/auth';

const SEPAY_API_TOKEN = process.env.SEPAY_API_TOKEN || 'VIVU_SEPAY_SECRET_TOKEN_2026';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '').trim();

    // Security check: verify webhook token if provided in header
    if (token && token !== SEPAY_API_TOKEN && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'API Key của SePay không hợp lệ' } },
        { status: 401 }
      );
    }

    const payload = await req.json();
    const { transferAmount, content, referenceCode } = payload;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || !content) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu webhook thiếu số tiền hoặc nội dung chuyển khoản' } },
        { status: 400 }
      );
    }

    // Extract order code via regex: DH followed by letters/digits
    const match = content.match(/DH[A-Z0-9]+/i);
    if (!match) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy mã đơn hàng trong nội dung chuyển khoản' } },
        { status: 404 }
      );
    }

    const orderCode = match[0].toUpperCase();
    const order = store.orders.find((o) => o.order_code.toUpperCase() === orderCode);

    if (!order) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Không tìm thấy đơn hàng với mã ${orderCode}` } },
        { status: 404 }
      );
    }

    // Idempotency: if already PAID, return 200 OK immediately
    if (order.status === 'PAID') {
      return NextResponse.json({ message: 'OK', idempotent: true });
    }

    // Amount match verification
    if (Math.abs(amount - order.total_amount) > 1) {
      return NextResponse.json(
        {
          error: {
            code: 'AMOUNT_MISMATCH',
            message: `Số tiền chuyển khoản (${amount}) không khớp với đơn hàng (${order.total_amount})`,
          },
        },
        { status: 400 }
      );
    }

    // Expiry check
    if (new Date(order.expires_at).getTime() < Date.now()) {
      order.status = 'EXPIRED';
      order.updated_at = new Date().toISOString();
      return NextResponse.json(
        { error: { code: 'ORDER_EXPIRED', message: 'Đơn hàng đã hết hạn thanh toán' } },
        { status: 400 }
      );
    }

    // Mark PAID
    order.status = 'PAID';
    order.updated_at = new Date().toISOString();

    // Log payment transaction
    store.payment_transactions.push({
      id: crypto.randomUUID(),
      order_id: order.id,
      sepay_reference_code: referenceCode || `REF-${Date.now()}`,
      transfer_amount: amount,
      raw_content: content,
      raw_payload: JSON.stringify(payload),
      processed_at: new Date().toISOString(),
    });

    // Generate tickets
    let ticketType = store.ticket_types.find((tt) => tt.id === order.ticket_type_id);
    const route = store.bus_routes.find((r) => r.id === order.route_id);

    if (!ticketType) {
      try {
        const { queryOne } = await import('@/lib/db');
        const dbType = await queryOne<any>('SELECT * FROM ticket_types WHERE id = @id', { id: order.ticket_type_id });
        if (dbType) ticketType = dbType;
      } catch (_) {}
    }

    // Calculate validUntil based on ticket type
    let validHours = ticketType?.validity_hours || 2;
    if (ticketType?.category === 'MONTHLY_PASS') {
      validHours = (ticketType.validity_days || 30) * 24;
    } else if (ticketType?.category === 'DAILY_PASS') {
      validHours = 24;
    }

    const validFrom = new Date().toISOString();
    const validUntil = new Date(Date.now() + validHours * 3600 * 1000).toISOString();

    const createdTickets = [];
    for (let i = 0; i < order.quantity; i++) {
      const ticketCode = `TK-${order.order_code}-${i + 1}`;
      const qrPayload = signTicketQr({
        ticketCode,
        routeId: order.route_id,
        category: ticketType?.category || 'SINGLE_RIDE',
        validUntil,
      });

      const ticket = {
        id: crypto.randomUUID(),
        order_id: order.id,
        route_id: order.route_id,
        ticket_code: ticketCode,
        qr_payload: qrPayload,
        status: 'ACTIVE' as const,
        valid_from: validFrom,
        valid_until: validUntil,
        used_at: null,
        used_by_inspector_id: null,
        created_at: new Date().toISOString(),
        ticket_type_name: ticketType?.name,
        route_name: (order as any).route_name || route?.route_name,
        route_code: (order as any).route_code || route?.route_code,
      };

      store.tickets.push(ticket);
      createdTickets.push(ticket);
    }

    return NextResponse.json({
      message: 'OK',
      orderId: order.id,
      orderCode: order.order_code,
      status: order.status,
      ticketsGenerated: createdTickets.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
