import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { requireAdmin } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = requireAdmin(req);
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const { id } = await params;
    const route = store.bus_routes.find((r) => r.id === id);

    if (!route) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy tuyến xe buýt' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    if (body.routeName) route.route_name = body.routeName;
    if (body.direction) route.direction = body.direction;
    if (body.description !== undefined) route.description = body.description;
    if (body.enterprise !== undefined) route.enterprise = body.enterprise;
    if (body.operatingHours !== undefined) route.operating_hours = body.operatingHours;
    if (body.price !== undefined) route.price = body.price;
    if (body.interval !== undefined) route.interval = body.interval;
    if (body.isActive !== undefined) route.is_active = Boolean(body.isActive);

    return NextResponse.json(route);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = requireAdmin(req);
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const { id } = await params;
    const routeIndex = store.bus_routes.findIndex((r) => r.id === id);

    if (routeIndex === -1) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy tuyến xe buýt' } },
        { status: 404 }
      );
    }

    // Check if there are active tickets
    const activeTickets = store.tickets.filter((t) => t.route_id === id && t.status === 'ACTIVE');
    if (activeTickets.length > 0) {
      // Per spec: return 409 Conflict, require deactivation instead of hard delete
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Tuyến này đang có vé còn hiệu lực. Vui lòng vô hiệu hóa thay vì xóa cứng.',
          },
        },
        { status: 409 }
      );
    }

    store.bus_routes.splice(routeIndex, 1);
    return NextResponse.json({ message: 'Xóa tuyến xe buýt thành công' });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
