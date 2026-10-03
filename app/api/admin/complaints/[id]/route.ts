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
    const complaint = store.complaints.find((c) => c.id === id);

    if (!complaint) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy phản ánh' } },
        { status: 404 }
      );
    }

    const body = await req.json();
    if (body.status) {
      complaint.status = body.status;
    }

    return NextResponse.json(complaint);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
