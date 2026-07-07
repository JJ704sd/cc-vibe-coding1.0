import mysql from 'mysql2/promise';
import type { ResultSetHeader } from 'mysql2';
import type { AppConfig } from '../../app/config.js';

export type DbPool = {
  query: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
  queryOne: <T>(sql: string, params?: unknown[]) => Promise<T | null>;
  /**
   * Run a write statement (INSERT / UPDATE / DELETE / DDL). The returned
   * value is mysql2's ResultSetHeader — cast to access affectedRows /
   * insertId / warningStatus. For SELECTs use `query` instead.
   */
  execute: (sql: string, params?: unknown[]) => Promise<ResultSetHeader>;
  getConnection: () => Promise<mysql.PoolConnection>;
  persist: () => Promise<void>;
};

let pool: DbPool | null = null;

export const getPool = (): DbPool => {
  if (!pool) {
    throw new Error('Database not initialized. Call initDb first.');
  }
  return pool;
};

export const initDb = async (config: AppConfig): Promise<DbPool> => {
  const connection = await mysql.createConnection({
    host: config.mysqlHost,
    port: config.mysqlPort,
    user: config.mysqlUser,
    password: config.mysqlPassword,
    database: config.mysqlDatabase,
  });

  // Run migrations
  const migrations = await import('./sql/migrations.js');
  const migrationSql = migrations.default as string;
  const statements = migrationSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    await connection.execute(statement);
  }

  await connection.end();

  // Create pool for ongoing use
  const mysqlPool = mysql.createPool({
    host: config.mysqlHost,
    port: config.mysqlPort,
    user: config.mysqlUser,
    password: config.mysqlPassword,
    database: config.mysqlDatabase,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Use any to bypass strict mysql2 type checking
  const mysqlPoolAny = mysqlPool as unknown as {
    query(sql: string, params?: unknown[]): Promise<[unknown[], unknown[]]>;
    execute(sql: string, params?: unknown[]): Promise<[unknown, unknown[]]>;
    getConnection(): Promise<mysql.PoolConnection>;
  };

  pool = {
    query: async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
      const [rows] = await mysqlPoolAny.query(sql, params);
      return rows as T[];
    },
    queryOne: async <T>(sql: string, params: unknown[] = []): Promise<T | null> => {
      const [rows] = await mysqlPoolAny.query(sql, params);
      const result = rows as T[];
      return result[0] ?? null;
    },
    execute: async (sql: string, params: unknown[] = []): Promise<ResultSetHeader> => {
      const [result] = await mysqlPoolAny.execute(sql, params);
      return result as ResultSetHeader;
    },
    getConnection: () => mysqlPool.getConnection(),
    persist: async () => {
      // No-op for MySQL - data is already persisted
    },
  };

  return pool;
};
