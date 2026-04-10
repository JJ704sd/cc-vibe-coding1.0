import { getPool, queryAll, queryOne, runQuery } from "../../infrastructure/db/helpers.js";
import type { RouteRow, RouteLocationRow } from "./types.js";

export function createRouteRepository() {
  return {
    async findAll(): Promise<RouteRow[]> {
      const pool = getPool();
      return queryAll<RouteRow>(pool, `SELECT * FROM route ORDER BY created_at DESC`);
    },

    async findById(id: string): Promise<RouteRow | null> {
      const pool = getPool();
      return queryOne<RouteRow>(pool, `SELECT * FROM route WHERE id = ?`, [id]);
    },

    async findByProjectId(projectId: string): Promise<RouteRow[]> {
      const pool = getPool();
      return queryAll<RouteRow>(
        pool,
        `SELECT * FROM route WHERE project_id = ? ORDER BY created_at DESC`,
        [projectId]
      );
    },

    async upsertRoute(input: {
      id: string;
      project_id: string;
      name: string;
      description: string;
      line_style: string;
      color: string;
      is_featured: number;
      created_at: string;
      updated_at: string;
    }): Promise<void> {
      const pool = getPool();
      await runQuery(
        pool,
        `INSERT INTO route (id, project_id, name, description, line_style, color, is_featured, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.id, input.project_id, input.name, input.description, input.line_style, input.color, input.is_featured, input.created_at, input.updated_at]
      );
    },

    async updateRoute(input: {
      id: string;
      name: string | null;
      description: string | null;
      line_style: string | null;
      color: string | null;
      is_featured: number | null;
      updated_at: string;
    }): Promise<void> {
      const pool = getPool();
      await runQuery(
        pool,
        `UPDATE route SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          line_style = COALESCE(?, line_style),
          color = COALESCE(?, color),
          is_featured = COALESCE(?, is_featured),
          updated_at = ?
         WHERE id = ?`,
        [
          input.name,
          input.description,
          input.line_style,
          input.color,
          input.is_featured,
          input.updated_at,
          input.id,
        ]
      );
    },

    async deleteRoute(id: string): Promise<void> {
      const pool = getPool();
      await runQuery(pool, `DELETE FROM route WHERE id = ?`, [id]);
    },

    async findRouteLocations(routeId: string): Promise<RouteLocationRow[]> {
      const pool = getPool();
      return queryAll<RouteLocationRow>(
        pool,
        `SELECT * FROM route_location WHERE route_id = ? ORDER BY sort_order`,
        [routeId]
      );
    },

    async findRouteLocationsForRouteIds(routeIds: string[]): Promise<RouteLocationRow[]> {
      if (routeIds.length === 0) return [];
      const pool = getPool();
      const placeholders = routeIds.map(() => "?").join(",");
      return queryAll<RouteLocationRow>(
        pool,
        `SELECT * FROM route_location WHERE route_id IN (${placeholders}) ORDER BY sort_order`,
        routeIds
      );
    },

    async replaceRouteLocations(routeId: string, locationIds: string[]): Promise<void> {
      const pool = getPool();
      await runQuery(pool, `DELETE FROM route_location WHERE route_id = ?`, [routeId]);
      for (let i = 0; i < locationIds.length; i++) {
        await runQuery(
          pool,
          `INSERT INTO route_location (route_id, location_id, sort_order) VALUES (?, ?, ?)`,
          [routeId, locationIds[i], i]
        );
      }
    },

    async insertRouteLocation(routeId: string, locationId: string, sortOrder: number): Promise<void> {
      const pool = getPool();
      await runQuery(
        pool,
        `INSERT INTO route_location (route_id, location_id, sort_order) VALUES (?, ?, ?)`,
        [routeId, locationId, sortOrder]
      );
    },
  };
}
