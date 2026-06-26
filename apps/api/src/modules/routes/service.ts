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

    // Batch-verify every requested location in a single SELECT. If the count
    // doesn't match, at least one id is missing or doesn't belong to the
    // project, but we don't reveal which one to avoid leaking existence.
    const locationIds = input.location_ids ?? [];
    if (locationIds.length > 0) {
      const found = await this.repository.findLocationsByIdsAndProject(locationIds, input.project_id);
      if (found.length !== locationIds.length) {
        throw new AppError("one or more location_ids are missing or do not belong to project", 400);
      }
    }

    const id = randomUUID();
    const now = nowISO();

    return this.repository.createRouteWithLocations({
      id,
      project_id: input.project_id,
      name: input.name,
      description: input.description,
      line_style: input.line_style,
      color: input.color,
      is_featured: input.is_featured ? 1 : 0,
      created_at: now,
      updated_at: now,
      location_ids: locationIds,
    });
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
    return this.repository.updateRouteWithLocations({
      id: existing.id,
      name: input.name ?? null,
      description: input.description ?? null,
      line_style: input.line_style ?? null,
      color: input.color ?? null,
      is_featured: input.is_featured !== undefined ? (input.is_featured ? 1 : 0) : null,
      updated_at: now,
      // null = leave location links untouched; an array (possibly empty) =
      // atomically swap the link set inside the same transaction.
      location_ids: input.location_ids !== undefined ? input.location_ids : null,
    });
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing) return false;
    await this.repository.deleteRoute(id);
    return true;
  }

  async cascadePreview(id: string): Promise<{
    route: { id: string; name: string };
    willDelete: { routeLocations: number };
  } | null> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return null;
    }
    const routeLocations = await this.repository.countRouteLocationsByRouteId(id);
    return {
      route: { id: existing.id, name: existing.name },
      willDelete: { routeLocations },
    };
  }
}
