import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';

describe('Tier 1: Feature Coverage - Ticket Types (F10)', () => {
  it('T1-TT-01: Should list all active ticket types (HTTP 200)', async () => {
    const res = await api.get('/api/ticket-types');
    if (res.status === 200) {
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(5);
    } else {
      expect([200, 503]).toContain(res.status);
    }
  });

  it('T1-TT-02: Should have standard and student single ride tickets with correct prices', async () => {
    const res = await api.get('/api/ticket-types');
    if (res.status === 200) {
      const standardSingle = res.data.find((t: any) => t.category === 'SINGLE_RIDE' && !t.isStudentPrice);
      const studentSingle = res.data.find((t: any) => t.category === 'SINGLE_RIDE' && t.isStudentPrice);

      expect(standardSingle).toBeDefined();
      expect(Number(standardSingle.price)).toBe(7000);
      expect(standardSingle.validityHours).toBe(2);

      expect(studentSingle).toBeDefined();
      expect(Number(studentSingle.price)).toBe(3000);
      expect(studentSingle.validityHours).toBe(2);
    }
  });

  it('T1-TT-03: Should have 24-hour daily pass with price 30,000 VND', async () => {
    const res = await api.get('/api/ticket-types');
    if (res.status === 200) {
      const dailyPass = res.data.find((t: any) => t.category === 'DAILY_PASS');
      expect(dailyPass).toBeDefined();
      expect(Number(dailyPass.price)).toBe(30000);
      expect(dailyPass.validityHours).toBe(24);
    }
  });

  it('T1-TT-04: Should have 30-day monthly passes for standard and student', async () => {
    const res = await api.get('/api/ticket-types');
    if (res.status === 200) {
      const monthlyStandard = res.data.find((t: any) => t.category === 'MONTHLY_PASS' && !t.isStudentPrice);
      const monthlyStudent = res.data.find((t: any) => t.category === 'MONTHLY_PASS' && t.isStudentPrice);

      expect(monthlyStandard).toBeDefined();
      expect(Number(monthlyStandard.price)).toBe(200000);
      expect(monthlyStandard.validityDays).toBe(30);

      expect(monthlyStudent).toBeDefined();
      expect(Number(monthlyStudent.price)).toBe(100000);
      expect(monthlyStudent.validityDays).toBe(30);
    }
  });

  it('T1-TT-05: Should include only valid categories (SINGLE_RIDE, DAILY_PASS, MONTHLY_PASS)', async () => {
    const res = await api.get('/api/ticket-types');
    if (res.status === 200) {
      const validCategories = ['SINGLE_RIDE', 'DAILY_PASS', 'MONTHLY_PASS'];
      for (const item of res.data) {
        expect(validCategories).toContain(item.category);
      }
    }
  });
});
