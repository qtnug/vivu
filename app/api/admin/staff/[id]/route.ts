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
    const staff = store.users.find((u) => u.id === id && u.role === 'inspector');

    if (!staff) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy nhân viên' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    if (body.isActive !== undefined) {
      staff.is_active = Boolean(body.isActive);
    }
    if (body.fullName) {
      staff.full_name = body.fullName;
    }

    const { password_hash: _, ...safeUser } = staff;
    return NextResponse.json(safeUser);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
