import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, signAccessToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Thiếu refreshToken' } },
        { status: 400 }
      );
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Refresh token không hợp lệ hoặc đã hết hạn' } },
        { status: 401 }
      );
    }

    const accessToken = signAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
    });

    return NextResponse.json({ accessToken });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
