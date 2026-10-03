/**
 * Database Verification Helper for Vivu Tests
 */

export interface DbConfig {
  server: string;
  port: number;
  user: string;
  password: string;
  database: string;
  options: {
    trustServerCertificate: boolean;
    encrypt: boolean;
  };
}

export const DEFAULT_DB_CONFIG: DbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  user: process.env.DB_USER || 'vivu_admin',
  password: process.env.DB_PASSWORD || 'VivuAdmin@2026!',
  database: process.env.DB_NAME || 'bus_ticketing_system',
  options: {
    trustServerCertificate: true,
    encrypt: true,
  },
};
