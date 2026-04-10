import type { DbPool } from './db.js';
export { getPool } from './db.js';
export type { DbPool };

export const queryAll = async <T>(
  pool: DbPool,
  sql: string,
  params: unknown[] = []
): Promise<T[]> => {
  return pool.query<T>(sql, params);
};

export const queryOne = async <T>(
  pool: DbPool,
  sql: string,
  params: unknown[] = []
): Promise<T | null> => {
  return pool.queryOne<T>(sql, params);
};

export const runQuery = async (
  pool: DbPool,
  sql: string,
  params: unknown[] = []
): Promise<void> => {
  return pool.execute(sql, params);
};

export const nowISO = (): string => new Date().toISOString().slice(0, 19).replace('T', ' ');
