import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { generateVietQr } from '@/lib/vietqr';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = store.orders.find((o) => o.id === id || o.order_code === id);

    if (!order) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy đơn hàng' } },
        { status: 404 }
      );
    }

    // Lazy expiration check
    if (order.status === 'PENDING' && new Date(order.expires_at).getTime() < Date.now()) {
      order.status = 'EXPIRED';
      order.updated_at = new Date().toISOString();
    }

    let ticketType = store.ticket_types.find((tt) => tt.id === order.ticket_type_id);
    let route = store.bus_routes.find((r) => r.id === order.route_id || r.route_code === order.route_id || (r as any).routeCode === order.route_id);
    const tickets = store.tickets.filter((t) => t.order_id === order.id);

    const payment = generateVietQr(order.order_code, order.total_amount);

    return NextResponse.json({
      id: order.id,
      orderCode: order.order_code,
      status: order.status,
      totalAmount: order.total_amount,
      quantity: order.quantity,
      activationDate: order.activation_date,
      expiresAt: order.expires_at,
      ticketTypeName: ticketType?.name || '',
      routeName: route?.route_name || '',
      routeCode: route?.route_code || '',
      tickets,
      payment,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
