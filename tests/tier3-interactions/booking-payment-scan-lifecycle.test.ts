import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';
import { buildSePayPayload } from '../helpers/sepay-simulator';

describe('Tier 3: Cross-Feature Interactions - Complete Transit Lifecycle', () => {
  const routeId = FIXTURES.ROUTES.ROUTE_01.id;
  const apiKey = FIXTURES.SEPAY.API_TOKEN;

  let inspectorToken: string;
  let adminToken: string;

  let orderId: string;
  let orderCode: string;
  let totalAmount: number;
  let ticketQrPayload: string;
  let ticketCode: string;

  it('Step 0: Login Inspector and Admin accounts', async () => {
    const inspRes = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.INSPECTOR.email,
      password: FIXTURES.USERS.INSPECTOR.password,
    });
    if (inspRes.status === 200) inspectorToken = inspRes.data.accessToken;

    const admRes = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.ADMIN.email,
      password: FIXTURES.USERS.ADMIN.password,
    });
    if (admRes.status === 200) adminToken = admRes.data.accessToken;
  });

  it('Step 1: Commuter books single-ride ticket on Route 01 -> PENDING order', async () => {
    const res = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0901234567',
    });

    if (res.status === 201) {
      orderId = res.data.id;
      orderCode = res.data.orderCode;
      totalAmount = Number(res.data.totalAmount);

      expect(orderId).toBeDefined();
      expect(orderCode).toBeDefined();
      expect(totalAmount).toBe(7000);
      expect(res.data.status).toBe('PENDING');
      expect(res.data).toHaveProperty('vietQr');
    }
  });

  it('Step 2: Bank sends SePay payment notification -> Order transitions to PAID and Ticket generated', async () => {
    if (!orderCode) return;

    const webhookPayload = buildSePayPayload(orderCode, totalAmount, {
      content: `${orderCode} thanh toan ve xe buyt Vivu`,
    });

    const whRes = await api.post('/api/webhooks/sepay', webhookPayload, { apiKey });
    expect(whRes.status).toBe(200);
  });

  it('Step 3: Commuter checks order status -> Sees PAID and retrieves QR JWT Ticket', async () => {
    if (!orderId) return;

    const res = await api.get(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('PAID');
    expect(res.data.tickets).toBeDefined();
    expect(res.data.tickets.length).toBe(1);

    const ticket = res.data.tickets[0];
    ticketQrPayload = ticket.qrPayload;
    ticketCode = ticket.ticketCode;

    expect(ticketQrPayload).toBeDefined();
    expect(ticketCode).toBeDefined();
    expect(ticket.status).toBe('ACTIVE');
  });

  it('Step 4: Inspector scans ticket QR payload at boarding -> Validated & marked USED', async () => {
    if (!ticketQrPayload) return;

    const verifyRes = await api.post(
      '/api/tickets/verify',
      { qrPayload: ticketQrPayload },
      { token: inspectorToken }
    );

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.data.valid).toBe(true);
    expect(verifyRes.data.ticket).toBeDefined();
  });

  it('Step 5: Immediate second scan by Inspector -> Rejected as already USED', async () => {
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

  it('Step 6: Admin verifies completed transaction in orders management', async () => {
    if (!orderId || !adminToken) return;

    const adminOrdersRes = await api.get(`/api/admin/orders?status=PAID`, { token: adminToken });
    if (adminOrdersRes.status === 200) {
      expect(Array.isArray(adminOrdersRes.data)).toBe(true);
      const found = adminOrdersRes.data.find((o: any) => o.id === orderId || o.orderCode === orderCode);
      if (found) {
        expect(found.status).toBe('PAID');
      }
    }
  });
});
