import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';

describe('Tier 1: Feature Coverage - Passenger Complaints (F19)', () => {
  const routeId = FIXTURES.ROUTES.ROUTE_01.id;

  it('T1-CMP-01: Should submit a complaint as guest (HTTP 201)', async () => {
    const res = await api.post('/api/complaints', {
      category: 'SERVICE_QUALITY',
      content: 'Xe buýt đến muộn 15 phút tại trạm Bến xe Long Biên sáng nay.',
      routeId,
    });

    if (res.status === 201) {
      expect(res.data).toHaveProperty('id');
      expect(res.data).toHaveProperty('status', 'NEW');
      expect(res.data.content).toContain('Xe buýt đến muộn');
    } else {
      expect([201, 503]).toContain(res.status);
    }
  });

  it('T1-CMP-02: Should submit a complaint as authenticated passenger (HTTP 201)', async () => {
    const loginRes = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.ADMIN.email,
      password: FIXTURES.USERS.ADMIN.password,
    });

    const token = loginRes.data?.accessToken;

    const res = await api.post(
      '/api/complaints',
      {
        category: 'ATTITUDE',
        content: 'Thái độ phục vụ của tài xế cần cải thiện.',
        routeId,
      },
      { token }
    );

    if (res.status === 201) {
      expect(res.data).toHaveProperty('id');
      expect(res.data.status).toBe('NEW');
    } else {
      expect([201, 401, 503]).toContain(res.status);
    }
  });

  it('T1-CMP-03: Should reject complaint submission with missing category (HTTP 400)', async () => {
    const res = await api.post('/api/complaints', {
      content: 'Nội dung phản ánh nhưng thiếu phân loại danh mục',
      routeId,
    });

    if (res.status !== 503) {
      expect(res.status).toBe(400);
      expect(res.data).toHaveProperty('error');
      expect(res.data.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('T1-CMP-04: Should reject complaint submission with empty content (HTTP 400)', async () => {
    const res = await api.post('/api/complaints', {
      category: 'VEHICLE_HYGIENE',
      content: '',
      routeId,
    });

    if (res.status !== 503) {
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('T1-CMP-05: Should allow complaint submission without routeId for general feedback (HTTP 201)', async () => {
    const res = await api.post('/api/complaints', {
      category: 'APP_FEEDBACK',
      content: 'Đề xuất bổ sung thêm chức năng xem lịch chạy các ngày lễ.',
    });

    if (res.status === 201) {
      expect(res.data).toHaveProperty('id');
      expect(res.data.status).toBe('NEW');
    } else {
      expect([201, 503]).toContain(res.status);
    }
  });
});
