import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderCode = searchParams.get('orderCode')?.trim().toUpperCase();
    const phone = searchParams.get('phone')?.trim();

    if (!orderCode && !phone) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Vui lòng cung cấp mã đơn hàng hoặc số điện thoại' } },
        { status: 400 }
      );
    }

    let orders = store.orders;
    if (orderCode) {
      orders = orders.filter((o) => o.order_code.toUpperCase() === orderCode);
    }
    if (phone) {
      orders = orders.filter((o) => o.guest_phone === phone);
    }

    if (orders.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy vé nào phù hợp với thông tin tra cứu' } },
        { status: 404 }
      );
    }

    const orderIds = new Set(orders.map((o) => o.id));
    const tickets = store.tickets.filter((t) => orderIds.has(t.order_id));

    return NextResponse.json(tickets);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
