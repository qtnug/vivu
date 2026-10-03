import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { store } from '@/lib/data-store';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } },
      { status: 401 }
    );
  }

  const user = store.users.find((u) => u.id === auth.userId);
  if (!user) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Không tìm thấy người dùng' } },
      { status: 404 }
    );
  }

  const { password_hash: _, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}

export async function DELETE(req: NextRequest) {
  // Logout endpoint clearing cookie
  const res = NextResponse.json({ message: 'Đăng xuất thành công' });
  res.cookies.delete('vivu_token');
  return res;
}
