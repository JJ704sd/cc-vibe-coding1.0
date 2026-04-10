import { randomUUID } from "node:crypto";
import { getPool, queryOne, nowISO } from "../../infrastructure/db/helpers.js";
import { AppError } from "../../app/errors.js";
import type { RouteRow, RouteLocationRow, RouteWithLocations } from "./types.js";

export class RouteService {
  constructor(
    private readonly repository: ReturnType<typeof import("./repository.js").createRouteRepository>,
  ) {}

  private get pool() { return getPool(); }

  async findAll(projectId?: string): Promise<RouteWithLocations[]> {
    let routes: RouteRow[];
    if (projectId) {
      routes = await this.repository.findByProjectId(projectId);
    } else {
      routes = await this.repository.findAll();
    }

    if (routes.length === 0) {
      return routes.map((r) => ({ ...r, locations: [] }));
    }

    const ids = routes.map((r) => r.id);
    const allLocations = await this.repository.findRouteLocationsForRouteIds(ids);
    const locationsByRoute: Record<string, RouteLocationRow[]> = {};
    for (const rl of allLocations) {
      if (!locationsByRoute[rl.route_id]) locationsByRoute[rl.route_id] = [];
      locationsByRoute[rl.route_id].push(rl);
    }

    return routes.map((r) => ({ ...r, locations: locationsByRoute[r.id] ?? [] }));
  }

  async findById(id: string): Promise<RouteWithLocations | null> {
    const route = await this.repository.findById(id);
    if (!route) return null;
    const locations = await this.repository.findRouteLocations(route.id);
    return { ...route, locations };
  }

  async create(input: {
    project_id: string;
    name: string;
    description: string;
    line_style: string;
    color: string;
    is_featured?: boolean;
    location_ids?: string[];
  }): Promise<RouteWithLocations> {
    if (!input.project_id || !input.name || !input.description || !input.line_style || !input.color) {
      throw new AppError("project_id, name, description, line_style, color are required", 400);
    }
    if (input.line_style !== "solid" && input.line_style !== "dashed") {
      throw new AppError("line_style must be 'solid' or 'dashed'", 400);
    }

    const project = await queryOne<{ id: string }>(
      this.pool,
      `SELECT id FROM project WHERE id = ?`,
      [input.project_id]
    );
    if (!project) throw new AppError("project_id not found", 400);

    for (const lid of input.location_ids ?? []) {
      const location = await queryOne<{ id: string }>(
        this.pool,
        `SELECT id FROM location WHERE id = ? AND project_id = ?`,
        [lid, input.project_id]
      );
      if (!location) throw new AppError(`location_id ${lid} not found or does not belong to project`, 400);
    }

    const id = randomUUID();
    const now = nowISO();

    await this.repository.upsertRoute({
      id,
      project_id: input.project_id,
      name: input.name,
      description: input.description,
      line_style: input.line_style,
      color: input.color,
      is_featured: input.is_featured ? 1 : 0,
      created_at: now,
      updated_at: now,
    });

    for (let i = 0; i < (input.location_ids ?? []).length; i++) {
      await this.repository.insertRouteLocation(id, input.location_ids![i], i);
    }

    await this.pool.persist();
    const route = await this.repository.findById(id);
    const locations = await this.repository.findRouteLocations(id);
    return { ...route!, locations };
  }

  async update(
    id: string,
    input: {
      name?: string;
      description?: string;
      line_style?: string;
      color?: string;
      is_featured?: boolean;
      location_ids?: string[];
    }
  ): Promise<RouteWithLocations | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;

    if (input.line_style && input.line_style !== "solid" && input.line_style !== "dashed") {
      throw new AppError("line_style must be 'solid' or 'dashed'", 400);
    }

    const now = nowISO();
    await this.repository.updateRoute({
      id: existing.id,
      name: input.name ?? null,
      description: input.description ?? null,
      line_style: input.line_style ?? null,
      color: input.color ?? null,
      is_featured: input.is_featured !== undefined ? (input.is_featured ? 1 : 0) : null,
      updated_at: now,
    });

    if (input.location_ids !== undefined) {
      await this.repository.replaceRouteLocations(existing.id, input.location_ids);
    }

    await this.pool.persist();
    const route = await this.repository.findById(existing.id);
    const locations = await this.repository.findRouteLocations(existing.id);
    return { ...route!, locations };
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing) return false;
    await this.repository.deleteRoute(id);
    await this.pool.persist();
    return true;
  }
}
