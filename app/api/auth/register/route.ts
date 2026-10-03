import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { hashPassword, signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, phone, password } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Họ tên, email và mật khẩu không được để trống' } },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Mật khẩu phải có tối thiểu 8 ký tự' } },
        { status: 400 }
      );
    }

    // Check conflict
    const existingEmail = store.users.find((u) => u.email === email);
    if (existingEmail) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Email này đã được sử dụng' } },
        { status: 409 }
      );
    }

    if (phone) {
      const existingPhone = store.users.find((u) => u.phone === phone);
      if (existingPhone) {
        return NextResponse.json(
          { error: { code: 'CONFLICT', message: 'Số điện thoại này đã được sử dụng' } },
          { status: 409 }
        );
      }
    }

    const password_hash = await hashPassword(password);
    const newUser = {
      id: crypto.randomUUID(),
      full_name: fullName,
      email,
      phone: phone || null,
      password_hash,
      role: 'passenger' as const,
      is_student: false,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    store.users.push(newUser);

    const payload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.full_name,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const { password_hash: _, ...safeUser } = newUser;

    const res = NextResponse.json(
      {
        user: safeUser,
        accessToken,
        refreshToken,
      },
      { status: 201 }
    );

    res.cookies.set('vivu_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
