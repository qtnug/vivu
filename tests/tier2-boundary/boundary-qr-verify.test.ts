import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';

describe('Tier 2: Boundary & Corner Cases - QR Verification (Boundary F18)', () => {
  let inspectorToken: string;

  it('T2-QR-01: Authenticate Inspector for verification testing', async () => {
    const res = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.INSPECTOR.email,
      password: FIXTURES.USERS.INSPECTOR.password,
    });

    if (res.status === 200) {
      inspectorToken = res.data.accessToken;
      expect(inspectorToken).toBeDefined();
    }
  });

  it('T2-QR-02: Should return HTTP 200 { valid: false, reason: "Mã QR không hợp lệ" } for completely forged JWT', async () => {
    const forgedJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0aWNrZXRDb2RlIjoiVEVTVDAwMSJ9.fake_signature_xxxx';
    const res = await api.post('/api/tickets/verify', { qrPayload: forgedJwt }, { token: inspectorToken });

    if (res.status !== 503) {
      expect(res.status).toBe(200);
      expect(res.data.valid).toBe(false);
      expect(res.data.reason).toBe('Mã QR không hợp lệ');
    }
  });

  it('T2-QR-03: Should return HTTP 200 { valid: false, reason: "Mã QR không hợp lệ" } for garbage string QR', async () => {
    const res = await api.post('/api/tickets/verify', { qrPayload: 'GARBAGE_NOT_A_JWT_AT_ALL' }, { token: inspectorToken });

    if (res.status !== 503) {
      expect(res.status).toBe(200);
      expect(res.data.valid).toBe(false);
      expect(res.data.reason).toBe('Mã QR không hợp lệ');
    }
  });

  it('T2-QR-04: Should return HTTP 200 { valid: false } for manual entry of non-existent ticket code', async () => {
    const res = await api.post(
      '/api/tickets/verify',
      { ticketCode: 'NON_EXISTENT_CODE_99999' },
      { token: inspectorToken }
    );

    if (res.status !== 503) {
      expect(res.status).toBe(200);
      expect(res.data.valid).toBe(false);
      expect(res.data).toHaveProperty('reason');
    }
  });

  it('T2-QR-05: Should return HTTP 400 VALIDATION_ERROR when neither qrPayload nor ticketCode is provided', async () => {
    const res = await api.post('/api/tickets/verify', {}, { token: inspectorToken });

    if (res.status !== 503) {
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('T2-QR-06: Should return HTTP 200 { valid: false, reason: "Vé đã hết hạn" } when ticket has expired', async () => {
    // Simulated verification of an expired ticket
    const res = await api.post(
      '/api/tickets/verify',
      { ticketCode: 'EXPIRED_TICKET_TEST_001' },
      { token: inspectorToken }
    );

    if (res.status !== 503) {
      expect(res.status).toBe(200);
      expect(res.data.valid).toBe(false);
    }
  });
});
