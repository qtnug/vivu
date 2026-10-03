import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdmin(req);
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status')?.toUpperCase();
    const routeId = searchParams.get('routeId');

    let orders = [...store.orders];

    if (status) {
      orders = orders.filter((o) => o.status === status);
    }
    if (routeId) {
      orders = orders.filter((o) => o.route_id === routeId);
    }

    orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const enriched = orders.map((o) => {
      const ticketType = store.ticket_types.find((tt) => tt.id === o.ticket_type_id);
      const route = store.bus_routes.find((r) => r.id === o.route_id);
      const user = o.user_id ? store.users.find((u) => u.id === o.user_id) : null;
      const tickets = store.tickets.filter((t) => t.order_id === o.id);
      const transaction = store.payment_transactions.find((pt) => pt.order_id === o.id);

      return {
        ...o,
        ticketTypeName: ticketType?.name,
        routeCode: route?.route_code,
        routeName: route?.route_name,
        customerName: user ? user.full_name : `Khách (${o.guest_phone || 'N/A'})`,
        tickets,
        transaction,
      };
    });

    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
