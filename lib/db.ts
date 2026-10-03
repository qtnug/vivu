/**
 * Database Client & Connection Pool for Vivu Bus Ticketing Platform
 * Target: Microsoft SQL Server (mssql / tedious)
 * Designed for Next.js App Router & Node.js environment
 */

import sql from 'mssql';

// Database configuration with environment variable support & fallback defaults
export const dbConfig: sql.config = {
  user: process.env.DB_USER || 'vivu_admin',
  password: process.env.DB_PASSWORD || 'VivuAdmin@2026!',
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'bus_ticketing_system',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true, // Required for self-signed certificates in local SQLEXPRESS
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 15000,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

// Global singleton cache across Next.js App Router HMR (Hot Module Replacement)
declare global {
  var __mssqlPool: sql.ConnectionPool | undefined;
  var __mssqlPoolPromise: Promise<sql.ConnectionPool> | undefined;
}

/**
 * Helper to establish pool connection with exponential backoff retry.
 * Handles transient TDS prelogin delays, server wake-up, and thread contention.
 */
async function connectWithRetry(
  config: sql.config,
  maxRetries = 3,
  baseDelayMs = 1500
): Promise<sql.ConnectionPool> {
  let attempt = 0;
  while (true) {
    attempt++;
    const pool = new sql.ConnectionPool(config);

    try {
      const connected = await pool.connect();
      return connected;
    } catch (err: any) {
      try {
        await pool.close();
      } catch {}

      const msg = err.message || '';
      const isRetryable =
        msg.includes('Failed to connect') ||
        msg.includes('timeout') ||
        msg.includes('prelogin') ||
        msg.includes('Failed to open the explicitly specified database') ||
        err.code === 'ETIMEOUT' ||
        err.code === 'ESOCKET' ||
        err.code === 'ECONNRESET';

      if (attempt >= maxRetries || !isRetryable) {
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500);
      console.warn(
        `[DB Pool] Connection attempt ${attempt}/${maxRetries} failed (${msg}). Retrying in ${Math.round(delay)}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Returns a connected mssql ConnectionPool singleton.
 * Prevents multiple concurrent connection attempts via promise caching.
 */
export async function getDbPool(): Promise<sql.ConnectionPool> {
  // Return active connected pool if available
  if (global.__mssqlPool && global.__mssqlPool.connected) {
    return global.__mssqlPool;
  }

  // Await existing connection in-flight promise to avoid connection race conditions
  if (global.__mssqlPoolPromise) {
    return global.__mssqlPoolPromise;
  }

  // Create new connection pool promise
  global.__mssqlPoolPromise = (async () => {
    try {
      const connectedPool = await connectWithRetry(dbConfig, 3, 1500);

      connectedPool.on('error', (err) => {
        console.error('[DB Pool Error]: Unexpected background error on idle client:', err.message);
        // Reset pool singleton on fatal disconnection
        if (!connectedPool.connected) {
          global.__mssqlPool = undefined;
          global.__mssqlPoolPromise = undefined;
        }
      });

      global.__mssqlPool = connectedPool;
      return connectedPool;
    } catch (err: any) {
      global.__mssqlPool = undefined;
      global.__mssqlPoolPromise = undefined;
      console.error(
        `[DB Connection Error]: Could not connect to SQL Server at ${dbConfig.server}:${dbConfig.port} (DB: ${dbConfig.database}):`,
        err.message
      );
      throw err;
    }
  })();

  return global.__mssqlPoolPromise;
}

/**
 * Alias for getDbPool() as specified in interface contracts.
 */
export const getPool = getDbPool;

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

/**
 * Executes a parameterized SQL query returning rows.
 * @param sqlText T-SQL query string (using @param notation)
 * @param params Object containing key-value parameters
 * @returns Array of typed rows
 */
export async function query<T = any>(
  sqlText: string,
  params?: Record<string, any>
): Promise<T[]> {
  try {
    const pool = await getDbPool();
    const request = pool.request();
    bindParameters(request, params);
    const result = await request.query<T>(sqlText);
    return result.recordset || [];
  } catch (err: any) {
    console.error(`[DB Query Error] Query: ${sqlText.trim().substring(0, 100)}...`, err.message);
    throw err;
  }
}

/**
 * Executes a query expecting at most one row.
 * Returns the first row or null if not found.
 */
export async function queryOne<T = any>(
  sqlText: string,
  params?: Record<string, any>
): Promise<T | null> {
  const rows = await query<T>(sqlText, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Executes an INSERT, UPDATE, or DELETE statement.
 * @param sqlText T-SQL statement
 * @param params Object containing key-value parameters
 * @returns Total number of rows affected
 */
export async function execute(
  sqlText: string,
  params?: Record<string, any>
): Promise<number> {
  try {
    const pool = await getDbPool();
    const request = pool.request();
    bindParameters(request, params);
    const result = await request.query(sqlText);
    return result.rowsAffected.reduce((sum, count) => sum + count, 0);
  } catch (err: any) {
    console.error(`[DB Execute Error] Statement: ${sqlText.trim().substring(0, 100)}...`, err.message);
    throw err;
  }
}

/**
 * Executes an INSERT/UPDATE statement with OUTPUT INSERTED.* returning the single affected row.
 */
export async function executeReturning<T = any>(
  sqlText: string,
  params?: Record<string, any>
): Promise<T | null> {
  const rows = await query<T>(sqlText, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Executes operations inside an ACID transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 */
export async function withTransaction<T>(
  callback: (transaction: sql.Transaction, requestFactory: () => sql.Request) => Promise<T>
): Promise<T> {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();
  try {
    const requestFactory = () => new sql.Request(transaction);
    const result = await callback(transaction, requestFactory);
    await transaction.commit();
    return result;
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (rbErr: any) {
      console.error('[DB Transaction Rollback Error]:', rbErr.message);
    }
    throw err;
  }
}

/**
 * Tests database connectivity. Returns true if SELECT 1 succeeds.
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const rows = await query<{ ok: number }>('SELECT 1 AS ok');
    return rows.length > 0 && rows[0].ok === 1;
  } catch (err) {
    return false;
  }
}

/**
 * Gracefully shuts down the connection pool (useful for test teardown and process exit).
 */
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
    } catch {
      // Guard against socket termination exceptions during teardown
    } finally {
      global.__mssqlPool = undefined;
      global.__mssqlPoolPromise = undefined;
    }
  }
}

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
