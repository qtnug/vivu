import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';

describe('Tier 1: Feature Coverage - Authentication (F05, F06)', () => {
  const timestamp = Date.now();
  const testUser = {
    fullName: `Test User ${timestamp}`,
    email: `testuser_${timestamp}@busticket.vn`,
    phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'Password@123',
  };

  it('T1-AUTH-01: Should register a new passenger successfully (HTTP 201)', async () => {
    const res = await api.post('/api/auth/register', testUser);
    
    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('user');
    expect(res.data.user).toHaveProperty('id');
    expect(res.data.user.email).toBe(testUser.email);
    expect(res.data.user.role).toBe('passenger');
    expect(res.data.user).not.toHaveProperty('password_hash');
    expect(res.data).toHaveProperty('accessToken');
    expect(res.data).toHaveProperty('refreshToken');
  });

  it('T1-AUTH-02: Should log in as passenger with valid credentials (HTTP 200)', async () => {
    const res = await api.post('/api/auth/login', {
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('accessToken');
    expect(res.data).toHaveProperty('refreshToken');
    expect(res.data.user.email).toBe(testUser.email);
    expect(res.data.user.role).toBe('passenger');
  });

  it('T1-AUTH-03: Should log in as Inspector using seeded credentials (HTTP 200)', async () => {
    const res = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.INSPECTOR.email,
      password: FIXTURES.USERS.INSPECTOR.password,
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('accessToken');
    expect(res.data.user.role).toBe('inspector');
    expect(res.data.user).not.toHaveProperty('password_hash');
  });

  it('T1-AUTH-04: Should log in as Admin using seeded credentials (HTTP 200)', async () => {
    const res = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.ADMIN.email,
      password: FIXTURES.USERS.ADMIN.password,
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('accessToken');
    expect(res.data.user.role).toBe('admin');
    expect(res.data.user).not.toHaveProperty('password_hash');
  });

  it('T1-AUTH-05: Should refresh access token with valid refresh token (HTTP 200)', async () => {
    // Attempt login first to get a real refresh token
    const loginRes = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.ADMIN.email,
      password: FIXTURES.USERS.ADMIN.password,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.data?.refreshToken).toBeDefined();

    const refreshRes = await api.post('/api/auth/refresh', {
      refreshToken: loginRes.data.refreshToken,
    });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.data).toHaveProperty('accessToken');
  });

  it('T1-AUTH-06: Should reject login with invalid password (HTTP 401 UNAUTHORIZED)', async () => {
    const res = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.ADMIN.email,
      password: 'WrongPassword!999',
    });

    expect(res.status).toBe(401);
    expect(res.data).toHaveProperty('error');
    expect(res.data.error.code).toBe('UNAUTHORIZED');
  });
});
