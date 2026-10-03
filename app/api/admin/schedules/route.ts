import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authCheck = requireAdmin(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const result = store.schedules.map((s) => {
    const route = store.bus_routes.find((r) => r.id === s.route_id);
    const bus = s.bus_id ? store.buses.find((b) => b.id === s.bus_id) : null;
    return {
      ...s,
      routeCode: route?.route_code,
      routeName: route?.route_name,
      licensePlate: bus?.license_plate,
    };
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdmin(req);
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const body = await req.json();
    const { routeId, busId, departureTime, averageSpeedKmh, daysOfWeek } = body;

    if (!routeId || !departureTime) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Tuyến và giờ xuất bến là bắt buộc' } },
        { status: 400 }
      );
    }

    // Validate bus conflict: same bus same departure time
    if (busId) {
      const conflict = store.schedules.find(
        (s) => s.bus_id === busId && s.departure_time === departureTime
      );
      if (conflict) {
        return NextResponse.json(
          { error: { code: 'CONFLICT', message: 'Xe này đã được xếp lịch chạy vào cùng khung giờ' } },
          { status: 409 }
        );
      }
    }

    const newSchedule = {
      id: crypto.randomUUID(),
      route_id: routeId,
      bus_id: busId || null,
      departure_time: departureTime,
      average_speed_kmh: parseFloat(averageSpeedKmh) || 18.5,
      days_of_week: daysOfWeek || 'MON-SUN',
      created_at: new Date().toISOString(),
    };

    store.schedules.push(newSchedule);
    return NextResponse.json(newSchedule, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
