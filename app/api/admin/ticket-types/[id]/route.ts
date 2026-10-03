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
    const ticketType = store.ticket_types.find((tt) => tt.id === id);

    if (!ticketType) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy loại vé' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    if (body.name) ticketType.name = body.name;
    if (body.price !== undefined) ticketType.price = parseFloat(body.price);
    if (body.validityHours !== undefined) ticketType.validity_hours = body.validityHours;
    if (body.validityDays !== undefined) ticketType.validity_days = body.validityDays;
    if (body.isStudentPrice !== undefined) ticketType.is_student_price = Boolean(body.isStudentPrice);
    if (body.isActive !== undefined) ticketType.is_active = Boolean(body.isActive);

    return NextResponse.json(ticketType);
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
    const index = store.ticket_types.findIndex((tt) => tt.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy loại vé' } },
        { status: 404 }
      );
    }

    store.ticket_types.splice(index, 1);
    return NextResponse.json({ message: 'Xóa loại vé thành công' });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
