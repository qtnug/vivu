import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { comparePassword, signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, phone, password } = body;

    if ((!email && !phone) || !password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Vui lòng cung cấp email/số điện thoại và mật khẩu' } },
        { status: 400 }
      );
    }

    const user = store.users.find(
      (u) => (email && u.email?.toLowerCase() === email.toLowerCase()) || (phone && u.phone === phone)
    );

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Tài khoản hoặc mật khẩu không chính xác' } },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Tài khoản đã bị vô hiệu hóa hoặc khóa' } },
        { status: 403 }
      );
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Tài khoản hoặc mật khẩu không chính xác' } },
        { status: 401 }
      );
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const { password_hash: _, ...safeUser } = user;

    const res = NextResponse.json({
      user: safeUser,
      accessToken,
      refreshToken,
    });

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
