import { getPool, queryAll, queryOne, runQuery, nowISO } from '../../infrastructure/db/helpers.js';
import type { MediaSetRow } from './types.js';
import type { MediaImageRow } from '../media-images/types.js';

export function createMediaSetRepository() {
  return {
    async findAll(filters?: { projectId?: string; locationId?: string }): Promise<MediaSetRow[]> {
      const pool = getPool();
      let sql = `SELECT * FROM media_set WHERE 1=1`;
      const params: unknown[] = [];
      if (filters?.projectId) {
        sql += ` AND project_id = ?`;
        params.push(filters.projectId);
      }
      if (filters?.locationId) {
        sql += ` AND location_id = ?`;
        params.push(filters.locationId);
      }
      sql += ` ORDER BY created_at DESC`;
      return queryAll<MediaSetRow>(pool, sql, params);
    },

    async findById(id: string): Promise<MediaSetRow | null> {
      const pool = getPool();
      return queryOne<MediaSetRow>(pool, `SELECT * FROM media_set WHERE id = ?`, [id]);
    },

    async findByProjectId(projectId: string): Promise<MediaSetRow[]> {
      const pool = getPool();
      return queryAll<MediaSetRow>(pool, `SELECT * FROM media_set WHERE project_id = ? ORDER BY created_at DESC`, [projectId]);
    },

    async findByLocationId(locationId: string): Promise<MediaSetRow[]> {
      const pool = getPool();
      return queryAll<MediaSetRow>(pool, `SELECT * FROM media_set WHERE location_id = ? ORDER BY created_at DESC`, [locationId]);
    },

    async upsertMediaSet(input: {
      id?: string | null;
      projectId: string;
      locationId?: string | null;
      type: string;
      title: string;
      description: string;
      coverUploadFileId?: string | null;
      isFeatured: boolean;
    }): Promise<MediaSetRow> {
      const pool = getPool();
      const now = nowISO();
      const id = input.id ?? crypto.randomUUID();

      const existing = await queryOne<MediaSetRow>(pool, `SELECT * FROM media_set WHERE id = ?`, [id]);

      if (existing) {
        // UPDATE
        // Use empty string to allow clearing cover_upload_file_id
        const newCoverId = (input.coverUploadFileId === '' ? null : (input.coverUploadFileId ?? null));
        await runQuery(
          pool,
          `UPDATE media_set SET
            location_id = COALESCE(?, location_id),
            type = COALESCE(?, type),
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            cover_upload_file_id = ?,
            is_featured = COALESCE(?, is_featured),
            updated_at = ?
           WHERE id = ?`,
          [
            input.locationId ?? null,
            input.type ?? null,
            input.title ?? null,
            input.description ?? null,
            newCoverId,
            input.isFeatured !== undefined ? (input.isFeatured ? 1 : 0) : null,
            now,
            id,
          ],
        );
      } else {
        // INSERT
        await runQuery(
          pool,
          `INSERT INTO media_set (id, project_id, location_id, type, title, description, cover_upload_file_id, is_featured, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            input.projectId,
            input.locationId ?? null,
            input.type,
            input.title,
            input.description,
            input.coverUploadFileId ?? null,
            input.isFeatured ? 1 : 0,
            now,
            now,
          ],
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return (await queryOne<MediaSetRow>(pool, `SELECT * FROM media_set WHERE id = ?`, [id]))!;
    },

    async deleteMediaSet(id: string): Promise<void> {
      const pool = getPool();
      await runQuery(pool, `DELETE FROM media_set WHERE id = ?`, [id]);
    },

    async reorderMediaImages(input: {
      mediaSetId: string;
      imageIds: string[];
    }): Promise<MediaImageRow[]> {
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Phase 1: shift existing sort_order values by current count to avoid unique collisions
        const [existingRowsResult] = await conn.query(
          `SELECT id, sort_order FROM media_image WHERE media_set_id = ? FOR UPDATE`,
          [input.mediaSetId],
        );
        const existingRows = existingRowsResult as { id: string; sort_order: number }[];
        const offset = existingRows.length;
        if (offset > 0) {
          await conn.execute(
            `UPDATE media_image SET sort_order = sort_order + ? WHERE media_set_id = ?`,
            [offset, input.mediaSetId],
          );
        }

        // Phase 2: rewrite sort_order to match the new order
        for (let i = 0; i < input.imageIds.length; i++) {
          await conn.execute(
            `UPDATE media_image SET sort_order = ? WHERE id = ? AND media_set_id = ?`,
            [i, input.imageIds[i], input.mediaSetId],
          );
        }

        const [rowsResult] = await conn.query(
          `SELECT * FROM media_image WHERE media_set_id = ? ORDER BY sort_order ASC`,
          [input.mediaSetId],
        );
        const rows = rowsResult as MediaImageRow[];

        await conn.commit();
        return rows;
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },

    async findProjectById(id: string): Promise<{ id: string } | null> {
      const pool = getPool();
      return queryOne<{ id: string }>(pool, `SELECT id FROM project WHERE id = ?`, [id]);
    },

    async findLocationById(id: string): Promise<{ id: string } | null> {
      const pool = getPool();
      return queryOne<{ id: string }>(pool, `SELECT id FROM location WHERE id = ?`, [id]);
    },

    async findUploadFileById(id: string): Promise<{ id: string } | null> {
      const pool = getPool();
      return queryOne<{ id: string }>(pool, `SELECT id FROM upload_file WHERE id = ?`, [id]);
    },

    async findMediaImagesByMediaSetId(mediaSetId: string): Promise<{ id: string }[]> {
      const pool = getPool();
      return queryAll<{ id: string }>(
        pool,
        `SELECT id FROM media_image WHERE media_set_id = ? ORDER BY sort_order ASC`,
        [mediaSetId],
      );
    },

    async countMediaImagesByMediaSetId(mediaSetId: string): Promise<number> {
      const pool = getPool();
      const rows = await queryAll<{ count: number }>(
        pool,
        `SELECT COUNT(*) AS count FROM media_image WHERE media_set_id = ?`,
        [mediaSetId],
      );
      return rows[0]?.count ?? 0;
    },
  };
}
