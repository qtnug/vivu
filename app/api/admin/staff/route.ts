import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { hashPassword, requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authCheck = requireAdmin(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const staff = store.users
    .filter((u) => u.role === 'inspector')
    .map(({ password_hash, ...u }) => u);
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdmin(req);
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const body = await req.json();
    const { fullName, email, phone, password } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Họ tên, email và mật khẩu là bắt buộc' } },
        { status: 400 }
      );
    }

    const existing = store.users.find((u) => u.email === email);
    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Email này đã tồn tại' } },
        { status: 409 }
      );
    }

    const password_hash = await hashPassword(password);
    const newStaff = {
      id: crypto.randomUUID(),
      full_name: fullName,
      email,
      phone: phone || null,
      password_hash,
      role: 'inspector' as const,
      is_student: false,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    store.users.push(newStaff);

    const { password_hash: _, ...safeUser } = newStaff;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
