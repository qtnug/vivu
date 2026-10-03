import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthUser(req);
    const body = await req.json();
    const { category, content, routeId } = body;

    if (!category || !content) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Vui lòng nhập loại phản ánh và nội dung' } },
        { status: 400 }
      );
    }

    const complaint = {
      id: crypto.randomUUID(),
      user_id: auth ? auth.userId : null,
      route_id: routeId || null,
      category,
      content,
      status: 'NEW' as const,
      created_at: new Date().toISOString(),
    };

    store.complaints.push(complaint);

    return NextResponse.json(
      { message: 'Gửi phản ánh thành công. Cảm ơn ý kiến đóng góp của bạn!', complaint },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
