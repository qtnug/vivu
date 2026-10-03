import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { generateVietQr } from '@/lib/vietqr';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const oldOrder = store.orders.find((o) => o.id === id || o.order_code === id);

    if (!oldOrder) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy đơn hàng' } },
        { status: 404 }
      );
    }

    if (oldOrder.status !== 'EXPIRED' && oldOrder.status !== 'CANCELLED') {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Chỉ có thể tạo lại mã cho đơn hàng đã hết hạn hoặc bị hủy' } },
        { status: 409 }
      );
    }

    // Recreate new order duplicating details
    const orderCode = `DH${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const newOrder = {
      id: crypto.randomUUID(),
      order_code: orderCode,
      user_id: oldOrder.user_id,
      guest_phone: oldOrder.guest_phone,
      ticket_type_id: oldOrder.ticket_type_id,
      route_id: oldOrder.route_id,
      quantity: oldOrder.quantity,
      total_amount: oldOrder.total_amount,
      status: 'PENDING' as const,
      activation_date: now.split('T')[0],
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
    };

    store.orders.push(newOrder);

    const payment = generateVietQr(newOrder.order_code, newOrder.total_amount);

    return NextResponse.json(
      {
        order: newOrder,
        payment,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
