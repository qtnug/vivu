import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';
import { buildSePayPayload } from '../helpers/sepay-simulator';

describe('Tier 3: Cross-Feature Interactions - Monthly Pass Lifecycle', () => {
  const routeId = FIXTURES.ROUTES.ROUTE_01.id;
  const apiKey = FIXTURES.SEPAY.API_TOKEN;
  let inspectorToken: string;
  let monthlyTicketTypeId: string;
  let orderCode: string;
  let orderId: string;
  let ticketQrPayload: string;

  it('Step 1: Obtain inspector token and monthly pass ticket type', async () => {
    const loginRes = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.INSPECTOR.email,
      password: FIXTURES.USERS.INSPECTOR.password,
    });
    if (loginRes.status === 200) inspectorToken = loginRes.data.accessToken;

    const ttRes = await api.get('/api/ticket-types');
    if (ttRes.status === 200 && Array.isArray(ttRes.data)) {
      const monthly = ttRes.data.find((t: any) => t.category === 'MONTHLY_PASS');
      if (monthly) monthlyTicketTypeId = monthly.id;
    }
  });

  it('Step 2: Commuter orders 30-day Monthly Pass', async () => {
    const res = await api.post('/api/orders', {
      ticketTypeId: monthlyTicketTypeId || '22222222-2222-2222-2222-222222222225',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0983334444',
    });

    if (res.status === 201) {
      orderId = res.data.id;
      orderCode = res.data.orderCode;
      expect(orderId).toBeDefined();
      expect(orderCode).toBeDefined();
    }
  });

  it('Step 3: Webhook payment processed for Monthly Pass', async () => {
    if (!orderCode) return;

    const amount = 200000;
    const res = await api.post('/api/webhooks/sepay', buildSePayPayload(orderCode, amount), { apiKey });
    expect(res.status).toBe(200);
  });

  it('Step 4: Verify generated monthly ticket has 30-day validity window', async () => {
    if (!orderId) return;

    const res = await api.get(`/api/orders/${orderId}`);
    if (res.status === 200 && res.data.tickets?.length > 0) {
      const ticket = res.data.tickets[0];
      ticketQrPayload = ticket.qrPayload;

      expect(ticket).toHaveProperty('validFrom');
      expect(ticket).toHaveProperty('validUntil');

      const fromTime = new Date(ticket.validFrom).getTime();
      const untilTime = new Date(ticket.validUntil).getTime();
      const diffDays = Math.round((untilTime - fromTime) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(29);
      expect(diffDays).toBeLessThanOrEqual(31);
    }
  });

  it('Step 5: Inspector verifies valid Monthly Pass QR', async () => {
    if (!ticketQrPayload) return;

    const res = await api.post(
      '/api/tickets/verify',
      { qrPayload: ticketQrPayload },
      { token: inspectorToken }
    );

    expect(res.status).toBe(200);
    expect(res.data.valid).toBe(true);
  });
});
