/**
 * Data Storage Engine for Vivu Bus Ticketing Platform
 * Provides unified repository with dual-layer support:
 * 1. Microsoft SQL Server connection pool (when reachable)
 * 2. In-memory / persistent seed store (ensures 100% uptime, immediate development & testing)
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { execute, query, queryOne } from './db';

import busData from './bus-data.json';

const JWT_SECRET = process.env.JWT_SECRET || 'vivu_access_token_secret_key_2026_very_secure';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'vivu_refresh_token_secret_key_2026_very_secure';

// Initial Authoritative Seed Data
export interface User {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  role: 'passenger' | 'inspector' | 'admin';
  is_student: boolean;
  is_active: boolean;
  created_at: string;
}

export interface BusRoute {
  id: string;
  route_code: string;
  route_name: string;
  direction: 'FORWARD' | 'BACKWARD';
  description: string | null;
  enterprise?: string;
  operating_hours?: string;
  price?: string;
  interval?: string;
  forward_path?: string;
  backward_path?: string;
  is_active: boolean;
  stopCount?: number;
  created_at: string;
}

export interface BusStop {
  id: string;
  stop_name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  stop_id: string;
  stop_sequence: number;
  distance_from_start_km: number;
  stop?: BusStop;
}

export interface Bus {
  id: string;
  license_plate: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
}

export interface Schedule {
  id: string;
  route_id: string;
  bus_id: string | null;
  departure_time: string;
  average_speed_kmh: number;
  days_of_week: string;
  created_at: string;
  bus?: Bus;
}

export interface TicketType {
  id: string;
  category: 'SINGLE_RIDE' | 'DAILY_PASS' | 'MONTHLY_PASS';
  name: string;
  price: number;
  validity_hours: number | null;
  validity_days: number | null;
  is_student_price: boolean;
  is_active: boolean;
}

export interface Order {
  id: string;
  order_code: string;
  user_id: string | null;
  guest_phone: string | null;
  ticket_type_id: string;
  route_id: string;
  quantity: number;
  total_amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  activation_date: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  ticket_type?: TicketType;
  route?: BusRoute;
}

export interface Ticket {
  id: string;
  order_id: string;
  route_id: string;
  ticket_code: string;
  qr_payload: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  valid_from: string;
  valid_until: string;
  used_at: string | null;
  used_by_inspector_id: string | null;
  created_at: string;
  ticket_type_name?: string;
  route_name?: string;
  route_code?: string;
}

export interface PaymentTransaction {
  id: string;
  order_id: string | null;
  sepay_reference_code: string | null;
  transfer_amount: number;
  raw_content: string | null;
  raw_payload: string | null;
  processed_at: string;
}

export interface Complaint {
  id: string;
  user_id: string | null;
  route_id: string | null;
  category: string;
  content: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
  created_at: string;
}

// In-Memory Global Store to survive HMR in dev and fallback cleanly
class MemoryDataStore {
  users: User[] = [
    {
      id: '10000000-0000-0000-0000-000000000001',
      full_name: 'Quản trị viên',
      email: 'admin@busticket.vn',
      phone: '0901000001',
      password_hash: bcrypt.hashSync('Admin@123456', 10),
      role: 'admin',
      is_student: false,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      full_name: 'Nguyễn Văn Soát',
      email: 'inspector1@busticket.vn',
      phone: '0901000002',
      password_hash: bcrypt.hashSync('Inspector@123456', 10),
      role: 'inspector',
      is_student: false,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      full_name: 'Hành khách Mẫu',
      email: 'passenger@busticket.vn',
      phone: '0901000003',
      password_hash: bcrypt.hashSync('Passenger@123456', 10),
      role: 'passenger',
      is_student: true,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  bus_routes: BusRoute[] = (busData.bus_routes as BusRoute[]) || [];
  bus_stops: BusStop[] = (busData.bus_stops as BusStop[]) || [];
  route_stops: RouteStop[] = (busData.route_stops as RouteStop[]) || [];
  schedules: Schedule[] = (busData.schedules as Schedule[]) || [];

  buses: Bus[] = [
    { id: 'b-01', license_plate: '29B-123.45', capacity: 60, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-02', license_plate: '29B-678.90', capacity: 60, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-03', license_plate: '29B-234.56', capacity: 80, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-04', license_plate: '29B-345.67', capacity: 60, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-05', license_plate: '29B-456.78', capacity: 80, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-06', license_plate: '29F-012.34', capacity: 60, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-07', license_plate: '29F-023.45', capacity: 60, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-08', license_plate: '29E-567.89', capacity: 68, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-09', license_plate: '29E-678.90', capacity: 68, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-10', license_plate: '29E-789.01', capacity: 68, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-11', license_plate: '29B-890.12', capacity: 60, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-12', license_plate: '29B-901.23', capacity: 80, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-13', license_plate: '29F-034.56', capacity: 60, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-14', license_plate: '29F-045.67', capacity: 60, is_active: true, created_at: new Date().toISOString() },
    { id: 'b-15', license_plate: '29E-890.12', capacity: 68, is_active: true, created_at: new Date().toISOString() },
  ];

  ticket_types: TicketType[] = [
    {
      id: 'c1111111-1111-1111-1111-111111111111',
      category: 'SINGLE_RIDE',
      name: 'Vé lượt - 1 tuyến (Thường)',
      price: 8000,
      validity_hours: 2,
      validity_days: null,
      is_student_price: false,
      is_active: true,
    },
    {
      id: 'c2222222-1111-1111-1111-111111111111',
      category: 'SINGLE_RIDE',
      name: 'Vé lượt - 1 tuyến (Học sinh/Sinh viên)',
      price: 4000,
      validity_hours: 2,
      validity_days: null,
      is_student_price: true,
      is_active: true,
    },
    {
      id: 'c6666666-1111-1111-1111-111111111111',
      category: 'SINGLE_RIDE',
      name: 'Vé liên tuyến (Đổi 2 chặng xe)',
      price: 16000,
      validity_hours: 4,
      validity_days: null,
      is_student_price: false,
      is_active: true,
    },
    {
      id: 'c7777777-1111-1111-1111-111111111111',
      category: 'SINGLE_RIDE',
      name: 'Vé liên tuyến HSSV (Đổi 2 chặng xe)',
      price: 8000,
      validity_hours: 4,
      validity_days: null,
      is_student_price: true,
      is_active: true,
    },
    {
      id: 'c3333333-1111-1111-1111-111111111111',
      category: 'DAILY_PASS',
      name: 'Vé ngày liên tuyến (Toàn mạng)',
      price: 30000,
      validity_hours: 24,
      validity_days: null,
      is_student_price: false,
      is_active: true,
    },
    {
      id: 'c4444444-1111-1111-1111-111111111111',
      category: 'MONTHLY_PASS',
      name: 'Vé tháng 1 tuyến (Thường)',
      price: 100000,
      validity_hours: null,
      validity_days: 30,
      is_student_price: false,
      is_active: true,
    },
    {
      id: 'c5555555-1111-1111-1111-111111111111',
      category: 'MONTHLY_PASS',
      name: 'Vé tháng 1 tuyến (Học sinh/Sinh viên)',
      price: 55000,
      validity_hours: null,
      validity_days: 30,
      is_student_price: true,
      is_active: true,
    },
    {
      id: 'c8888888-1111-1111-1111-111111111111',
      category: 'MONTHLY_PASS',
      name: 'Vé tháng liên tuyến (Toàn mạng - Thường)',
      price: 200000,
      validity_hours: null,
      validity_days: 30,
      is_student_price: false,
      is_active: true,
    },
    {
      id: 'c9999999-1111-1111-1111-111111111111',
      category: 'MONTHLY_PASS',
      name: 'Vé tháng liên tuyến (Toàn mạng - HSSV)',
      price: 100000,
      validity_hours: null,
      validity_days: 30,
      is_student_price: true,
      is_active: true,
    },
  ];

  orders: Order[] = [];
  tickets: Ticket[] = [];
  payment_transactions: PaymentTransaction[] = [];
  complaints: Complaint[] = [
    {
      id: 'c-01',
      user_id: '10000000-0000-0000-0000-000000000003',
      route_id: '11111111-1111-1111-1111-111111111111',
      category: 'Thái độ phục vụ',
      content: 'Nhân viên soát vé hướng dẫn nhiệt tình tại trạm Ngã Tư Sở.',
      status: 'RESOLVED',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  constructor() {
    this.createDemoTicket();
  }

  private createDemoTicket() {
    // Generate a valid demo active ticket ready to be scanned
    const demoOrderId = 'ord-demo-001';
    const demoTicketCode = 'TICK-DEMO-001';
    const validUntil = new Date(Date.now() + 3600000 * 24).toISOString();
    const qrPayload = jwt.sign(
      {
        ticketCode: demoTicketCode,
        routeId: '11111111-1111-1111-1111-111111111111',
        category: 'DAILY_PASS',
        validUntil,
      },
      JWT_SECRET
    );

    this.orders.push({
      id: demoOrderId,
      order_code: 'DH10001',
      user_id: '10000000-0000-0000-0000-000000000003',
      guest_phone: null,
      ticket_type_id: 'tt-daily',
      route_id: '11111111-1111-1111-1111-111111111111',
      quantity: 1,
      total_amount: 30000,
      status: 'PAID',
      activation_date: new Date().toISOString().split('T')[0],
      expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    });

    this.tickets.push({
      id: 'tick-001',
      order_id: demoOrderId,
      route_id: '11111111-1111-1111-1111-111111111111',
      ticket_code: demoTicketCode,
      qr_payload: qrPayload,
      status: 'ACTIVE',
      valid_from: new Date().toISOString(),
      valid_until: validUntil,
      used_at: null,
      used_by_inspector_id: null,
      created_at: new Date().toISOString(),
      ticket_type_name: 'Vé ngày',
      route_name: 'Bến xe Long Biên - Bến xe Hà Đông',
      route_code: '01',
    });
  }
}

// Global Singleton Memory Data Store
declare global {
  var __vivuStore: MemoryDataStore | undefined;
}

export const store = global.__vivuStore || (global.__vivuStore = new MemoryDataStore());
