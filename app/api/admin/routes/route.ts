import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authCheck = requireAdmin(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;
  return NextResponse.json(store.bus_routes);
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdmin(req);
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const body = await req.json();
    const { routeCode, routeName, direction, description, enterprise, operatingHours, price, interval } = body;

    if (!routeCode || !routeName || !direction) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Mã tuyến, tên tuyến và chiều đi/về là bắt buộc' } },
        { status: 400 }
      );
    }

    const existing = store.bus_routes.find((r) => r.route_code === routeCode);
    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: `Mã tuyến ${routeCode} đã tồn tại` } },
        { status: 409 }
      );
    }

    const newRoute = {
      id: crypto.randomUUID(),
      route_code: routeCode,
      route_name: routeName,
      direction: direction as 'FORWARD' | 'BACKWARD',
      description: description || null,
      enterprise: enterprise || 'Xí nghiệp Xe buýt Hà Nội',
      operating_hours: operatingHours || '5h00 - 21h00',
      price: price || '10.000đ/lượt',
      interval: interval || '10-15 phút/chuyến',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    store.bus_routes.push(newRoute);
    return NextResponse.json(newRoute, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
