import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authCheck = requireAdmin(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;
  return NextResponse.json(store.bus_stops);
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdmin(req);
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const body = await req.json();
    const { stopName, address, latitude, longitude } = body;

    if (!stopName || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Tên trạm và tọa độ (kinh độ, vĩ độ) là bắt buộc' } },
        { status: 400 }
      );
    }

    const newStop = {
      id: crypto.randomUUID(),
      stop_name: stopName,
      address: address || null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      created_at: new Date().toISOString(),
    };

    store.bus_stops.push(newStop);
    return NextResponse.json(newStop, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
