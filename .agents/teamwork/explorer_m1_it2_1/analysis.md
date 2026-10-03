# Technical Analysis & Fix Strategy: Domain Types & DB Parameter Binding

**Agent**: `explorer_m1_it2_1` (teamwork_preview_explorer)  
**Milestone**: M1 Iteration 2.1  
**Target Files**: `types/db.ts` (new) and `lib/db.ts` (remediation)  
**Date**: 2026-10-02  

---

## 1. Problem Statement & Root Cause Analysis

### 1.1 Missing Domain TypeScript Definitions (`types/db.ts`)
In Milestone 1, the database schema (11 tables in Microsoft SQL Server 2025 Express) was successfully deployed and verified with 43/43 assertions in `scripts/verify-db.js`. However, no shared TypeScript definitions existed in the project.

**Consequences**:
1. Downstream tests (`tests/adversarial/db-stress.test.ts`) and test fixtures assumed camelCase column names (`createdAt`, `passwordHash`, `routeName`, `routeNumber`, `fullName`) rather than the authoritative snake_case schema columns (`created_at`, `password_hash`, `route_name`, `route_code`, `full_name`). This resulted in SQL runtime syntax errors (`Invalid column name 'createdAt'`) and failed the initial gate review.
2. Query helpers in `lib/db.ts` (`query<T = any>`, `queryOne<T = any>`) defaulted to `any`, eliminating compile-time type safety for API handlers and business logic.
3. Subsequent milestones (M2: Auth & Core APIs, M3: Passenger Portal, M4: Inspector & Admin) require strong TypeScript contracts for all 11 entities, their nullability rules, and domain status unions to prevent schema drift.

### 1.2 Flaw in Object Parameter Binding (`lib/db.ts`)
In `lib/db.ts` lines 91–114:
```typescript
function bindParameters(request: sql.Request, params?: Record<string, any>): void {
  if (!params) return;

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      request.input(key, sql.NVarChar, null);
    } else if (typeof value === 'boolean') {
      request.input(key, sql.Bit, value ? 1 : 0);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        request.input(key, sql.Int, value);
      } else {
        request.input(key, sql.Decimal(12, 4), value);
      }
    } else if (value instanceof Date) {
      request.input(key, sql.DateTime2, value);
    } else if (typeof value === 'object' && value.type && 'value' in value) {
      request.input(key, value.type, value.value);
    } else {
      request.input(key, sql.NVarChar, String(value));
    }
  }
}
```

**Flaws Identified**:
1. **Plain Object Corruption**: Any plain JavaScript object or array passed to `bindParameters` (e.g. `{ gateway: 'Vietcombank', amount: 50000 }` or `[1, 2, 3]`) drops into `String(value)`. In JavaScript:
   - `String({ a: 1 })` evaluates to `"[object Object]"`.
   - `String([1, 2])` evaluates to `"1,2"`.
   When writing to columns storing raw JSON payloads (such as `payment_transactions.raw_payload`), this silently persists corrupt strings into the database.
2. **False Positive Explicit Type Matching**: The check `typeof value === 'object' && value.type && 'value' in value` assumes that any object containing a `type` property and a `value` property is an explicit `mssql` SQL type wrapper (e.g. `{ type: sql.BigInt, value: '9876543210' }`).
   However, business payloads often contain properties named `type` and `value` (for example: `{ type: 'BANK_TRANSFER', value: 100000 }`). When such an object is passed, `request.input(key, 'BANK_TRANSFER', 100000)` executes:
   - `mssql` treats the string `'BANK_TRANSFER'` as an unknown type.
   - When tedious attempts to execute the query, it crashes with `TypeError: Parameter has no type or type is unknown`.
3. **Missing Buffer Handling**: `Buffer` objects are not checked and fall through to string conversion instead of `sql.VarBinary`.
4. **Scope / Export Limitation**: `bindParameters` is a private function in `lib/db.ts`. Callers using `withTransaction` cannot reuse `bindParameters` on transactional request instances.
5. **Connection Teardown Race Condition**: In `closePool()`, if a connection attempt is in-flight via `global.__mssqlPoolPromise`, closing only `global.__mssqlPool` leaves the pending promise unhandled, potentially opening a dangling connection after teardown.

---

## 2. Complete Schema Catalog & Interface Specification (`types/db.ts`)

The database consists of 11 base tables defined in `scripts/schema.sql` and `thiet-ke-he-thong-xe-buyt.md` (§ 5.2). Below is the comprehensive field-by-field mapping, SQL data type, nullability, default values, and corresponding TypeScript definitions.

### Table 1: `users`
- **Columns**:
  - `id`: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()` -> `string`
  - `full_name`: `NVARCHAR(255) NOT NULL` -> `string`
  - `email`: `NVARCHAR(255) UNIQUE` -> `string | null` (NULL for guest checkouts)
  - `phone`: `NVARCHAR(20) UNIQUE` -> `string | null` (NULL for admin/inspector seed without phone)
  - `password_hash`: `NVARCHAR(255)` -> `string | null` (NULL for guest checkouts)
  - `role`: `VARCHAR(20) NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'inspector', 'admin'))` -> `'passenger' | 'inspector' | 'admin'`
  - `is_student`: `BIT NOT NULL DEFAULT 0` -> `boolean`
  - `is_active`: `BIT NOT NULL DEFAULT 1` -> `boolean`
  - `created_at`: `DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` -> `Date`
  - `updated_at`: `DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` -> `Date`

### Table 2: `bus_routes`
- **Columns**:
  - `id`: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()` -> `string`
  - `route_code`: `VARCHAR(20) NOT NULL UNIQUE` -> `string` (e.g. `"01"`)
  - `route_name`: `NVARCHAR(255) NOT NULL` -> `string`
  - `direction`: `VARCHAR(10) NOT NULL CHECK (direction IN ('FORWARD', 'BACKWARD'))` -> `'FORWARD' | 'BACKWARD'`
  - `description`: `NVARCHAR(MAX)` -> `string | null`
  - `is_active`: `BIT NOT NULL DEFAULT 1` -> `boolean`
  - `created_at`: `DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` -> `Date`

### Table 3: `bus_stops`
- **Columns**:
  - `id`: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()` -> `string`
  - `stop_name`: `NVARCHAR(255) NOT NULL` -> `string`
  - `address`: `NVARCHAR(500)` -> `string | null`
  - `latitude`: `DECIMAL(10, 7) NOT NULL` -> `number`
  - `longitude`: `DECIMAL(10, 7) NOT NULL` -> `number`
  - `created_at`: `DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` -> `Date`

### Table 4: `route_stops`
- **Columns**:
  - `id`: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()` -> `string`
  - `route_id`: `UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE` -> `string`
  - `stop_id`: `UNIQUEIDENTIFIER NOT NULL REFERENCES bus_stops(id)` (NO ACTION) -> `string`
  - `stop_sequence`: `INT NOT NULL` -> `number`
  - `distance_from_start_km`: `DECIMAL(6, 2) NOT NULL DEFAULT 0` -> `number`
  - *Constraints*: `UNIQUE(route_id, stop_sequence)`

### Table 5: `buses`
- **Columns**:
  - `id`: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()` -> `string`
  - `license_plate`: `VARCHAR(20) NOT NULL UNIQUE` -> `string` (e.g. `"29B-123.45"`)
  - `capacity`: `INT NOT NULL` -> `number`
  - `is_active`: `BIT NOT NULL DEFAULT 1` -> `boolean`
  - `created_at`: `DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` -> `Date`

### Table 6: `schedules`
- **Columns**:
  - `id`: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()` -> `string`
  - `route_id`: `UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id)` -> `string`
  - `bus_id`: `UNIQUEIDENTIFIER REFERENCES buses(id)` -> `string | null`
  - `departure_time`: `TIME(0) NOT NULL` -> `string | Date` (e.g. `"06:00:00"`)
  - `average_speed_kmh`: `DECIMAL(5, 2) NOT NULL DEFAULT 20.0` -> `number`
  - `days_of_week`: `VARCHAR(20) NOT NULL DEFAULT 'MON-SUN'` -> `string`
  - `created_at`: `DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` -> `Date`

### Table 7: `ticket_types`
- **Columns**:
  - `id`: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()` -> `string`
  - `category`: `VARCHAR(20) NOT NULL CHECK (category IN ('SINGLE_RIDE', 'DAILY_PASS', 'MONTHLY_PASS'))` -> `'SINGLE_RIDE' | 'DAILY_PASS' | 'MONTHLY_PASS'`
  - `name`: `NVARCHAR(100) NOT NULL` -> `string`
  - `price`: `DECIMAL(10, 2) NOT NULL` -> `number`
  - `validity_hours`: `INT` -> `number | null` (SINGLE_RIDE: 2, DAILY_PASS: 24)
  - `validity_days`: `INT` -> `number | null` (MONTHLY_PASS: 30)
  - `is_student_price`: `BIT NOT NULL DEFAULT 0` -> `boolean`
  - `is_active`: `BIT NOT NULL DEFAULT 1` -> `boolean`

### Table 8: `orders`
- **Columns**:
  - `id`: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()` -> `string`
  - `order_code`: `VARCHAR(30) NOT NULL UNIQUE` -> `string` (VietQR transfer memo)
  - `user_id`: `UNIQUEIDENTIFIER REFERENCES users(id)` -> `string | null` (NULL if guest)
  - `guest_phone`: `VARCHAR(20)` -> `string | null` (required if `user_id` is null)
  - `ticket_type_id`: `UNIQUEIDENTIFIER NOT NULL REFERENCES ticket_types(id)` -> `string`
  - `route_id`: `UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id)` -> `string`
  - `quantity`: `INT NOT NULL DEFAULT 1` -> `number`
  - `total_amount`: `DECIMAL(12, 2) NOT NULL` -> `number`
  - `status`: `VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED'))` -> `'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED'`
  - `activation_date`: `DATE NOT NULL` -> `Date | string`
  - `expires_at`: `DATETIME2 NOT NULL` -> `Date` (VietQR 15-minute countdown)
  - `created_at`: `DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` -> `Date`
  - `updated_at`: `DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` -> `Date`

### Table 9: `tickets`
- **Columns**:
  - `id`: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()` -> `string`
  - `order_id`: `UNIQUEIDENTIFIER NOT NULL REFERENCES orders(id) ON DELETE CASCADE` -> `string`
  - `route_id`: `UNIQUEIDENTIFIER NOT NULL REFERENCES bus_routes(id)` -> `string`
  - `ticket_code`: `VARCHAR(50) NOT NULL UNIQUE` -> `string`
  - `qr_payload`: `NVARCHAR(MAX) NOT NULL` -> `string` (signed JWT token string)
  - `status`: `VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'))` -> `'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED'`
  - `valid_from`: `DATETIME2 NOT NULL` -> `Date`
  - `valid_until`: `DATETIME2 NOT NULL` -> `Date`
  - `used_at`: `DATETIME2` -> `Date | null` (recorded on validation punch)
  - `used_by_inspector_id`: `UNIQUEIDENTIFIER REFERENCES users(id)` -> `string | null`
  - `created_at`: `DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` -> `Date`

### Table 10: `payment_transactions`
- **Columns**:
  - `id`: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()` -> `string`
  - `order_id`: `UNIQUEIDENTIFIER REFERENCES orders(id)` -> `string | null`
  - `sepay_reference_code`: `VARCHAR(100)` -> `string | null`
  - `transfer_amount`: `DECIMAL(12, 2) NOT NULL` -> `number`
  - `raw_content`: `NVARCHAR(MAX)` -> `string | null`
  - `raw_payload`: `NVARCHAR(MAX)` -> `string | null` (JSON string)
  - `processed_at`: `DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` -> `Date`

### Table 11: `complaints`
- **Columns**:
  - `id`: `UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID()` -> `string`
  - `user_id`: `UNIQUEIDENTIFIER REFERENCES users(id)` -> `string | null`
  - `route_id`: `UNIQUEIDENTIFIER REFERENCES bus_routes(id)` -> `string | null`
  - `category`: `VARCHAR(100) NOT NULL` -> `string`
  - `content`: `NVARCHAR(MAX) NOT NULL` -> `string`
  - `status`: `VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED'))` -> `'NEW' | 'IN_PROGRESS' | 'RESOLVED'`
  - `created_at`: `DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()` -> `Date`

---

## 3. Complete Source Code Blueprint: `types/db.ts`

```typescript
/**
 * Vivu Bus Platform - Authoritative Database Domain Models
 * Schema Target: Microsoft SQL Server 2025 Express (bus_ticketing_system)
 * 
 * Strict snake_case column alignment matching scripts/schema.sql and thiet-ke-he-thong-xe-buyt.md
 */

// ============================================================================
// 1. DOMAIN ENUMS & UNION TYPES
// ============================================================================

export type UserRole = 'passenger' | 'inspector' | 'admin';

export type RouteDirection = 'FORWARD' | 'BACKWARD';

export type TicketCategory = 'SINGLE_RIDE' | 'DAILY_PASS' | 'MONTHLY_PASS';

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';

export type TicketStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

export type ComplaintStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';

// ============================================================================
// 2. AUTHORITATIVE TABLE ENTITY MODELS (11 Base Tables)
// ============================================================================

/**
 * 1. users: Account profiles for passengers, inspectors, and administrators
 */
export interface User {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  role: UserRole;
  is_student: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * 2. bus_routes: Bus transit routes with fixed directions
 */
export interface BusRoute {
  id: string;
  route_code: string;
  route_name: string;
  direction: RouteDirection;
  description: string | null;
  is_active: boolean;
  created_at: Date;
}

/**
 * 3. bus_stops: Geographic bus stop locations with coordinates
 */
export interface BusStop {
  id: string;
  stop_name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  created_at: Date;
}

/**
 * 4. route_stops: Sequential station itinerary for a route
 */
export interface RouteStop {
  id: string;
  route_id: string;
  stop_id: string;
  stop_sequence: number;
  distance_from_start_km: number;
}

/**
 * 5. buses: Physical vehicle fleet
 */
export interface Bus {
  id: string;
  license_plate: string;
  capacity: number;
  is_active: boolean;
  created_at: Date;
}

/**
 * 6. schedules: Static departure timetables
 */
export interface Schedule {
  id: string;
  route_id: string;
  bus_id: string | null;
  departure_time: string | Date;
  average_speed_kmh: number;
  days_of_week: string;
  created_at: Date;
}

/**
 * 7. ticket_types: Product catalog and pricing matrix
 */
export interface TicketType {
  id: string;
  category: TicketCategory;
  name: string;
  price: number;
  validity_hours: number | null;
  validity_days: number | null;
  is_student_price: boolean;
  is_active: boolean;
}

/**
 * 8. orders: Passenger ticket orders with VietQR payment state
 */
export interface Order {
  id: string;
  order_code: string;
  user_id: string | null;
  guest_phone: string | null;
  ticket_type_id: string;
  route_id: string;
  quantity: number;
  total_amount: number;
  status: OrderStatus;
  activation_date: Date | string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * 9. tickets: Individual electronic tickets with cryptographic QR payloads
 */
export interface Ticket {
  id: string;
  order_id: string;
  route_id: string;
  ticket_code: string;
  qr_payload: string;
  status: TicketStatus;
  valid_from: Date;
  valid_until: Date;
  used_at: Date | null;
  used_by_inspector_id: string | null;
  created_at: Date;
}

/**
 * 10. payment_transactions: SePay webhook reconciliation audit log
 */
export interface PaymentTransaction {
  id: string;
  order_id: string | null;
  sepay_reference_code: string | null;
  transfer_amount: number;
  raw_content: string | null;
  raw_payload: string | null;
  processed_at: Date;
}

/**
 * 11. complaints: Passenger feedback and inquiries
 */
export interface Complaint {
  id: string;
  user_id: string | null;
  route_id: string | null;
  category: string;
  content: string;
  status: ComplaintStatus;
  created_at: Date;
}

// ============================================================================
// 3. SCHEMA MAPPING & INSERTION HELPERS
// ============================================================================

export interface DatabaseSchema {
  users: User;
  bus_routes: BusRoute;
  bus_stops: BusStop;
  route_stops: RouteStop;
  buses: Bus;
  schedules: Schedule;
  ticket_types: TicketType;
  orders: Order;
  tickets: Ticket;
  payment_transactions: PaymentTransaction;
  complaints: Complaint;
}

export type NewUser = Omit<User, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type NewBusRoute = Omit<BusRoute, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export type NewBusStop = Omit<BusStop, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export type NewRouteStop = Omit<RouteStop, 'id'> & {
  id?: string;
};

export type NewBus = Omit<Bus, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export type NewSchedule = Omit<Schedule, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export type NewTicketType = Omit<TicketType, 'id'> & {
  id?: string;
};

export type NewOrder = Omit<Order, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type NewTicket = Omit<Ticket, 'id' | 'created_at' | 'used_at' | 'used_by_inspector_id'> & {
  id?: string;
  used_at?: Date | null;
  used_by_inspector_id?: string | null;
  created_at?: Date;
};

export type NewPaymentTransaction = Omit<PaymentTransaction, 'id' | 'processed_at'> & {
  id?: string;
  processed_at?: Date;
};

export type NewComplaint = Omit<Complaint, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

// ============================================================================
// 4. INTEGRATION & DTO PAYLOAD CONTRACTS
// ============================================================================

export interface RouteWithStops extends BusRoute {
  stops: (RouteStop & {
    stop_name: string;
    address: string | null;
    latitude: number;
    longitude: number;
  })[];
}

export interface OrderWithTickets extends Order {
  tickets: Ticket[];
  ticket_type: TicketType;
  route: BusRoute;
}

export interface TicketJwtPayload {
  ticket_id: string;
  ticket_code: string;
  order_code: string;
  route_id: string;
  route_code: string;
  valid_from: string;
  valid_until: string;
  is_student: boolean;
  status: TicketStatus;
}

export interface TicketVerificationResult {
  valid: boolean;
  reason?: string;
  ticket?: Ticket & {
    route_name?: string;
    route_code?: string;
    category?: TicketCategory;
  };
}

export interface SePayWebhookInbound {
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code: string | null;
  content: string;
  transferType: string;
  transferAmount: number;
  referenceCode: string;
}
```

---

## 4. Fix Strategy for `lib/db.ts`

### 4.1 Root Cause & Solution in Detail
When executing parameterized queries in `mssql`:
- SQL Server requires exact datatype matching or parameter binding.
- For plain objects and arrays, the serializer must stringify them into JSON format: `JSON.stringify(value)`.
- For `Buffer` objects, `sql.VarBinary` must be bound.
- For explicit SQL type overrides (e.g. `{ type: sql.BigInt, value: '9876543210' }`), the checker must confirm that `value.type` is an authentic `mssql` SQL type object or function, rather than an arbitrary JSON key named `"type"`.

### 4.2 Helper `isSqlType`
Empirical testing on Node.js / `mssql` demonstrates that all 35 SQL Server data types in `sql.TYPES` (such as `sql.BigInt`, `sql.VarChar`, `sql.Decimal`, etc.) satisfy one of two shapes:
1. A function with `declaration: string` property (e.g. `sql.BigInt`).
2. An instantiated descriptor with a nested `type` function having `declaration: string` (e.g. `sql.VarChar(50)`).

```typescript
function isSqlType(t: any): boolean {
  if (!t) return false;
  if (typeof t === 'function' && typeof t.declaration === 'string') return true;
  if (typeof t === 'object' && t.type && typeof t.type.declaration === 'string') return true;
  return false;
}
```

### 4.3 Proposed Implementation of `bindParameters`
```typescript
/**
 * Helper to safely identify authentic mssql DataType instances or constructors.
 * Distinguishes SQL types from arbitrary object properties named 'type'.
 */
function isSqlType(t: any): boolean {
  if (!t) return false;
  if (typeof t === 'function' && typeof t.declaration === 'string') return true;
  if (typeof t === 'object' && t.type && typeof t.type.declaration === 'string') return true;
  return false;
}

/**
 * Binds parameters to an mssql Request with explicit type inference.
 * - Serializes plain objects and arrays into JSON strings to avoid "[object Object]"
 * - Binds Buffers to sql.VarBinary
 * - Supports explicit type wrappers: { type: sql.BigInt, value: '...' }
 * - Preserves 32-bit integer boundary check for sql.Int
 */
export function bindParameters(request: sql.Request, params?: Record<string, any>): void {
  if (!params) return;

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      request.input(key, sql.NVarChar, null);
    } else if (typeof value === 'boolean') {
      request.input(key, sql.Bit, value ? 1 : 0);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        request.input(key, sql.Int, value);
      } else {
        request.input(key, sql.Decimal(12, 4), value);
      }
    } else if (value instanceof Date) {
      request.input(key, sql.DateTime2, value);
    } else if (Buffer.isBuffer(value)) {
      request.input(key, sql.VarBinary, value);
    } else if (
      typeof value === 'object' &&
      value.type &&
      'value' in value &&
      isSqlType(value.type)
    ) {
      // Caller provided explicit SQL type: { type: sql.BigInt, value: '9876543210' }
      request.input(key, value.type, value.value);
    } else if (typeof value === 'object') {
      // Plain object or array: serialize to JSON string
      request.input(key, sql.NVarChar, JSON.stringify(value));
    } else {
      request.input(key, sql.NVarChar, String(value));
    }
  }
}
```

### 4.4 Fix for `closePool()`
```typescript
export async function closePool(): Promise<void> {
  // Await in-flight connection promise to ensure pool is closed cleanly
  if (global.__mssqlPoolPromise) {
    try {
      const pool = await global.__mssqlPoolPromise;
      if (pool.connected) {
        await pool.close();
      }
    } catch {
      // Ignore errors if connecting pool failed
    } finally {
      global.__mssqlPool = undefined;
      global.__mssqlPoolPromise = undefined;
    }
    return;
  }

  if (global.__mssqlPool) {
    try {
      if (global.__mssqlPool.connected) {
        await global.__mssqlPool.close();
      }
    } finally {
      global.__mssqlPool = undefined;
      global.__mssqlPoolPromise = undefined;
    }
  }
}
```

### 4.5 Updated Default Export
```typescript
export default {
  dbConfig,
  getDbPool,
  getPool,
  bindParameters,
  query,
  queryOne,
  execute,
  executeReturning,
  withTransaction,
  checkConnection,
  closePool,
};
```

---

## 5. Verification & Test Plan

1. **Verify TypeScript compilation**:
   Create `types/db.ts` and `types/index.ts`.
   Run `npm run typecheck` (`tsc --noEmit`).
   Must pass with exit code 0.

2. **Verify JSON Object Binding**:
   Add test to `tests/adversarial/db-stress.test.ts`:
   ```typescript
   it('serializes plain objects and arrays to JSON strings without corrupting to [object Object]', async () => {
     const payload = { event: 'PAYMENT_RECEIVED', amount: 50000, meta: { bank: 'VCB' } };
     const res = await queryOne<{ val: string }>('SELECT @val AS val', { val: payload });
     expect(res?.val).toBe(JSON.stringify(payload));
     expect(JSON.parse(res!.val)).toEqual(payload);
   });

   it('safely serializes objects containing type and value fields when type is not an mssql type', async () => {
     const txData = { type: 'TRANSFER', value: 100000 };
     const res = await queryOne<{ val: string }>('SELECT @val AS val', { val: txData });
     expect(res?.val).toBe(JSON.stringify(txData));
   });
   ```

3. **Verify Vitest Runner**:
   Run `npx vitest run tests/adversarial/db-stress.test.ts`.
   Must pass with 100% pass rate.

4. **Verify Production Build**:
   Run `npm run build`.
   Must succeed with exit code 0.
