import { getPool, queryAll, queryOne, runQuery } from "../../infrastructure/db/helpers.js";
import type { RouteRow, RouteLocationRow, RouteWithLocations } from "./types.js";

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

    /**
     * Returns the location ids (subset of `locationIds`) that exist in the
     * given project. Lets callers verify ownership in a single round-trip
     * instead of one SELECT per id.
     */
    async findLocationsByIdsAndProject(
      locationIds: string[],
      projectId: string,
    ): Promise<{ id: string }[]> {
      if (locationIds.length === 0) return [];
      const pool = getPool();
      const placeholders = locationIds.map(() => "?").join(",");
      return queryAll<{ id: string }>(
        pool,
        `SELECT id FROM location WHERE id IN (${placeholders}) AND project_id = ?`,
        [...locationIds, projectId],
      );
    },

    /**
     * Inserts a route and all its location links atomically. Either every
     * row lands or none of them do, so the database never ends up with a
     * route that has dangling or partial location links.
     */
    async createRouteWithLocations(input: {
      id: string;
      project_id: string;
      name: string;
      description: string;
      line_style: string;
      color: string;
      is_featured: number;
      created_at: string;
      updated_at: string;
      location_ids: string[];
    }): Promise<RouteWithLocations> {
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute(
          `INSERT INTO route (id, project_id, name, description, line_style, color, is_featured, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            input.id,
            input.project_id,
            input.name,
            input.description,
            input.line_style,
            input.color,
            input.is_featured,
            input.created_at,
            input.updated_at,
          ],
        );
        for (let i = 0; i < input.location_ids.length; i++) {
          await conn.execute(
            `INSERT INTO route_location (route_id, location_id, sort_order) VALUES (?, ?, ?)`,
            [input.id, input.location_ids[i], i],
          );
        }
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }

      // Read back outside the transaction so callers see committed state.
      const route = await queryOne<RouteRow>(pool, `SELECT * FROM route WHERE id = ?`, [input.id]);
      const locations = await queryAll<RouteLocationRow>(
        pool,
        `SELECT * FROM route_location WHERE route_id = ? ORDER BY sort_order`,
        [input.id],
      );
      return { ...route!, locations };
    },

    /**
     * Updates the route row and (optionally) replaces its location links in
     * a single transaction. Pass `location_ids: null` to leave the link set
     * untouched; pass an array (possibly empty) to atomically swap it.
     */
    async updateRouteWithLocations(input: {
      id: string;
      name: string | null;
      description: string | null;
      line_style: string | null;
      color: string | null;
      is_featured: number | null;
      updated_at: string;
      location_ids: string[] | null;
    }): Promise<RouteWithLocations> {
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute(
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
          ],
        );
        if (input.location_ids !== null) {
          await conn.execute(`DELETE FROM route_location WHERE route_id = ?`, [input.id]);
          for (let i = 0; i < input.location_ids.length; i++) {
            await conn.execute(
              `INSERT INTO route_location (route_id, location_id, sort_order) VALUES (?, ?, ?)`,
              [input.id, input.location_ids[i], i],
            );
          }
        }
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }

      const route = await queryOne<RouteRow>(pool, `SELECT * FROM route WHERE id = ?`, [input.id]);
      const locations = await queryAll<RouteLocationRow>(
        pool,
        `SELECT * FROM route_location WHERE route_id = ? ORDER BY sort_order`,
        [input.id],
      );
      return { ...route!, locations };
    },

    async replaceRouteLocations(routeId: string, locationIds: string[]): Promise<void> {
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute(`DELETE FROM route_location WHERE route_id = ?`, [routeId]);
        for (let i = 0; i < locationIds.length; i++) {
          await conn.execute(
            `INSERT INTO route_location (route_id, location_id, sort_order) VALUES (?, ?, ?)`,
            [routeId, locationIds[i], i]
          );
        }
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },

    async countRouteLocationsByRouteId(routeId: string): Promise<number> {
      const pool = getPool();
      const rows = await queryAll<{ count: number }>(
        pool,
        `SELECT COUNT(*) AS count FROM route_location WHERE route_id = ?`,
        [routeId],
      );
      return rows[0]?.count ?? 0;
    },
  };
}
