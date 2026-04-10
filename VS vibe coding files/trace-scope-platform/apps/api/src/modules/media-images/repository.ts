import { getPool } from '../../infrastructure/db/db.js';
import type { MediaImageRow } from './types.js';

export function createMediaImageRepository() {
  return {
    async findAll(mediaSetId?: string): Promise<MediaImageRow[]> {
      const pool = getPool();
      let sql = `SELECT * FROM media_image WHERE 1=1`;
      const params: unknown[] = [];
      if (mediaSetId) {
        sql += ` AND media_set_id = ?`;
        params.push(mediaSetId);
      }
      sql += ` ORDER BY sort_order ASC`;
      const rows = await pool.query<MediaImageRow>(sql, params);
      return rows;
    },

    async findById(id: string): Promise<MediaImageRow | null> {
      const pool = getPool();
      const rows = await pool.query<MediaImageRow>(`SELECT * FROM media_image WHERE id = ?`, [id]);
      return rows[0] ?? null;
    },

    async findByMediaSetId(mediaSetId: string): Promise<MediaImageRow[]> {
      const pool = getPool();
      const rows = await pool.query<MediaImageRow>(
        `SELECT * FROM media_image WHERE media_set_id = ? ORDER BY sort_order ASC`,
        [mediaSetId],
      );
      return rows;
    },

    async findBySortOrder(mediaSetId: string, sortOrder: number): Promise<MediaImageRow | null> {
      const pool = getPool();
      const rows = await pool.query<MediaImageRow>(
        `SELECT * FROM media_image WHERE media_set_id = ? AND sort_order = ?`,
        [mediaSetId, sortOrder],
      );
      return rows[0] ?? null;
    },

    async findUploadFileById(uploadFileId: string): Promise<{ id: string } | null> {
      const pool = getPool();
      const rows = await pool.query<{ id: string }>(`SELECT id FROM upload_file WHERE id = ?`, [uploadFileId]);
      return rows[0] ?? null;
    },

    async findMediaSetById(mediaSetId: string): Promise<{ id: string } | null> {
      const pool = getPool();
      const rows = await pool.query<{ id: string }>(`SELECT id FROM media_set WHERE id = ?`, [mediaSetId]);
      return rows[0] ?? null;
    },

    async upsertMediaImage(input: {
      id?: string;
      media_set_id: string;
      upload_file_id: string;
      alt_text: string;
      caption: string;
      sort_order: number;
      latitude: number | null;
      longitude: number | null;
      now: string;
    }): Promise<MediaImageRow> {
      const pool = getPool();
      if (input.id) {
        // Update existing
        await pool.execute(
          `UPDATE media_image SET
            alt_text = COALESCE(?, alt_text),
            caption = COALESCE(?, caption),
            sort_order = COALESCE(?, sort_order),
            latitude = COALESCE(?, latitude),
            longitude = COALESCE(?, longitude),
            updated_at = ?
           WHERE id = ?`,
          [
            input.alt_text ?? null,
            input.caption ?? null,
            input.sort_order ?? null,
            input.latitude ?? null,
            input.longitude ?? null,
            input.now,
            input.id,
          ],
        );
      } else {
        // Insert new
        const id = input.id ?? crypto.randomUUID();
        await pool.execute(
          `INSERT INTO media_image (id, media_set_id, upload_file_id, alt_text, caption, sort_order, latitude, longitude, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            input.media_set_id,
            input.upload_file_id,
            input.alt_text,
            input.caption,
            input.sort_order,
            input.latitude,
            input.longitude,
            input.now,
            input.now,
          ],
        );
      }
      const rows = await pool.query<MediaImageRow>(`SELECT * FROM media_image WHERE id = ?`, [input.id ?? '']);
      return rows[0];
    },

    async deleteMediaImage(id: string): Promise<void> {
      const pool = getPool();
      await pool.execute(`DELETE FROM media_image WHERE id = ?`, [id]);
    },
  };
}
