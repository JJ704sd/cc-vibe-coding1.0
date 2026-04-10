import type { CreateLocationInput, UpdateLocationInput, LocationRow } from "./types.js";

export class LocationService {
  constructor(
    private readonly repository: {
      findAll(projectId?: string): Promise<LocationRow[]>;
      findById(id: string): Promise<LocationRow | null>;
      findByProjectId(projectId: string): Promise<LocationRow[]>;
      insertLocation(input: CreateLocationInput, slug: string): Promise<LocationRow>;
      updateLocation(id: string, input: UpdateLocationInput, newSlug: string): Promise<LocationRow>;
      deleteLocation(id: string): Promise<void>;
      findProjectById(projectId: string): Promise<{ id: string } | null>;
      findBySlugInProject(projectId: string, slug: string, excludeId?: string): Promise<{ id: string } | null>;
    }
  ) {}

  private slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200);
  }

  private validateCoordinates(latitude: number, longitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw Object.assign(new Error("latitude must be between -90 and 90"), { statusCode: 400 });
    }
    if (longitude < -180 || longitude > 180) {
      throw Object.assign(new Error("longitude must be between -180 and 180"), { statusCode: 400 });
    }
  }

  async getAll(projectId?: string): Promise<LocationRow[]> {
    return this.repository.findAll(projectId);
  }

  async getById(id: string): Promise<LocationRow | null> {
    return this.repository.findById(id);
  }

  async create(input: CreateLocationInput): Promise<LocationRow> {
    if (!input.project_id || !input.name || !input.description || input.latitude === undefined || input.longitude === undefined || !input.address_text) {
      throw Object.assign(new Error("project_id, name, description, latitude, longitude, address_text are required"), { statusCode: 400 });
    }

    this.validateCoordinates(input.latitude, input.longitude);

    if (input.visit_order !== undefined && input.visit_order < 0) {
      throw Object.assign(new Error("visit_order must be >= 0"), { statusCode: 400 });
    }

    const project = await this.repository.findProjectById(input.project_id);
    if (!project) {
      throw Object.assign(new Error("project_id not found"), { statusCode: 400 });
    }

    const slug = input.slug ?? this.slugify(input.name);
    const conflict = await this.repository.findBySlugInProject(input.project_id, slug);
    if (conflict) {
      throw Object.assign(new Error("Slug already in use for this project"), { statusCode: 409 });
    }

    return this.repository.insertLocation(input, slug);
  }

  async update(id: string, input: UpdateLocationInput): Promise<LocationRow | null> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return null;
    }

    if (input.latitude !== undefined) {
      this.validateCoordinates(input.latitude, input.longitude ?? Number(existing.latitude));
    }
    if (input.longitude !== undefined) {
      this.validateCoordinates(input.latitude ?? Number(existing.latitude), input.longitude);
    }
    if (input.visit_order !== undefined && input.visit_order < 0) {
      throw Object.assign(new Error("visit_order must be >= 0"), { statusCode: 400 });
    }

    const newSlug = input.slug ?? existing.slug;
    if (input.slug && input.slug !== existing.slug) {
      const conflict = await this.repository.findBySlugInProject(existing.project_id, input.slug, existing.id);
      if (conflict) {
        throw Object.assign(new Error("Slug already in use for this project"), { statusCode: 409 });
      }
    }

    return this.repository.updateLocation(existing.id, input, newSlug);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return false;
    }
    await this.repository.deleteLocation(id);
    return true;
  }
}
