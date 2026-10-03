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
    const schedule = store.schedules.find((s) => s.id === id);

    if (!schedule) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy lịch chạy' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    if (body.busId !== undefined) schedule.bus_id = body.busId;
    if (body.departureTime) schedule.departure_time = body.departureTime;
    if (body.averageSpeedKmh) schedule.average_speed_kmh = parseFloat(body.averageSpeedKmh);
    if (body.daysOfWeek) schedule.days_of_week = body.daysOfWeek;

    return NextResponse.json(schedule);
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
    const index = store.schedules.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy lịch chạy' } },
        { status: 404 }
      );
    }

    store.schedules.splice(index, 1);
    return NextResponse.json({ message: 'Xóa lịch chạy thành công' });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
