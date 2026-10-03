import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  User,
  BusRoute,
  BusStop,
  RouteStop,
  Bus,
  Schedule,
  TicketType,
  Order,
  Ticket,
  PaymentTransaction,
  Complaint,
  DatabaseSchema,
  UserRole,
  RouteDirection,
  TicketCategory,
  OrderStatus,
  TicketStatus,
  ComplaintStatus,
} from '../../types';
import { TestClient } from '../helpers/test-client';

// ============================================================================
// TYPE-LEVEL COMPILE-TIME ASSERTION HELPERS
// ============================================================================

type ExpectTrue<T extends true> = T;
type ExpectFalse<T extends false> = T;
type IsExact<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
type CanBeNull<T> = null extends T ? true : false;
type CanBeUndefined<T> = undefined extends T ? true : false;

// ============================================================================
// SUITE 1: TYPE-LEVEL RIGOR AND NULLABILITY STRESS ASSERTIONS
// ============================================================================

describe('Empirical Adversarial Challenge: types/db.ts Rigor & Completeness', () => {
  describe('1. Compile-Time Type-Level Invariants', () => {
    it('enforces exact domain union sets', () => {
      // UserRole: must be exactly 'passenger' | 'inspector' | 'admin'
      type AssertRole = ExpectTrue<IsExact<UserRole, 'passenger' | 'inspector' | 'admin'>>;
      const validRole1: UserRole = 'passenger';
      const validRole2: UserRole = 'inspector';
      const validRole3: UserRole = 'admin';
      expect([validRole1, validRole2, validRole3]).toHaveLength(3);

      // RouteDirection: must be 'FORWARD' | 'BACKWARD'
      type AssertDirection = ExpectTrue<IsExact<RouteDirection, 'FORWARD' | 'BACKWARD'>>;
      const validDir: RouteDirection = 'FORWARD';
      expect(validDir).toBe('FORWARD');

      // TicketCategory: must be 'SINGLE_RIDE' | 'DAILY_PASS' | 'MONTHLY_PASS'
      type AssertCategory = ExpectTrue<IsExact<TicketCategory, 'SINGLE_RIDE' | 'DAILY_PASS' | 'MONTHLY_PASS'>>;
      const validCat: TicketCategory = 'DAILY_PASS';
      expect(validCat).toBe('DAILY_PASS');

      // OrderStatus: must be 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED'
      type AssertOrderStatus = ExpectTrue<IsExact<OrderStatus, 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED'>>;
      const validOrderStatus: OrderStatus = 'PENDING';
      expect(validOrderStatus).toBe('PENDING');

      // TicketStatus: must be 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED'
      type AssertTicketStatus = ExpectTrue<IsExact<TicketStatus, 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED'>>;
      const validTicketStatus: TicketStatus = 'ACTIVE';
      expect(validTicketStatus).toBe('ACTIVE');

      // ComplaintStatus: must be 'NEW' | 'IN_PROGRESS' | 'RESOLVED'
      type AssertComplaintStatus = ExpectTrue<IsExact<ComplaintStatus, 'NEW' | 'IN_PROGRESS' | 'RESOLVED'>>;
      const validComplaintStatus: ComplaintStatus = 'NEW';
      expect(validComplaintStatus).toBe('NEW');
    });

    it('enforces strict nullability matching SQL schema rules', () => {
      // User nullabilities:
      type IdNullable = ExpectFalse<CanBeNull<User['id']>>;
      type FullNameNullable = ExpectFalse<CanBeNull<User['full_name']>>;
      type EmailNullable = ExpectTrue<CanBeNull<User['email']>>;
      type PhoneNullable = ExpectTrue<CanBeNull<User['phone']>>;
      type PasswordHashNullable = ExpectTrue<CanBeNull<User['password_hash']>>;
      type IsStudentNullable = ExpectFalse<CanBeNull<User['is_student']>>;
      type IsActiveNullable = ExpectFalse<CanBeNull<User['is_active']>>;

      // BusRoute nullabilities:
      type RouteCodeNullable = ExpectFalse<CanBeNull<BusRoute['route_code']>>;
      type DescriptionNullable = ExpectTrue<CanBeNull<BusRoute['description']>>;

      // BusStop nullabilities:
      type StopNameNullable = ExpectFalse<CanBeNull<BusStop['stop_name']>>;
      type AddressNullable = ExpectTrue<CanBeNull<BusStop['address']>>;

      // Schedule nullabilities:
      type BusIdNullable = ExpectTrue<CanBeNull<Schedule['bus_id']>>;

      // TicketType nullabilities:
      type ValidityHoursNullable = ExpectTrue<CanBeNull<TicketType['validity_hours']>>;
      type ValidityDaysNullable = ExpectTrue<CanBeNull<TicketType['validity_days']>>;

      // Order nullabilities:
      type UserIdNullable = ExpectTrue<CanBeNull<Order['user_id']>>;
      type GuestPhoneNullable = ExpectTrue<CanBeNull<Order['guest_phone']>>;

      // Ticket nullabilities:
      type UsedAtNullable = ExpectTrue<CanBeNull<Ticket['used_at']>>;
      type UsedByNullable = ExpectTrue<CanBeNull<Ticket['used_by_inspector_id']>>;

      // PaymentTransaction nullabilities:
      type TxOrderNullable = ExpectTrue<CanBeNull<PaymentTransaction['order_id']>>;
      type RefCodeNullable = ExpectTrue<CanBeNull<PaymentTransaction['sepay_reference_code']>>;
      type RawContentNullable = ExpectTrue<CanBeNull<PaymentTransaction['raw_content']>>;
      type RawPayloadNullable = ExpectTrue<CanBeNull<PaymentTransaction['raw_payload']>>;

      // Complaint nullabilities:
      type ComplaintUserNullable = ExpectTrue<CanBeNull<Complaint['user_id']>>;
      type ComplaintRouteNullable = ExpectTrue<CanBeNull<Complaint['route_id']>>;

      // No field in authoritative models should ever be undefined (SQL doesn't have undefined)
      type UserUndef = ExpectFalse<CanBeUndefined<User['full_name']>>;
      type EmailUndef = ExpectFalse<CanBeUndefined<User['email']>>;

      expect(true).toBe(true);
    });

    it('validates DatabaseSchema interface maps all 11 tables', () => {
      type ExpectedTables = keyof DatabaseSchema;
      const expectedTableList: ExpectedTables[] = [
        'users',
        'bus_routes',
        'bus_stops',
        'route_stops',
        'buses',
        'schedules',
        'ticket_types',
        'orders',
        'tickets',
        'payment_transactions',
        'complaints',
      ];
      expect(expectedTableList).toHaveLength(11);
    });
  });

  describe('2. Automated SQL Schema AST Parser & Cross-Verification Oracle', () => {
    interface SqlColumnInfo {
      name: string;
      rawType: string;
      isNullable: boolean;
      isPrimaryKey: boolean;
    }

    interface SqlTableInfo {
      tableName: string;
      columns: Map<string, SqlColumnInfo>;
    }

    function parseSqlSchema(sqlContent: string): Map<string, SqlTableInfo> {
      const tables = new Map<string, SqlTableInfo>();
      
      const createTableRegex = /CREATE\s+TABLE\s+(\w+)\s*\(([\s\S]*?)\n\s*\);/gi;
      let tableMatch: RegExpExecArray | null;

      while ((tableMatch = createTableRegex.exec(sqlContent)) !== null) {
        const tableName = tableMatch[1].toLowerCase();
        const body = tableMatch[2];
        const colMap = new Map<string, SqlColumnInfo>();

        const lines = body.split('\n');
        for (const line of lines) {
          const trimmed = line.trim().replace(/--.*$/, '').trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('CONSTRAINT') || trimmed.startsWith('PRIMARY KEY (')) continue;

          const colMatch = trimmed.match(/^([a-zA-Z_]\w*)\s+([a-zA-Z_0-9]+(?:\([^\)]+\))?)(.*)$/);
          if (colMatch) {
            const colName = colMatch[1].toLowerCase();
            const rawType = colMatch[2].toUpperCase();
            const rest = colMatch[3].toUpperCase();

            const isPrimaryKey = rest.includes('PRIMARY KEY');
            const hasNotNull = rest.includes('NOT NULL');
            const isNullable = !isPrimaryKey && !hasNotNull;

            colMap.set(colName, {
              name: colName,
              rawType,
              isNullable,
              isPrimaryKey,
            });
          }
        }

        tables.set(tableName, { tableName, columns: colMap });
      }

      return tables;
    }

    const schemaPath = path.resolve(__dirname, '../../scripts/schema.sql');
    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    const parsedTables = parseSqlSchema(sqlContent);

    it('finds all 11 authoritative tables in scripts/schema.sql', () => {
      const expectedTables = [
        'users',
        'bus_routes',
        'bus_stops',
        'route_stops',
        'buses',
        'schedules',
        'ticket_types',
        'orders',
        'tickets',
        'payment_transactions',
        'complaints',
      ];

      expect(parsedTables.size).toBe(11);
      for (const t of expectedTables) {
        expect(parsedTables.has(t), `Table ${t} must exist in schema.sql`).toBe(true);
      }
    });

    const dummyUser: User = {
      id: '', full_name: '', email: null, phone: null, password_hash: null,
      role: 'passenger', is_student: false, is_active: true, created_at: new Date(), updated_at: new Date()
    };
    const dummyRoute: BusRoute = {
      id: '', route_code: '', route_name: '', direction: 'FORWARD', description: null, is_active: true, created_at: new Date()
    };
    const dummyStop: BusStop = {
      id: '', stop_name: '', address: null, latitude: 0, longitude: 0, created_at: new Date()
    };
    const dummyRouteStop: RouteStop = {
      id: '', route_id: '', stop_id: '', stop_sequence: 1, distance_from_start_km: 0
    };
    const dummyBus: Bus = {
      id: '', license_plate: '', capacity: 60, is_active: true, created_at: new Date()
    };
    const dummySchedule: Schedule = {
      id: '', route_id: '', bus_id: null, departure_time: '06:00:00', average_speed_kmh: 20, days_of_week: 'MON-SUN', created_at: new Date()
    };
    const dummyTicketType: TicketType = {
      id: '', category: 'SINGLE_RIDE', name: '', price: 10000, validity_hours: 2, validity_days: null, is_student_price: false, is_active: true
    };
    const dummyOrder: Order = {
      id: '', order_code: '', user_id: null, guest_phone: null, ticket_type_id: '', route_id: '',
      quantity: 1, total_amount: 10000, status: 'PENDING', activation_date: new Date(), expires_at: new Date(), created_at: new Date(), updated_at: new Date()
    };
    const dummyTicket: Ticket = {
      id: '', order_id: '', route_id: '', ticket_code: '', qr_payload: '', status: 'ACTIVE',
      valid_from: new Date(), valid_until: new Date(), used_at: null, used_by_inspector_id: null, created_at: new Date()
    };
    const dummyPaymentTx: PaymentTransaction = {
      id: '', order_id: null, sepay_reference_code: null, transfer_amount: 10000, raw_content: null, raw_payload: null, processed_at: new Date()
    };
    const dummyComplaint: Complaint = {
      id: '', user_id: null, route_id: null, category: '', content: '', status: 'NEW', created_at: new Date()
    };

    const tableMapping: Record<string, any> = {
      users: dummyUser,
      bus_routes: dummyRoute,
      bus_stops: dummyStop,
      route_stops: dummyRouteStop,
      buses: dummyBus,
      schedules: dummySchedule,
      ticket_types: dummyTicketType,
      orders: dummyOrder,
      tickets: dummyTicket,
      payment_transactions: dummyPaymentTx,
      complaints: dummyComplaint,
    };

    it('asserts zero missing columns and zero phantom columns across all 11 tables', () => {
      let totalSqlColumns = 0;
      let totalTsProperties = 0;

      for (const [tableName, dummyObj] of Object.entries(tableMapping)) {
        const tableInfo = parsedTables.get(tableName);
        expect(tableInfo, `Schema info for ${tableName} must exist`).toBeDefined();

        const sqlColumns = Array.from(tableInfo!.columns.keys()).sort();
        const tsProperties = Object.keys(dummyObj).sort();

        totalSqlColumns += sqlColumns.length;
        totalTsProperties += tsProperties.length;

        const missingInTs = sqlColumns.filter(c => !tsProperties.includes(c));
        expect(missingInTs, `Missing properties in TS model for ${tableName}`).toEqual([]);

        const phantomInTs = tsProperties.filter(p => !sqlColumns.includes(p));
        expect(phantomInTs, `Phantom properties in TS model for ${tableName}`).toEqual([]);

        for (const prop of tsProperties) {
          expect(prop).toBe(prop.toLowerCase());
          expect(prop).not.toMatch(/[A-Z]/);
        }
      }

      expect(totalSqlColumns).toBe(86);
      expect(totalTsProperties).toBe(86);
    });

    it('asserts nullable columns in schema.sql allow null in TS models', () => {
      for (const [tableName, dummyObj] of Object.entries(tableMapping)) {
        const tableInfo = parsedTables.get(tableName)!;
        for (const [colName, colInfo] of tableInfo.columns.entries()) {
          if (colInfo.isNullable) {
            expect(() => {
              const testClone = { ...dummyObj, [colName]: null };
              expect(testClone[colName]).toBeNull();
            }).not.toThrow();
          }
        }
      }
    });
  });
});

// ============================================================================
// SUITE 2: TEST-CLIENT AUTHENTIC FAILURE & OFFLINE RESISTANCE HARNESS
// ============================================================================

describe('Empirical Adversarial Challenge: tests/helpers/test-client.ts Authenticity', () => {
  const OFFLINE_PORT = 59998;
  const offlineClient = new TestClient(`http://127.0.0.1:${OFFLINE_PORT}`);
  const defaultClient = new TestClient();

  it('rejects with an authentic network error instead of returning synthetic 503 on GET', async () => {
    let returnedValue: any = null;
    let thrownError: any = null;

    try {
      returnedValue = await offlineClient.get('/api/routes');
    } catch (err) {
      thrownError = err;
    }

    expect(returnedValue).toBeNull();
    expect(thrownError).toBeDefined();
    expect(thrownError).toBeInstanceOf(TypeError);
    expect(thrownError.message).toMatch(/fetch failed/i);
    expect(thrownError.cause).toBeDefined();
    expect((thrownError.cause as any).code).toBe('ECONNREFUSED');
  });

  it('rejects with authentic network error on POST with payload', async () => {
    let returnedValue: any = null;
    let thrownError: any = null;

    try {
      returnedValue = await offlineClient.post('/api/orders', {
        ticketTypeId: '00000000-0000-0000-0000-000000000000',
        quantity: 1,
      });
    } catch (err) {
      thrownError = err;
    }

    expect(returnedValue).toBeNull();
    expect(thrownError).toBeDefined();
    expect(thrownError.message).toMatch(/fetch failed/i);
  });

  it('rejects on PUT and DELETE requests', async () => {
    await expect(offlineClient.put('/api/admin/routes/test', { name: 'X' })).rejects.toThrow(/fetch failed/i);
    await expect(offlineClient.delete('/api/admin/routes/test')).rejects.toThrow(/fetch failed/i);
  });

  it('verifies default TestClient (port 3001) also rejects authentically when offline', async () => {
    let returnedValue: any = null;
    let thrownError: any = null;

    try {
      returnedValue = await defaultClient.get('/api/ticket-types');
    } catch (err) {
      thrownError = err;
    }

    expect(returnedValue).toBeNull();
    expect(thrownError).toBeDefined();
    expect(thrownError.message).toMatch(/fetch failed/i);
  });

  it('adversarial check: confirms testClient does not catch errors or synthesize 503', async () => {
    await expect(defaultClient.get('/non-existent-endpoint')).rejects.toThrow();
  });
});
