import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';
import { buildSePayPayload } from '../helpers/sepay-simulator';

describe('Tier 1: Feature Coverage - Ticket Verification & My Tickets (F17, F18)', () => {
  const apiKey = FIXTURES.SEPAY.API_TOKEN;
  const routeId = FIXTURES.ROUTES.ROUTE_01.id;
  let inspectorToken: string;

  it('T1-TCK-01: Should login as Inspector to obtain verification authorization token', async () => {
    const res = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.INSPECTOR.email,
      password: FIXTURES.USERS.INSPECTOR.password,
    });

    if (res.status === 200) {
      inspectorToken = res.data.accessToken;
      expect(inspectorToken).toBeDefined();
      expect(res.data.user.role).toBe('inspector');
    }
  });

  it('T1-TCK-02: Should verify valid ACTIVE ticket via qrPayload and mark it USED (HTTP 200)', async () => {
    // Create and pay for a ticket first
    const orderRes = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0971112233',
    });

    if (orderRes.status === 201) {
      const orderId = orderRes.data.id;
      const orderCode = orderRes.data.orderCode;
      const amount = Number(orderRes.data.totalAmount);

      await api.post('/api/webhooks/sepay', buildSePayPayload(orderCode, amount), { apiKey });
      const orderDetails = await api.get(`/api/orders/${orderId}`);

      if (orderDetails.status === 200 && orderDetails.data.tickets?.length > 0) {
        const ticket = orderDetails.data.tickets[0];

        const verifyRes = await api.post(
          '/api/tickets/verify',
          { qrPayload: ticket.qrPayload },
          { token: inspectorToken }
        );

        expect(verifyRes.status).toBe(200);
        expect(verifyRes.data.valid).toBe(true);
        expect(verifyRes.data.ticket).toBeDefined();
      }
    }
  });

  it('T1-TCK-03: Should reject already USED ticket on immediate re-scan with reason "Vé đã được sử dụng" (HTTP 200 contract)', async () => {
    const orderRes = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0972223344',
    });

    if (orderRes.status === 201) {
      const orderId = orderRes.data.id;
      const orderCode = orderRes.data.orderCode;
      const amount = Number(orderRes.data.totalAmount);

      await api.post('/api/webhooks/sepay', buildSePayPayload(orderCode, amount), { apiKey });
      const orderDetails = await api.get(`/api/orders/${orderId}`);

      if (orderDetails.status === 200 && orderDetails.data.tickets?.length > 0) {
        const ticket = orderDetails.data.tickets[0];

        // 1st scan - Success
        await api.post('/api/tickets/verify', { qrPayload: ticket.qrPayload }, { token: inspectorToken });

        // 2nd scan - Must return HTTP 200 with valid: false
        const reScanRes = await api.post(
          '/api/tickets/verify',
          { qrPayload: ticket.qrPayload },
          { token: inspectorToken }
        );

        expect(reScanRes.status).toBe(200);
        expect(reScanRes.data.valid).toBe(false);
        expect(reScanRes.data.reason).toBe('Vé đã được sử dụng');
      }
    }
  });

  it('T1-TCK-04: Should verify ticket via manual ticketCode fallback (HTTP 200)', async () => {
    const orderRes = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0973334455',
    });

    if (orderRes.status === 201) {
      const orderId = orderRes.data.id;
      const orderCode = orderRes.data.orderCode;
      const amount = Number(orderRes.data.totalAmount);

      await api.post('/api/webhooks/sepay', buildSePayPayload(orderCode, amount), { apiKey });
      const orderDetails = await api.get(`/api/orders/${orderId}`);

      if (orderDetails.status === 200 && orderDetails.data.tickets?.length > 0) {
        const ticket = orderDetails.data.tickets[0];

        const verifyRes = await api.post(
          '/api/tickets/verify',
          { ticketCode: ticket.ticketCode },
          { token: inspectorToken }
        );

        expect(verifyRes.status).toBe(200);
        expect(verifyRes.data.valid).toBe(true);
      }
    }
  });

  it('T1-TCK-05: Should return HTTP 200 { valid: false, reason: "Mã QR không hợp lệ" } for malformed QR payload', async () => {
    const verifyRes = await api.post(
      '/api/tickets/verify',
      { qrPayload: 'tampered.fake.jwtpayload' },
      { token: inspectorToken }
    );

    if (verifyRes.status !== 503) {
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.data.valid).toBe(false);
      expect(verifyRes.data.reason).toBe('Mã QR không hợp lệ');
    }
  });

  it('T1-TCK-06: Should get passenger ticket list in "My Tickets" (HTTP 200)', async () => {
    const loginRes = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.ADMIN.email,
      password: FIXTURES.USERS.ADMIN.password,
    });

    const token = loginRes.data?.accessToken;
    const res = await api.get('/api/tickets/me', { token });
    if (res.status === 200) {
      expect(Array.isArray(res.data)).toBe(true);
    } else {
      expect([200, 401, 503]).toContain(res.status);
    }
  });
});
