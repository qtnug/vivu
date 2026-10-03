import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { store } from '@/lib/data-store';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    if (!auth) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập để xem vé của bạn' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status')?.toUpperCase();

    // Find orders belonging to user
    const userOrders = store.orders.filter((o) => o.user_id === auth.userId);
    const orderIds = new Set(userOrders.map((o) => o.id));

    let tickets = store.tickets.filter((t) => orderIds.has(t.order_id));

    // Update status if expired
    const now = Date.now();
    tickets.forEach((t) => {
      if (t.status === 'ACTIVE' && new Date(t.valid_until).getTime() < now) {
        t.status = 'EXPIRED';
      }
    });

    if (status) {
      tickets = tickets.filter((t) => t.status === status);
    }

    // Sort active first, then recent
    tickets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(tickets);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
