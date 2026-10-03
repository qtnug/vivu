import { api } from './test-client';
import { FIXTURES } from './fixtures';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'passenger' | 'inspector' | 'admin';
  };
}

export async function loginAs(role: 'admin' | 'inspector' | 'passenger'): Promise<AuthTokens | null> {
  let credentials = FIXTURES.USERS.PASSENGER;
  if (role === 'admin') credentials = FIXTURES.USERS.ADMIN as any;
  if (role === 'inspector') credentials = FIXTURES.USERS.INSPECTOR as any;

  const res = await api.post('/api/auth/login', {
    email: credentials.email,
    password: credentials.password,
  });

  if (res.ok && res.data?.accessToken) {
    return {
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      user: res.data.user,
    };
  }

  return null;
}

/**
 * Creates a deterministic payload-based mock token when running offline or isolating tests.
 */
export function createMockToken(payload: { id: string; email: string; role: string; fullName: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const signature = 'mock-signature-for-unit-tests';
  return `${header}.${claims}.${signature}`;
}
