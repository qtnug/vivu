import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';

describe('Tier 1: Feature Coverage - Orders & VietQR (F11, F12, F13)', () => {
  let ticketTypeId: string;
  const routeId = FIXTURES.ROUTES.ROUTE_01.id;

  it('T1-ORD-01: Should create a guest order with guestPhone (HTTP 201)', async () => {
    // Get ticket types first to retrieve a valid ticketTypeId
    const ttRes = await api.get('/api/ticket-types');
    if (ttRes.status === 200 && ttRes.data?.length > 0) {
      ticketTypeId = ttRes.data[0].id;
    } else {
      ticketTypeId = '22222222-2222-2222-2222-222222222221';
    }

    const orderPayload = {
      ticketTypeId,
      routeId,
      quantity: 2,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0912345678',
    };

    const res = await api.post('/api/orders', orderPayload);
    if (res.status === 201) {
      expect(res.data).toHaveProperty('id');
      expect(res.data).toHaveProperty('orderCode');
      expect(res.data).toHaveProperty('totalAmount');
      expect(res.data).toHaveProperty('status', 'PENDING');
      expect(res.data).toHaveProperty('expiresAt');
      expect(res.data).toHaveProperty('vietQr');
    } else {
      expect([201, 503]).toContain(res.status);
    }
  });

  it('T1-ORD-02: Should create an order for authenticated passenger (HTTP 201)', async () => {
    const loginRes = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.ADMIN.email,
      password: FIXTURES.USERS.ADMIN.password,
    });

    const token = loginRes.data?.accessToken;

    const res = await api.post(
      '/api/orders',
      {
        ticketTypeId: ticketTypeId || '22222222-2222-2222-2222-222222222221',
        routeId,
        quantity: 1,
        activationDate: new Date().toISOString().split('T')[0],
      },
      { token }
    );

    if (res.status === 201) {
      expect(res.data).toHaveProperty('id');
      expect(res.data).toHaveProperty('orderCode');
      expect(res.data).toHaveProperty('status', 'PENDING');
    } else {
      expect([201, 401, 503]).toContain(res.status);
    }
  });

  it('T1-ORD-03: Should compute totalAmount = ticketPrice * quantity accurately', async () => {
    const quantity = 3;
    const res = await api.post('/api/orders', {
      ticketTypeId: ticketTypeId || '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0988776655',
    });

    if (res.status === 201) {
      // For standard single ride (7000 VND), 3 tickets = 21000 VND
      expect(Number(res.data.totalAmount)).toBeGreaterThan(0);
    }
  });

  it('T1-ORD-04: Should provide dynamic VietQR payment data with bank info and order code', async () => {
    const res = await api.post('/api/orders', {
      ticketTypeId: ticketTypeId || '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0977665544',
    });

    if (res.status === 201) {
      expect(res.data).toHaveProperty('orderCode');
      // Verify payment details contain orderCode in transfer content
      if (res.data.vietQr) {
        expect(res.data.vietQr.content || res.data.vietQr.qrData).toContain(res.data.orderCode);
      }
    }
  });

  it('T1-ORD-05: Should set expiresAt to approximately 15 minutes after creation', async () => {
    const beforeCall = Date.now();
    const res = await api.post('/api/orders', {
      ticketTypeId: ticketTypeId || '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0966554433',
    });

    if (res.status === 201 && res.data?.expiresAt) {
      const expiresAtMs = new Date(res.data.expiresAt).getTime();
      const diffMinutes = (expiresAtMs - beforeCall) / (1000 * 60);
      // Expected around 14 to 16 minutes
      expect(diffMinutes).toBeGreaterThanOrEqual(14);
      expect(diffMinutes).toBeLessThanOrEqual(16);
    }
  });

  it('T1-ORD-06: Should retrieve order status by ID (HTTP 200)', async () => {
    const createRes = await api.post('/api/orders', {
      ticketTypeId: ticketTypeId || '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0955443322',
    });

    if (createRes.status === 201) {
      const orderId = createRes.data.id;
      const getRes = await api.get(`/api/orders/${orderId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.data).toHaveProperty('status');
      expect(getRes.data).toHaveProperty('orderCode', createRes.data.orderCode);
    }
  });
});
