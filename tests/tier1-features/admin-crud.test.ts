import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';

describe('Tier 1: Feature Coverage - Admin CRUD APIs (F35)', () => {
  let adminToken: string;

  it('T1-ADM-01: Should login as Admin to obtain access token', async () => {
    const res = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.ADMIN.email,
      password: FIXTURES.USERS.ADMIN.password,
    });

    expect(res.status).toBe(200);
    adminToken = res.data.accessToken;
    expect(adminToken).toBeDefined();
    expect(res.data.user.role).toBe('admin');
  });

  it('T1-ADM-02: Should get Admin Dashboard analytics metrics (HTTP 200)', async () => {
    const res = await api.get('/api/admin/dashboard', { token: adminToken });
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('todayRevenue');
    expect(res.data).toHaveProperty('totalTicketsSold');
    expect(res.data).toHaveProperty('activeRoutesCount');
  });

  it('T1-ADM-03: Should create a new bus route via Admin API (HTTP 201)', async () => {
    const randCode = `T${Math.floor(10 + Math.random() * 89)}`;
    const res = await api.post(
      '/api/admin/routes',
      {
        routeCode: randCode,
        routeName: `Tuyến ${randCode} - Bến xe Mỹ Đình đến Cầu Giấy`,
        direction: 'FORWARD',
        description: 'Tuyến thử nghiệm tự động',
      },
      { token: adminToken }
    );

    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('id');
    expect(res.data.routeCode).toBe(randCode);
  });

  it('T1-ADM-04: Should create a new bus stop with coordinates (HTTP 201)', async () => {
    const stopName = `Trạm Test ${Date.now()}`;
    const res = await api.post(
      '/api/admin/stops',
      {
        stopName,
        address: '123 Đường Cầu Giấy, Hà Nội',
        latitude: 21.0333,
        longitude: 105.795,
      },
      { token: adminToken }
    );

    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('id');
    expect(res.data.stopName).toBe(stopName);
  });

  it('T1-ADM-05: Should create a new Inspector staff account (HTTP 201)', async () => {
    const staffTimestamp = Date.now();
    const res = await api.post(
      '/api/admin/staff',
      {
        fullName: `Nhân viên Soát vé ${staffTimestamp}`,
        email: `inspector_${staffTimestamp}@busticket.vn`,
        phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Inspector@123',
      },
      { token: adminToken }
    );

    expect(res.status).toBe(201);
    expect(res.data).toHaveProperty('id');
    expect(res.data.role).toBe('inspector');
  });

  it('T1-ADM-06: Should get orders list with status filter (HTTP 200)', async () => {
    const res = await api.get('/api/admin/orders?status=PENDING', { token: adminToken });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});
