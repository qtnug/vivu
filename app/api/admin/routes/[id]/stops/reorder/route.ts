import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { stopIds } = body; // Array of stopId in new sequence

    if (!Array.isArray(stopIds) || stopIds.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'stopIds phải là mảng id trạm dừng' } },
        { status: 400 }
      );
    }

    // Filter out existing stops for this route and re-apply
    store.route_stops = store.route_stops.filter((rs) => rs.route_id !== id);

    stopIds.forEach((stopId: string, index: number) => {
      store.route_stops.push({
        id: crypto.randomUUID(),
        route_id: id,
        stop_id: stopId,
        stop_sequence: index + 1,
        distance_from_start_km: index * 2.5,
      });
    });

    return NextResponse.json({
      message: 'Sắp xếp lại thứ tự trạm thành công',
      routeId: id,
      stopsCount: stopIds.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
