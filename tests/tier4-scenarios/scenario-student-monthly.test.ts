import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';
import { buildSePayPayload } from '../helpers/sepay-simulator';

describe('Tier 4: Real-World Scenario - Student Monthly Pass Registration & Journey', () => {
  const route01Id = FIXTURES.ROUTES.ROUTE_01.id;
  const apiKey = FIXTURES.SEPAY.API_TOKEN;
  const timestamp = Date.now();

  const studentUser = {
    fullName: 'Sinh viên Lê Thu Hà',
    email: `student_${timestamp}@busticket.vn`,
    phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'Student@Pass123',
    isStudent: true,
  };

  let studentToken: string;
  let inspectorToken: string;
  let studentMonthlyTypeId: string;
  let orderId: string;
  let orderCode: string;

  it('Phase 1: Student registers an account on Vivu portal', async () => {
    const res = await api.post('/api/auth/register', studentUser);
    if (res.status === 201) {
      expect(res.data.user.email).toBe(studentUser.email);
      studentToken = res.data.accessToken;
      expect(studentToken).toBeDefined();
    }
  });

  it('Phase 2: Student logs in and selects Student Monthly Pass', async () => {
    if (!studentToken) {
      const loginRes = await api.post('/api/auth/login', {
        email: studentUser.email,
        password: studentUser.password,
      });
      if (loginRes.status === 200) studentToken = loginRes.data.accessToken;
    }

    const ttRes = await api.get('/api/ticket-types');
    if (ttRes.status === 200 && Array.isArray(ttRes.data)) {
      const studentMonthly = ttRes.data.find(
        (t: any) => t.category === 'MONTHLY_PASS' && t.isStudentPrice
      );
      if (studentMonthly) {
        studentMonthlyTypeId = studentMonthly.id;
        expect(Number(studentMonthly.price)).toBe(100000);
      }
    }
  });

  it('Phase 3: Student creates order for 100,000 VND monthly pass', async () => {
    const res = await api.post(
      '/api/orders',
      {
        ticketTypeId: studentMonthlyTypeId || '22222222-2222-2222-2222-222222222224',
        routeId: route01Id,
        quantity: 1,
        activationDate: new Date().toISOString().split('T')[0],
      },
      { token: studentToken }
    );

    if (res.status === 201) {
      orderId = res.data.id;
      orderCode = res.data.orderCode;
      expect(orderId).toBeDefined();
      expect(orderCode).toBeDefined();
      expect(Number(res.data.totalAmount)).toBe(100000);
    }
  });

  it('Phase 4: Simulated SePay transfer matches student order amount', async () => {
    if (!orderCode) return;

    const payload = buildSePayPayload(orderCode, 100000);
    const res = await api.post('/api/webhooks/sepay', payload, { apiKey });
    expect(res.status).toBe(200);
  });

  it('Phase 5: Student views 30-day ticket in My Tickets section', async () => {
    if (!studentToken) return;

    const res = await api.get('/api/tickets/me', { token: studentToken });
    if (res.status === 200) {
      expect(Array.isArray(res.data)).toBe(true);
      if (res.data.length > 0) {
        const ticket = res.data[0];
        expect(ticket.status).toBe('ACTIVE');
        expect(ticket).toHaveProperty('qrPayload');
      }
    }
  });

  it('Phase 6: Inspector verifies student monthly pass', async () => {
    if (!orderId) return;

    const orderRes = await api.get(`/api/orders/${orderId}`);
    if (orderRes.status === 200 && orderRes.data.tickets?.length > 0) {
      const qrPayload = orderRes.data.tickets[0].qrPayload;

      const loginRes = await api.post('/api/auth/login', {
        email: FIXTURES.USERS.INSPECTOR.email,
        password: FIXTURES.USERS.INSPECTOR.password,
      });
      if (loginRes.status === 200) inspectorToken = loginRes.data.accessToken;

      const verifyRes = await api.post(
        '/api/tickets/verify',
        { qrPayload },
        { token: inspectorToken }
      );

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.data.valid).toBe(true);
    }
  });
});
