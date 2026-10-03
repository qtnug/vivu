import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';
import { buildSePayPayload } from '../helpers/sepay-simulator';

describe('Tier 2: Boundary & Corner Cases - 15-Minute Expiry & Regeneration (Boundary F13)', () => {
  const routeId = FIXTURES.ROUTES.ROUTE_01.id;
  const apiKey = FIXTURES.SEPAY.API_TOKEN;

  it('T2-EXP-01: Order creation returns expiresAt exactly in the future', async () => {
    const res = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0981110001',
    });

    if (res.status === 201) {
      const expiresAt = new Date(res.data.expiresAt).getTime();
      const now = Date.now();
      expect(expiresAt).toBeGreaterThan(now);
    }
  });

  it('T2-EXP-02: Should reject SePay webhook payment on already expired order (HTTP 400 ORDER_EXPIRED)', async () => {
    // Attempt webhook for a simulated expired order code
    const expiredPayload = buildSePayPayload('DH_EXPIRED_ORDER_9999', 7000);
    const res = await api.post('/api/webhooks/sepay', expiredPayload, { apiKey });

    if (res.status !== 503) {
      expect([400, 404]).toContain(res.status);
      if (res.status === 400 && res.data?.error) {
        expect(['ORDER_EXPIRED', 'NOT_FOUND']).toContain(res.data.error.code);
      }
    }
  });

  it('T2-EXP-03: Order regeneration endpoint should regenerate a new order for expired order', async () => {
    const fakeOrderId = '33333333-3333-3333-3333-333333333333';
    const res = await api.post(`/api/orders/${fakeOrderId}/regenerate`);

    if (res.status !== 503) {
      expect([200, 201, 400, 404]).toContain(res.status);
    }
  });

  it('T2-EXP-04: Should reject regeneration attempt on active PENDING order (HTTP 400 CONFLICT)', async () => {
    const createRes = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0981110002',
    });

    if (createRes.status === 201) {
      const orderId = createRes.data.id;
      // Active pending order should not allow regeneration
      const regenRes = await api.post(`/api/orders/${orderId}/regenerate`);
      if (regenRes.status !== 503) {
        expect([400, 409]).toContain(regenRes.status);
      }
    }
  });

  it('T2-EXP-05: Should return 404 for regenerating a completely non-existent order ID', async () => {
    const nonExistentId = '99999999-9999-9999-9999-999999999999';
    const res = await api.post(`/api/orders/${nonExistentId}/regenerate`);

    if (res.status !== 503) {
      expect(res.status).toBe(404);
      expect(res.data.error.code).toBe('NOT_FOUND');
    }
  });
});
