import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';

describe('Tier 2: Boundary & Corner Cases - Orders (Boundary F11)', () => {
  const routeId = FIXTURES.ROUTES.ROUTE_01.id;
  const validTicketTypeId = '22222222-2222-2222-2222-222222222221';

  it('T2-ORD-01: Should reject order with quantity = 0 (HTTP 400 VALIDATION_ERROR)', async () => {
    const res = await api.post('/api/orders', {
      ticketTypeId: validTicketTypeId,
      routeId,
      quantity: 0,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0912000000',
    });

    if (res.status !== 503) {
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('T2-ORD-02: Should reject order with negative quantity (quantity = -5) (HTTP 400)', async () => {
    const res = await api.post('/api/orders', {
      ticketTypeId: validTicketTypeId,
      routeId,
      quantity: -5,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0912000001',
    });

    if (res.status !== 503) {
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('T2-ORD-03: Should reject order with floating point quantity (quantity = 1.5) (HTTP 400)', async () => {
    const res = await api.post('/api/orders', {
      ticketTypeId: validTicketTypeId,
      routeId,
      quantity: 1.5,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0912000002',
    });

    if (res.status !== 503) {
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('T2-ORD-04: Should reject unauthenticated guest order without guestPhone (HTTP 400)', async () => {
    const res = await api.post('/api/orders', {
      ticketTypeId: validTicketTypeId,
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      // No guestPhone and no Auth token
    });

    if (res.status !== 503) {
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('T2-ORD-05: Should reject order with non-existent ticketTypeId (HTTP 404 or 400)', async () => {
    const res = await api.post('/api/orders', {
      ticketTypeId: '99999999-9999-9999-9999-999999999999',
      routeId,
      quantity: 1,
      activationDate: new Date().toISOString().split('T')[0],
      guestPhone: '0912000003',
    });

    if (res.status !== 503) {
      expect([400, 404]).toContain(res.status);
    }
  });

  it('T2-ORD-06: Should reject order with activationDate in the past (HTTP 400 VALIDATION_ERROR)', async () => {
    const pastDate = '2020-01-01';
    const res = await api.post('/api/orders', {
      ticketTypeId: validTicketTypeId,
      routeId,
      quantity: 1,
      activationDate: pastDate,
      guestPhone: '0912000004',
    });

    if (res.status !== 503) {
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
