import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { stopId, stopSequence, distanceFromStartKm } = body;

    const route = store.bus_routes.find((r) => r.id === id);
    if (!route) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Tuyến không tồn tại' } },
        { status: 404 }
      );
    }

    const stop = store.bus_stops.find((s) => s.id === stopId);
    if (!stop) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trạm dừng không tồn tại' } },
        { status: 404 }
      );
    }

    const newRouteStop = {
      id: crypto.randomUUID(),
      route_id: id,
      stop_id: stopId,
      stop_sequence: parseInt(stopSequence, 10) || 1,
      distance_from_start_km: parseFloat(distanceFromStartKm) || 0,
    };

    store.route_stops.push(newRouteStop);
    return NextResponse.json(newRouteStop, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
