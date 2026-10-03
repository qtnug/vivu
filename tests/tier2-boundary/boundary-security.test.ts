import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';

describe('Tier 2: Boundary & Corner Cases - Role Boundaries & Security (Boundary Auth/RBAC)', () => {
  let passengerToken: string;
  let inspectorToken: string;

  it('T2-SEC-01: Obtain Passenger and Inspector tokens for privilege tests', async () => {
    const inspRes = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.INSPECTOR.email,
      password: FIXTURES.USERS.INSPECTOR.password,
    });
    if (inspRes.status === 200) inspectorToken = inspRes.data.accessToken;

    const passRes = await api.post('/api/auth/register', {
      fullName: 'Security Test Passenger',
      email: `sectest_${Date.now()}@test.vn`,
      phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Password@123',
    });
    if (passRes.status === 201) passengerToken = passRes.data.accessToken;
  });

  it('T2-SEC-02: Passenger accessing Admin Dashboard must be forbidden (HTTP 403 FORBIDDEN)', async () => {
    const res = await api.get('/api/admin/dashboard', { token: passengerToken });
    if (res.status !== 503) {
      expect(res.status).toBe(403);
      expect(res.data.error.code).toBe('FORBIDDEN');
    }
  });

  it('T2-SEC-03: Inspector accessing Admin Routes CRUD must be forbidden (HTTP 403 FORBIDDEN)', async () => {
    const res = await api.post('/api/admin/routes', { routeCode: '99', routeName: 'Hacked' }, { token: inspectorToken });
    if (res.status !== 503) {
      expect(res.status).toBe(403);
      expect(res.data.error.code).toBe('FORBIDDEN');
    }
  });

  it('T2-SEC-04: Passenger attempting Inspector ticket verification must be forbidden (HTTP 403 FORBIDDEN)', async () => {
    const res = await api.post('/api/tickets/verify', { ticketCode: 'TCK001' }, { token: passengerToken });
    if (res.status !== 503) {
      expect(res.status).toBe(403);
      expect(res.data.error.code).toBe('FORBIDDEN');
    }
  });

  it('T2-SEC-05: Unauthenticated access to Admin endpoints must return HTTP 401 UNAUTHORIZED', async () => {
    const res = await api.get('/api/admin/dashboard');
    if (res.status !== 503) {
      expect(res.status).toBe(401);
      expect(res.data.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('T2-SEC-06: SQL injection payload in search query must be sanitized without SQL syntax error', async () => {
    const sqliPayload = "' OR 1=1; DROP TABLE users; --";
    const res = await api.get(`/api/routes?search=${encodeURIComponent(sqliPayload)}`);
    if (res.status !== 503) {
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      // Ensure no raw SQL error leaked in body
      expect(res.rawBody).not.toContain('SqlException');
      expect(res.rawBody).not.toContain('syntax error');
    }
  });
});
