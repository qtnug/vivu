/**
 * Authoritative Fixtures from thiet-ke-he-thong-xe-buyt.md (§ 5.2 Seed Data)
 */

export const FIXTURES = {
  USERS: {
    ADMIN: {
      email: 'admin@busticket.vn',
      password: 'Admin@123456',
      role: 'admin',
      fullName: 'Quản trị viên',
    },
    INSPECTOR: {
      email: 'inspector1@busticket.vn',
      password: 'Inspector@123456',
      role: 'inspector',
      fullName: 'Nguyễn Văn Soát',
    },
    PASSENGER: {
      email: 'passenger.test@busticket.vn',
      password: 'Pass@12345',
      role: 'passenger',
      fullName: 'Trần Thị Hành Khách',
      phone: '0987654321',
    },
    GUEST: {
      phone: '0912345678',
      name: 'Nguyễn Văn Khách',
    },
  },
  ROUTES: {
    ROUTE_01: {
      id: '11111111-1111-1111-1111-111111111111',
      routeCode: '01',
      routeName: 'Bến xe Long Biên - Bến xe Hà Đông',
      direction: 'FORWARD' as const,
      description: 'Tuyến trung tâm nội thành Hà Nội',
    },
  },
  STOPS: [
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      stopName: 'Bến xe Long Biên',
      address: 'Q. Ba Đình, Hà Nội',
      latitude: 21.0423,
      longitude: 105.855,
      sequence: 1,
      distanceFromStartKm: 0,
    },
    {
      id: 'a2222222-1111-1111-1111-111111111111',
      stopName: 'Hồ Hoàn Kiếm',
      address: 'Q. Hoàn Kiếm, Hà Nội',
      latitude: 21.0285,
      longitude: 105.8542,
      sequence: 2,
      distanceFromStartKm: 2.5,
    },
    {
      id: 'a3333333-1111-1111-1111-111111111111',
      stopName: 'Ga Hà Nội',
      address: 'Q. Hoàn Kiếm, Hà Nội',
      latitude: 21.0245,
      longitude: 105.8412,
      sequence: 3,
      distanceFromStartKm: 4.8,
    },
    {
      id: 'a4444444-1111-1111-1111-111111111111',
      stopName: 'Ngã Tư Sở',
      address: 'Q. Đống Đa, Hà Nội',
      latitude: 20.9999,
      longitude: 105.8217,
      sequence: 4,
      distanceFromStartKm: 8.2,
    },
    {
      id: 'a5555555-1111-1111-1111-111111111111',
      stopName: 'Bến xe Hà Đông',
      address: 'Q. Hà Đông, Hà Nội',
      latitude: 20.9718,
      longitude: 105.7772,
      sequence: 5,
      distanceFromStartKm: 12.6,
    },
  ],
  TICKET_TYPES: {
    SINGLE_STANDARD: {
      category: 'SINGLE_RIDE',
      name: 'Vé lượt - Thường',
      price: 7000,
      validityHours: 2,
      isStudentPrice: false,
    },
    SINGLE_STUDENT: {
      category: 'SINGLE_RIDE',
      name: 'Vé lượt - Học sinh/Sinh viên',
      price: 3000,
      validityHours: 2,
      isStudentPrice: true,
    },
    DAILY_PASS: {
      category: 'DAILY_PASS',
      name: 'Vé ngày',
      price: 30000,
      validityHours: 24,
      isStudentPrice: false,
    },
    MONTHLY_STANDARD: {
      category: 'MONTHLY_PASS',
      name: 'Vé tháng - Thường',
      price: 200000,
      validityDays: 30,
      isStudentPrice: false,
    },
    MONTHLY_STUDENT: {
      category: 'MONTHLY_PASS',
      name: 'Vé tháng - Học sinh/Sinh viên',
      price: 100000,
      validityDays: 30,
      isStudentPrice: true,
    },
  },
  SEPAY: {
    API_TOKEN: process.env.SEPAY_API_TOKEN || 'test-sepay-api-key-2026',
    GATEWAY: 'Vietcombank',
    ACCOUNT_NUMBER: '0123456789',
  },
  JWT_SECRET: process.env.JWT_SECRET || 'vivu-super-secret-jwt-key-2026',
};
