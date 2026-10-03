# Handoff Report: Explorer M1 Iteration 2.1 (Domain Types & Parameter Binding Strategy)

- **Agent**: `explorer_m1_it2_1` (teamwork_preview_explorer)
- **Roles**: explorer
- **Working Directory**: `d:/DangQuangTung/Vivu/.agents/teamwork/explorer_m1_it2_1`
- **Target Recipient**: Parent Orchestrator (`891098e1-52e3-4582-a42d-340f57c72e75`)
- **Handoff Type**: Hard (Task Complete)
- **Timestamp**: 2026-10-02T13:30:00Z

---

## 1. Observation

### 1.1 Direct File Inspections & Verbatim Code Quotes

#### 1. Missing Entity Type Layer
- Inspection of the repository root confirmed that `types/` directory does not exist.
- In `lib/db.ts` (lines 122, 142, 176):
  ```typescript
  export async function query<T = any>(sqlText: string, params?: Record<string, any>): Promise<T[]>
  export async function queryOne<T = any>(sqlText: string, params?: Record<string, any>): Promise<T | null>
  export async function executeReturning<T = any>(sqlText: string, params?: Record<string, any>): Promise<T | null>
  ```
  Every query method defaults `T` to `any`, lacking entity typing.

#### 2. Parameter Binding Coercion Flaw in `lib/db.ts`
- In `lib/db.ts` (lines 94–114):
  ```typescript
  94:   for (const [key, value] of Object.entries(params)) {
  95:     if (value === null || value === undefined) {
  96:       request.input(key, sql.NVarChar, null);
  97:     } else if (typeof value === 'boolean') {
  98:       request.input(key, sql.Bit, value ? 1 : 0);
  99:     } else if (typeof value === 'number') {
  100:       if (Number.isInteger(value)) {
  101:         request.input(key, sql.Int, value);
  102:       } else {
  103:         request.input(key, sql.Decimal(12, 4), value);
  104:       }
  105:     } else if (value instanceof Date) {
  106:       request.input(key, sql.DateTime2, value);
  107:     } else if (typeof value === 'object' && value.type && 'value' in value) {
  108:       // Allows caller to provide explicit SQL type: { type: sql.VarChar(50), value: 'foo' }
  109:       request.input(key, value.type, value.value);
  110:     } else {
  111:       request.input(key, sql.NVarChar, String(value));
  112:     }
  113:   }
  ```
- **Line 111**: `request.input(key, sql.NVarChar, String(value))` converts any plain JavaScript object or array to `"[object Object]"` or comma-delimited strings (`"1,2,3"`).
- **Line 107**: The check `value.type && 'value' in value` does not verify if `value.type` is an `mssql` SQL data type.

#### 3. Empirical Verification of Parameter Binding Behavior
- **Test Command**:
  ```powershell
  node -e "const sql = require('mssql'); const req = new sql.Request(); req.input('foo', 'BANK_TRANSFER', 100); console.log('param foo:', req.parameters.foo);"
  ```
- **Verbatim Output**:
  ```
  param foo: {
    name: 'foo',
    type: undefined,
    io: 1,
    value: 100,
    length: 13,
    scale: undefined,
    precision: undefined,
    tvpType: undefined
  }
  ```
  *Result*: When an object with properties `type: 'BANK_TRANSFER'` and `value: 100` is passed, `type` is set to `undefined`, causing tedious driver runtime failure `Parameter foo has no type or type is unknown`.

#### 4. Empirical Verification of Proposed `isSqlType` and JSON Serialization
- **Test Command**:
  ```powershell
  node -e "const sql = require('mssql');
  function isSqlType(t) {
    if (!t) return false;
    if (typeof t === 'function' && typeof t.declaration === 'string') return true;
    if (typeof t === 'object' && t.type && typeof t.type.declaration === 'string') return true;
    return false;
  }
  let allPassed = true;
  for (const [name, typeFn] of Object.entries(sql.TYPES)) {
    const checkFn = isSqlType(typeFn);
    let checkInst = true;
    try { const inst = typeFn(); checkInst = isSqlType(inst); } catch (e) {}
    if (!checkFn || !checkInst) allPassed = false;
  }
  console.log('All sql.TYPES passed:', allPassed);
  "
  ```
- **Verbatim Output**:
  ```
  All sql.TYPES passed: true
  ```

#### 5. Empirical Verification of Fixed `bindParameters`
- **Test Command**:
  Executed Node test binding `{ plainObj: { orderId: 10, code: 'ABC' }, arr: [1, 2, 'three'], customSql: { type: sql.BigInt, value: '9876543210' }, pseudoType: { type: 'TRANSFER', value: 50000 }, buf: Buffer.from('bin') }`.
- **Verbatim Output**:
  ```
  plainObj: {"orderId":10,"code":"ABC"}
  arr: [1,2,"three"]
  customSql type: true 9876543210
  pseudoType: {"type":"TRANSFER","value":50000}
  buf type: true
  ```

---

## 2. Logic Chain

1. **Missing Types Lead to Runtime Errors (Observation 1.1)**:
   - In Iteration 1, developers wrote queries using camelCase (`createdAt`, `passwordHash`, `routeName`, `routeNumber`) because no shared types existed.
   - SQL Server tables strictly define snake_case columns (`created_at`, `password_hash`, `route_name`, `route_code`).
   - Defining authoritative TypeScript interfaces in `types/db.ts` matching the exact schema provides compile-time verification across all portals and tests, permanently preventing naming divergence.

2. **Plain Objects Corrupted by String Coercion (Observation 1.2, Line 111)**:
   - Database column `payment_transactions.raw_payload` is defined as `NVARCHAR(MAX)` intended to store SePay webhook raw JSON payloads.
   - When an application passes a webhook payload object as a query parameter, `String(value)` evaluates to `"[object Object]"`.
   - Replacing this with `JSON.stringify(value)` ensures structured data is preserved in valid JSON format.

3. **Risk of Colliding Object Keys (Observation 1.3)**:
   - A business object like `{ type: 'REFUND', value: 20000 }` has both `type` and `value` fields.
   - Under the old code, this passed line 107 and assigned `type = 'REFUND'` as the SQL data type, which crashed tedious with `Parameter has no type or type is unknown`.
   - By validating with `isSqlType(value.type)` (Observation 1.4), legitimate SQL type wrappers (`{ type: sql.BigInt, value: '...' }`) are honored, while business objects are safely serialized with `JSON.stringify`.

4. **Resource Management on Teardown (Observation 1.2)**:
   - In `lib/db.ts`, `closePool()` previously inspected only `global.__mssqlPool`. If a connection attempt was in flight (`global.__mssqlPoolPromise`), `closePool()` did not wait for it.
   - Awaiting `global.__mssqlPoolPromise` in `closePool()` guarantees all connections are closed prior to test completion.

---

## 3. Caveats

1. **Read-Only Explorer Scope**: In accordance with the Explorer archetype rules, no changes have been committed directly to `types/db.ts` or `lib/db.ts`. The exact code changes are fully formulated in `analysis.md` and this handoff for Worker M1 to apply.
2. **Date vs String in Timestamps**: In `mssql` (`tedious`), `DATETIME2` columns return JavaScript `Date` objects when queried directly. When serialized over Next.js API route JSON responses, they become ISO string representations. The interfaces model them as `Date` (with `Date | string` for flexible inputs).
3. **Database Casing Convention**: SQL Server on Windows is case-insensitive for table names and column names by default, but TypeScript and JSON objects in JavaScript are strictly case-sensitive. The interfaces enforce exact snake_case to match SQL column definitions.

---

## 4. Conclusion

The fix strategy is completely formulated and empirically validated.

### 4.1 Deliverable 1: `types/db.ts`
Worker M1 should create `types/db.ts` (and re-export via `types/index.ts`) containing:
- 6 domain enums/unions: `UserRole`, `RouteDirection`, `TicketCategory`, `OrderStatus`, `TicketStatus`, `ComplaintStatus`.
- 11 entity models matching SQL Server snake_case:
  1. `User`
  2. `BusRoute`
  3. `BusStop`
  4. `RouteStop`
  5. `Bus`
  6. `Schedule`
  7. `TicketType`
  8. `Order`
  9. `Ticket`
  10. `PaymentTransaction`
  11. `Complaint`
- Insertion helpers (`NewUser`, `NewOrder`, etc.) and DTOs (`RouteWithStops`, `OrderWithTickets`, `TicketJwtPayload`, `TicketVerificationResult`).

### 4.2 Deliverable 2: `lib/db.ts`
Worker M1 should update `lib/db.ts`:
1. Add `isSqlType(t: any): boolean` helper.
2. Update and export `bindParameters`:
   - Serialize plain objects/arrays with `JSON.stringify(value)`.
   - Bind Buffers to `sql.VarBinary`.
   - Protect explicit type check with `isSqlType(value.type)`.
   - Keep 32-bit integer boundary check (`sql.Int`).
3. Update `closePool()` to await `global.__mssqlPoolPromise`.
4. Add `bindParameters` to the default export.

---

## 5. Verification Method

Once Worker M1 applies the changes:

1. **Verify TypeScript Typechecking**:
   ```powershell
   npm run typecheck
   ```
   *Expected*: `tsc --noEmit` exits with code 0.

2. **Verify Database Integrity**:
   ```powershell
   node scripts/verify-db.js
   ```
   *Expected*: `Total Checks: 43 | Passed: 43 | Failed: 0`, exit code 0.

3. **Verify Vitest Runner (including DB Stress Suite)**:
   ```powershell
   npx vitest run
   ```
   *Expected*: All test suites pass (21/21 files, 149/149 tests), exit code 0.

4. **Verify Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Next.js build succeeds with Turbopack, exit code 0.
