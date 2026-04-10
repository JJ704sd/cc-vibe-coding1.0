import { getPool, queryAll, queryOne, runQuery, nowISO } from '../../infrastructure/db/helpers.js';
import type { MediaSetRow } from './types.js';

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
        await runQuery(
          pool,
          `UPDATE media_set SET
            location_id = COALESCE(?, location_id),
            type = COALESCE(?, type),
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            cover_upload_file_id = COALESCE(?, cover_upload_file_id),
            is_featured = COALESCE(?, is_featured),
            updated_at = ?
           WHERE id = ?`,
          [
            input.locationId ?? null,
            input.type ?? null,
            input.title ?? null,
            input.description ?? null,
            input.coverUploadFileId ?? null,
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
  };
}
