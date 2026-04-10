import { getPool, queryOne, runQuery } from '../../infrastructure/db/helpers.js';
import type { UploadFileRow } from './types.js';

export function createUploadRepository() {
  return {
    async findById(id: string): Promise<UploadFileRow | null> {
      const pool = getPool();
      return await queryOne<UploadFileRow>(
        pool,
        'SELECT * FROM upload_file WHERE id = ?',
        [id],
      );
    },

    async findByIds(ids: string[]): Promise<UploadFileRow[]> {
      if (ids.length === 0) return [];
      const pool = getPool();
      const placeholders = ids.map(() => '?').join(',');
      const rows = await pool.query<UploadFileRow>(
        `SELECT * FROM upload_file WHERE id IN (${placeholders})`,
        ids,
      );
      return rows;
    },

    async insertUploadFile(input: {
      id: string;
      storageKey: string;
      originalFilename: string;
      mimeType: string;
      byteSize: number;
      sha256Hash: string;
      createdAt: string;
    }): Promise<void> {
      const pool = getPool();
      await runQuery(
        pool,
        `INSERT INTO upload_file (id, storage_key, original_filename, mime_type, byte_size, sha256_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.id,
          input.storageKey,
          input.originalFilename,
          input.mimeType,
          input.byteSize,
          input.sha256Hash,
          input.createdAt,
        ],
      );
    },

    async deleteUploadFile(id: string): Promise<void> {
      const pool = getPool();
      await runQuery(pool, `DELETE FROM upload_file WHERE id = ?`, [id]);
    },
  };
}
