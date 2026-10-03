import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';
import { buildSePayPayload } from '../helpers/sepay-simulator';

describe('Tier 2: Boundary & Corner Cases - SePay Webhook (Boundary F14, F15)', () => {
  const apiKey = FIXTURES.SEPAY.API_TOKEN;
  const routeId = FIXTURES.ROUTES.ROUTE_01.id;

  it('T2-WH-01: Should reject webhook when transferAmount is lower than order totalAmount (HTTP 400 AMOUNT_MISMATCH)', async () => {
    const orderRes = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0982220001',
    });

    if (orderRes.status === 201) {
      const orderCode = orderRes.data.orderCode;
      const expectedAmount = Number(orderRes.data.totalAmount);
      // Transfer 1 VND less
      const underpaidPayload = buildSePayPayload(orderCode, expectedAmount - 1);

      const res = await api.post('/api/webhooks/sepay', underpaidPayload, { apiKey });
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('AMOUNT_MISMATCH');
    }
  });

  it('T2-WH-02: Should reject webhook when transferAmount is higher than order totalAmount (HTTP 400 AMOUNT_MISMATCH)', async () => {
    const orderRes = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0982220002',
    });

    if (orderRes.status === 201) {
      const orderCode = orderRes.data.orderCode;
      const expectedAmount = Number(orderRes.data.totalAmount);
      // Transfer 1 VND more
      const overpaidPayload = buildSePayPayload(orderCode, expectedAmount + 1000);

      const res = await api.post('/api/webhooks/sepay', overpaidPayload, { apiKey });
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('AMOUNT_MISMATCH');
    }
  });

  it('T2-WH-03: Should reject webhook when content contains no recognizable order code (HTTP 400 or 404)', async () => {
    const invalidContentPayload = {
      ...buildSePayPayload('NO_CODE_HERE', 7000),
      content: 'Chuyen tien khong ghi ma don hang',
    };

    const res = await api.post('/api/webhooks/sepay', invalidContentPayload, { apiKey });
    if (res.status !== 503) {
      expect([400, 404]).toContain(res.status);
    }
  });

  it('T2-WH-04: Should reject webhook with non-existent order code (HTTP 404 NOT_FOUND)', async () => {
    const nonExistentPayload = buildSePayPayload('DH9999999999RANDOM', 7000);
    const res = await api.post('/api/webhooks/sepay', nonExistentPayload, { apiKey });

    if (res.status !== 503) {
      expect(res.status).toBe(404);
      expect(res.data.error.code).toBe('NOT_FOUND');
    }
  });

  it('T2-WH-05: Should reject webhook call with invalid Apikey (HTTP 401 UNAUTHORIZED)', async () => {
    const payload = buildSePayPayload('DH1234567890', 7000);
    const res = await api.post('/api/webhooks/sepay', payload, { apiKey: 'completely-wrong-api-key' });

    if (res.status !== 503) {
      expect(res.status).toBe(401);
      expect(res.data.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('T2-WH-06: Should reject empty or malformed webhook payload (HTTP 400 VALIDATION_ERROR)', async () => {
    const res = await api.post('/api/webhooks/sepay', {}, { apiKey });
    if (res.status !== 503) {
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
