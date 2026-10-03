import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { getAuthUser } from '@/lib/auth';
import { generateVietQr } from '@/lib/vietqr';
import { queryOne } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketTypeId, routeId, quantity, activationDate, guestPhone } = body;

    const auth = getAuthUser(req);
    const userId = auth ? auth.userId : null;

    if (!userId && !guestPhone) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Vui lòng cung cấp số điện thoại nhận vé nếu mua dạng khách' } },
        { status: 400 }
      );
    }

    if (!ticketTypeId || !routeId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Vui lòng chọn loại vé và tuyến xe áp dụng' } },
        { status: 400 }
      );
    }

    const qty = parseInt(quantity || '1', 10);
    if (isNaN(qty) || qty < 1) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Số lượng vé tối thiểu là 1' } },
        { status: 400 }
      );
    }

    let ticketType = store.ticket_types.find((tt) => tt.id === ticketTypeId && tt.is_active);
    let route = store.bus_routes.find((r) => (r.id === routeId || r.route_code === routeId || (r as any).routeCode === routeId) && r.is_active !== false);

    if (!ticketType || !route) {
      try {
        if (!ticketType) {
          const dbType = await queryOne<any>('SELECT * FROM ticket_types WHERE id = @id', { id: ticketTypeId });
          if (dbType) ticketType = dbType;
        }
        if (!route) {
          const dbRoute = await queryOne<any>('SELECT * FROM bus_routes WHERE id = @id OR route_code = @id', { id: routeId });
          if (dbRoute) route = dbRoute;
        }
      } catch (dbErr) {
        // Fallback to store
      }
    }

    if (!ticketType) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Loại vé không tồn tại hoặc đã ngừng áp dụng' } },
        { status: 404 }
      );
    }

    if (!route) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Tuyến xe không tồn tại hoặc đã ngừng áp dụng' } },
        { status: 404 }
      );
    }

    let transferRoute: any = null;
    if (body.transferRouteId) {
      transferRoute = store.bus_routes.find((r) => r.id === body.transferRouteId || r.route_code === body.transferRouteId);
    }

    const isTransfer = Boolean(transferRoute || body.transferInfo);
    const displayRouteCode = isTransfer && transferRoute 
      ? `${route.route_code} ➔ ${transferRoute.route_code}` 
      : route.route_code;
    const displayRouteName = isTransfer && transferRoute
      ? `Vé liên tuyến: Tuyến ${route.route_code} (${route.route_name.split('-')[0].trim()}) ➔ Tuyến ${transferRoute.route_code} (${transferRoute.route_name.split('-')[0].trim()})`
      : route.route_name;

    const totalAmount = ticketType.price * qty;
    // Format order code: DH + last 6 digits of timestamp + random 4 chars
    const orderCode = `DH${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry
    const now = new Date().toISOString();

    const newOrder = {
      id: crypto.randomUUID(),
      order_code: orderCode,
      user_id: userId,
      guest_phone: guestPhone || null,
      ticket_type_id: ticketType.id,
      route_id: route.id,
      quantity: qty,
      total_amount: totalAmount,
      status: 'PENDING' as const,
      activation_date: activationDate || now.split('T')[0],
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
      route_name: displayRouteName,
      route_code: displayRouteCode,
    };

    store.orders.push(newOrder as any);

    const vietQr = generateVietQr(orderCode, totalAmount);

    return NextResponse.json(
      {
        order: {
          id: newOrder.id,
          orderCode: newOrder.order_code,
          totalAmount: newOrder.total_amount,
          quantity: newOrder.quantity,
          status: newOrder.status,
          activationDate: newOrder.activation_date,
          expiresAt: newOrder.expires_at,
          ticketTypeName: ticketType.name,
          routeName: displayRouteName,
          routeCode: displayRouteCode,
          isTransfer,
        },
        payment: vietQr,
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
