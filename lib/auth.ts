/**
 * Authentication and JWT Helpers for Vivu Bus Ticketing Platform
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { store, User } from './data-store';

const JWT_SECRET = process.env.JWT_SECRET || 'vivu_access_token_secret_key_2026_very_secure';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'vivu_refresh_token_secret_key_2026_very_secure';

export interface TokenPayload {
  userId: string;
  email: string | null;
  role: 'passenger' | 'inspector' | 'admin';
  fullName: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getAuthUser(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Also check cookie for seamless web experience
    const cookieToken = req.cookies.get('vivu_token')?.value;
    if (cookieToken) {
      return verifyAccessToken(cookieToken);
    }
    return null;
  }
  const token = authHeader.substring(7);
  return verifyAccessToken(token);
}

export function signTicketQr(payload: {
  ticketCode: string;
  routeId: string;
  category: string;
  validUntil: string;
}): string {
  return jwt.sign(payload, JWT_SECRET);
}

export function verifyTicketQr(qrPayload: string): {
  ticketCode: string;
  routeId: string;
  category: string;
  validUntil: string;
} | null {
  try {
    return jwt.verify(qrPayload, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

export function requireAdmin(req: NextRequest): { errorResponse?: NextResponse; user?: TokenPayload } {
  const user = getAuthUser(req);
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập tài khoản Quản trị viên' } },
        { status: 401 }
      ),
    };
  }
  if (user.role !== 'admin') {
    return {
      errorResponse: NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập trang Quản trị (Admin)' } },
        { status: 403 }
      ),
    };
  }
  return { user };
}

export function requireInspectorOrAdmin(req: NextRequest): { errorResponse?: NextResponse; user?: TokenPayload } {
  const user = getAuthUser(req);
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Vui lòng đăng nhập tài khoản Nhân viên Soát vé hoặc Quản trị viên' } },
        { status: 401 }
      ),
    };
  }
  if (user.role !== 'inspector' && user.role !== 'admin') {
    return {
      errorResponse: NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Bạn không có quyền soát vé' } },
        { status: 403 }
      ),
    };
  }
  return { user };
}


