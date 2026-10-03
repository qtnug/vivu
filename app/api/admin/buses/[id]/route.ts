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
    const bus = store.buses.find((b) => b.id === id);

    if (!bus) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy xe' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    if (body.licensePlate) bus.license_plate = body.licensePlate;
    if (body.capacity) bus.capacity = parseInt(body.capacity, 10);
    if (body.isActive !== undefined) bus.is_active = Boolean(body.isActive);

    return NextResponse.json(bus);
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
    const index = store.buses.findIndex((b) => b.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy xe' } },
        { status: 404 }
      );
    }

    store.buses.splice(index, 1);
    return NextResponse.json({ message: 'Xóa xe thành công' });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
