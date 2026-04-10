import { randomUUID } from "node:crypto";
import { getPool } from "../../infrastructure/db/helpers.js";
import { nowISO } from "../../infrastructure/db/helpers.js";
import type { LocationRow, CreateLocationInput, UpdateLocationInput } from "./types.js";

export function createLocationRepository() {
  return {
    async findAll(projectId?: string): Promise<LocationRow[]> {
      const pool = getPool();
      let sql = `SELECT * FROM location WHERE 1=1`;
      const params: unknown[] = [];
      if (projectId) {
        sql += ` AND project_id = ?`;
        params.push(projectId);
      }
      sql += ` ORDER BY visit_order ASC, created_at ASC`;
      return pool.query<LocationRow>(sql, params);
    },

    async findById(id: string): Promise<LocationRow | null> {
      const pool = getPool();
      const rows = await pool.query<LocationRow>(`SELECT * FROM location WHERE id = ?`, [id]);
      return rows[0] ?? null;
    },

    async findByProjectId(projectId: string): Promise<LocationRow[]> {
      const pool = getPool();
      return pool.query<LocationRow>(
        `SELECT * FROM location WHERE project_id = ? ORDER BY visit_order ASC, created_at ASC`,
        [projectId]
      );
    },

    async insertLocation(input: CreateLocationInput, slug: string): Promise<LocationRow> {
      const pool = getPool();
      const id = randomUUID();
      const now = nowISO();
      await pool.execute(
        `INSERT INTO location (id, project_id, name, slug, description, latitude, longitude, address_text, visit_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.project_id, input.name, slug, input.description, input.latitude, input.longitude, input.address_text, input.visit_order ?? null, now, now]
      );
      await pool.persist();
      const rows = await pool.query<LocationRow>(`SELECT * FROM location WHERE id = ?`, [id]);
      return rows[0];
    },

    async updateLocation(id: string, input: UpdateLocationInput, newSlug: string): Promise<LocationRow> {
      const pool = getPool();
      const now = nowISO();
      await pool.execute(
        `UPDATE location SET
          name = COALESCE(?, name),
          slug = COALESCE(?, slug),
          description = COALESCE(?, description),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          address_text = COALESCE(?, address_text),
          visit_order = COALESCE(?, visit_order),
          updated_at = ?
         WHERE id = ?`,
        [
          input.name ?? null,
          input.slug ? newSlug : null,
          input.description ?? null,
          input.latitude ?? null,
          input.longitude ?? null,
          input.address_text ?? null,
          input.visit_order !== undefined ? input.visit_order : null,
          now,
          id,
        ]
      );
      await pool.persist();
      const rows = await pool.query<LocationRow>(`SELECT * FROM location WHERE id = ?`, [id]);
      return rows[0];
    },

    async deleteLocation(id: string): Promise<void> {
      const pool = getPool();
      await pool.execute(`DELETE FROM location WHERE id = ?`, [id]);
      await pool.persist();
    },

    async findProjectById(projectId: string): Promise<{ id: string } | null> {
      const pool = getPool();
      const rows = await pool.query<{ id: string }>(`SELECT id FROM project WHERE id = ?`, [projectId]);
      return rows[0] ?? null;
    },

    async findBySlugInProject(
      projectId: string,
      slug: string,
      excludeId?: string
    ): Promise<{ id: string } | null> {
      const pool = getPool();
      const sql =
        excludeId !== undefined
          ? `SELECT id FROM location WHERE project_id = ? AND slug = ? AND id != ?`
          : `SELECT id FROM location WHERE project_id = ? AND slug = ?`;
      const params = excludeId !== undefined ? [projectId, slug, excludeId] : [projectId, slug];
      const rows = await pool.query<{ id: string }>(sql, params);
      return rows[0] ?? null;
    },
  };
}
