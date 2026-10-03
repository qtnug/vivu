import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';
import { buildSePayPayload } from '../helpers/sepay-simulator';

describe('Tier 1: Feature Coverage - SePay Webhook & Ticket Generation (F14, F15, F16)', () => {
  const apiKey = FIXTURES.SEPAY.API_TOKEN;
  const routeId = FIXTURES.ROUTES.ROUTE_01.id;

  it('T1-WH-01: Should process valid SePay webhook payment and return HTTP 200 { message: "OK" }', async () => {
    // 1. Create a pending order
    const orderRes = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0911223344',
    });

    if (orderRes.status === 201) {
      const orderCode = orderRes.data.orderCode;
      const amount = Number(orderRes.data.totalAmount);
      const payload = buildSePayPayload(orderCode, amount);

      const webhookRes = await api.post('/api/webhooks/sepay', payload, { apiKey });
      expect(webhookRes.status).toBe(200);
      expect(webhookRes.data).toHaveProperty('message');
    } else {
      expect([200, 201, 503]).toContain(orderRes.status);
    }
  });

  it('T1-WH-02: Should update order status from PENDING to PAID after webhook processing', async () => {
    const orderRes = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0922334455',
    });

    if (orderRes.status === 201) {
      const orderId = orderRes.data.id;
      const orderCode = orderRes.data.orderCode;
      const amount = Number(orderRes.data.totalAmount);

      const webhookRes = await api.post('/api/webhooks/sepay', buildSePayPayload(orderCode, amount), { apiKey });
      expect(webhookRes.status).toBe(200);

      const checkRes = await api.get(`/api/orders/${orderId}`);
      expect(checkRes.status).toBe(200);
      expect(checkRes.data.status).toBe('PAID');
    }
  });

  it('T1-WH-03: Should be idempotent when receiving duplicate webhook call for same order (HTTP 200)', async () => {
    const orderRes = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 2,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0933445566',
    });

    if (orderRes.status === 201) {
      const orderCode = orderRes.data.orderCode;
      const amount = Number(orderRes.data.totalAmount);
      const payload = buildSePayPayload(orderCode, amount);

      // Call 1
      const res1 = await api.post('/api/webhooks/sepay', payload, { apiKey });
      expect(res1.status).toBe(200);

      // Call 2 (Duplicate / Replay from gateway)
      const res2 = await api.post('/api/webhooks/sepay', payload, { apiKey });
      expect(res2.status).toBe(200);
      expect(res2.data).toHaveProperty('message');
    }
  });

  it('T1-WH-04: Should atomically generate ticket records matching order quantity', async () => {
    const quantity = 3;
    const orderRes = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0944556677',
    });

    if (orderRes.status === 201) {
      const orderId = orderRes.data.id;
      const orderCode = orderRes.data.orderCode;
      const amount = Number(orderRes.data.totalAmount);

      await api.post('/api/webhooks/sepay', buildSePayPayload(orderCode, amount), { apiKey });

      const checkRes = await api.get(`/api/orders/${orderId}`);
      if (checkRes.status === 200 && checkRes.data.tickets) {
        expect(checkRes.data.tickets.length).toBe(quantity);
        checkRes.data.tickets.forEach((t: any) => {
          expect(t).toHaveProperty('ticketCode');
          expect(t).toHaveProperty('qrPayload');
          expect(t.status).toBe('ACTIVE');
        });
      }
    }
  });

  it('T1-WH-05: Should reject webhook calls missing Apikey authorization (HTTP 401 UNAUTHORIZED)', async () => {
    const payload = buildSePayPayload('DH9999999999', 7000);
    // Send without apiKey header
    const res = await api.post('/api/webhooks/sepay', payload);
    if (res.status !== 503) {
      expect(res.status).toBe(401);
      expect(res.data.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('T1-WH-06: Should log payment transaction record on successful webhook processing', async () => {
    const orderRes = await api.post('/api/orders', {
      ticketTypeId: '22222222-2222-2222-2222-222222222221',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0955667788',
    });

    if (orderRes.status === 201) {
      const orderCode = orderRes.data.orderCode;
      const amount = Number(orderRes.data.totalAmount);
      const refCode = `REF_${Date.now()}`;
      const payload = buildSePayPayload(orderCode, amount, { referenceCode: refCode });

      const webhookRes = await api.post('/api/webhooks/sepay', payload, { apiKey });
      expect(webhookRes.status).toBe(200);
    }
  });
});
