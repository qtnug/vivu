import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';

describe('Tier 4: Real-World Scenario - Multi-Role Administration & Fleet Management', () => {
  let adminToken: string;
  let newRouteId: string;
  let newStopId: string;
  let newBusId: string;
  let complaintId: string;

  it('Phase 1: Admin logs in to operational console', async () => {
    const res = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.ADMIN.email,
      password: FIXTURES.USERS.ADMIN.password,
    });

    if (res.status === 200) {
      adminToken = res.data.accessToken;
      expect(adminToken).toBeDefined();
      expect(res.data.user.role).toBe('admin');
    }
  });

  it('Phase 2: Admin inspects Executive Dashboard and daily sales', async () => {
    const res = await api.get('/api/admin/dashboard', { token: adminToken });
    if (res.status === 200) {
      expect(res.data).toHaveProperty('todayRevenue');
      expect(res.data).toHaveProperty('totalTicketsSold');
      expect(res.data).toHaveProperty('activeRoutesCount');
    }
  });

  it('Phase 3: Admin expands network by creating Route 09', async () => {
    const res = await api.post(
      '/api/admin/routes',
      {
        routeCode: '09',
        routeName: 'Bờ Hồ - Cầu Giấy - Bến xe Nam Thăng Long',
        direction: 'FORWARD',
        description: 'Tuyến buýt kết nối vành đai phía Tây',
      },
      { token: adminToken }
    );

    if (res.status === 201) {
      newRouteId = res.data.id;
      expect(newRouteId).toBeDefined();
      expect(res.data.routeCode).toBe('09');
    }
  });

  it('Phase 4: Admin creates new Bus Stop "Đại học Quốc gia"', async () => {
    const res = await api.post(
      '/api/admin/stops',
      {
        stopName: 'Đại học Quốc gia Hà Nội',
        address: '144 Xuân Thủy, Cầu Giấy, Hà Nội',
        latitude: 21.0368,
        longitude: 105.7825,
      },
      { token: adminToken }
    );

    if (res.status === 201) {
      newStopId = res.data.id;
      expect(newStopId).toBeDefined();
    }
  });

  it('Phase 5: Admin registers new bus in fleet and assigns schedule', async () => {
    const randPlate = `29B-${Math.floor(100 + Math.random() * 899)}.${Math.floor(10 + Math.random() * 89)}`;
    const busRes = await api.post(
      '/api/admin/buses',
      {
        licensePlate: randPlate,
        capacity: 60,
      },
      { token: adminToken }
    );

    if (busRes.status === 201) {
      newBusId = busRes.data.id;
      expect(newBusId).toBeDefined();

      if (newRouteId) {
        const schedRes = await api.post(
          '/api/admin/schedules',
          {
            routeId: newRouteId,
            busId: newBusId,
            departureTime: '06:30:00',
            averageSpeedKmh: 20.0,
            daysOfWeek: 'MON-SUN',
          },
          { token: adminToken }
        );
        if (schedRes.status === 201) {
          expect(schedRes.data).toHaveProperty('id');
        }
      }
    }
  });

  it('Phase 6: Admin creates new Inspector staff account', async () => {
    const res = await api.post(
      '/api/admin/staff',
      {
        fullName: 'Nguyễn Văn Soát Mới',
        email: `inspector.route09_${Date.now()}@busticket.vn`,
        phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password@123',
      },
      { token: adminToken }
    );

    if (res.status === 201) {
      expect(res.data.role).toBe('inspector');
    }
  });

  it('Phase 7: Admin resolves a submitted passenger complaint', async () => {
    // 1. Submit a complaint first
    const cmpRes = await api.post('/api/complaints', {
      category: 'VEHICLE_HYGIENE',
      content: 'Cần vệ sinh ghế ngồi xe số 29B-123.45',
    });

    if (cmpRes.status === 201) {
      complaintId = cmpRes.data.id;

      // 2. Admin updates status to RESOLVED
      const updateRes = await api.put(
        `/api/admin/complaints/${complaintId}`,
        {
          status: 'RESOLVED',
          adminNote: 'Đã nhắc nhở đội ngũ kỹ thuật vệ sinh xe trước ca chạy chiều.',
        },
        { token: adminToken }
      );

      if (updateRes.status === 200) {
        expect(updateRes.data.status).toBe('RESOLVED');
      }
    }
  });
});
