import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authCheck = requireAdmin(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;
  return NextResponse.json(store.buses);
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdmin(req);
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const body = await req.json();
    const { licensePlate, capacity } = body;

    if (!licensePlate || !capacity) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Biển số xe và sức chứa là bắt buộc' } },
        { status: 400 }
      );
    }

    const existing = store.buses.find((b) => b.license_plate === licensePlate);
    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Biển số xe đã tồn tại' } },
        { status: 409 }
      );
    }

    const newBus = {
      id: crypto.randomUUID(),
      license_plate: licensePlate,
      capacity: parseInt(capacity, 10),
      is_active: true,
      created_at: new Date().toISOString(),
    };

    store.buses.push(newBus);
    return NextResponse.json(newBus, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
