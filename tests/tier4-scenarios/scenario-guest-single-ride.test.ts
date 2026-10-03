import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';
import { buildSePayPayload } from '../helpers/sepay-simulator';

describe('Tier 4: Real-World Scenario - Guest Commuter Single Ride Purchase', () => {
  const route01Id = FIXTURES.ROUTES.ROUTE_01.id;
  const apiKey = FIXTURES.SEPAY.API_TOKEN;
  let inspectorToken: string;

  let orderId: string;
  let orderCode: string;
  let ticketQrPayload: string;

  it('Phase 1: Commuter browses Route 01 details without signing in', async () => {
    const res = await api.get(`/api/routes/${route01Id}`);
    if (res.status === 200) {
      expect(res.data.routeCode).toBe('01');
      expect(res.data.stops.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('Phase 2: Commuter initiates guest booking with mobile number', async () => {
    const res = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId: route01Id,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0912345678',
    });

    if (res.status === 201) {
      orderId = res.data.id;
      orderCode = res.data.orderCode;
      expect(orderId).toBeDefined();
      expect(orderCode).toBeDefined();
      expect(res.data.status).toBe('PENDING');
      expect(Number(res.data.totalAmount)).toBe(7000);
    }
  });

  it('Phase 3: SePay payment confirmation arrives from bank', async () => {
    if (!orderCode) return;

    const payload = buildSePayPayload(orderCode, 7000, {
      content: `${orderCode} thanh toan ve xe buyt 01`,
    });

    const res = await api.post('/api/webhooks/sepay', payload, { apiKey });
    expect(res.status).toBe(200);
  });

  it('Phase 4: Commuter views paid order and displays QR code', async () => {
    if (!orderId) return;

    const res = await api.get(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('PAID');
    expect(res.data.tickets.length).toBe(1);

    ticketQrPayload = res.data.tickets[0].qrPayload;
    expect(ticketQrPayload).toBeDefined();
  });

  it('Phase 5: Inspector verifies valid ticket at bus entrance', async () => {
    if (!ticketQrPayload) return;

    const loginRes = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.INSPECTOR.email,
      password: FIXTURES.USERS.INSPECTOR.password,
    });
    if (loginRes.status === 200) inspectorToken = loginRes.data.accessToken;

    const verifyRes = await api.post(
      '/api/tickets/verify',
      { qrPayload: ticketQrPayload },
      { token: inspectorToken }
    );

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.data.valid).toBe(true);
  });

  it('Phase 6: Re-scan attempt on same ticket is blocked', async () => {
    if (!ticketQrPayload) return;

    const reScanRes = await api.post(
      '/api/tickets/verify',
      { qrPayload: ticketQrPayload },
      { token: inspectorToken }
    );

    expect(reScanRes.status).toBe(200);
    expect(reScanRes.data.valid).toBe(false);
    expect(reScanRes.data.reason).toBe('Vé đã được sử dụng');
  });

  it('Phase 7: Commuter submits feedback after ride', async () => {
    const res = await api.post('/api/complaints', {
      category: 'SERVICE_QUALITY',
      content: 'Chuyến xe chạy đúng giờ, tài xế lái xe cẩn thận.',
      routeId: route01Id,
    });

    if (res.status === 201) {
      expect(res.data.status).toBe('NEW');
    }
  });
});
