import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stop = store.bus_stops.find((s) => s.id === id);

    if (!stop) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy trạm dừng' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    if (body.stopName) stop.stop_name = body.stopName;
    if (body.address !== undefined) stop.address = body.address;
    if (body.latitude !== undefined) stop.latitude = parseFloat(body.latitude);
    if (body.longitude !== undefined) stop.longitude = parseFloat(body.longitude);

    return NextResponse.json(stop);
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
    const { id } = await params;
    const index = store.bus_stops.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy trạm dừng' } },
        { status: 404 }
      );
    }

    store.bus_stops.splice(index, 1);
    store.route_stops = store.route_stops.filter((rs) => rs.stop_id !== id);

    return NextResponse.json({ message: 'Xóa trạm dừng thành công' });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
