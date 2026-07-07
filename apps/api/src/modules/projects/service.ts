import { randomUUID } from 'node:crypto';
import type { Project, CreateProjectInput, UpdateProjectInput, FindProjectsOptions } from './types.js';

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);

export class ProjectService {
  constructor(
    private readonly repository: {
      findAll(options?: FindProjectsOptions): Promise<Project[]>;
      findById(id: string): Promise<Project | null>;
      findBySlug(slug: string): Promise<Project | null>;
      upsertProject(input: CreateProjectInput & { id: string; slug: string; now: string }): Promise<Project>;
      updateProject(id: string, input: { title?: string; slug?: string; summary?: string; description?: string; status?: string; coverUploadFileId?: string; tags?: string[]; now: string }): Promise<Project | null>;
      deleteProject(id: string): Promise<void>;
      findCoverFile(id: string): Promise<{ id: string } | null>;
      countLocationsByProjectId(projectId: string): Promise<number>;
      countMediaSetsByProjectId(projectId: string): Promise<number>;
      countMediaImagesByProjectId(projectId: string): Promise<number>;
      countRoutesByProjectId(projectId: string): Promise<number>;
      countRouteLocationsByProjectId(projectId: string): Promise<number>;
    },
  ) {}

  async findAll(options: FindProjectsOptions = {}): Promise<Project[]> {
    if (options.status && options.status !== 'draft' && options.status !== 'published') {
      throw Object.assign(new Error("Invalid status. Must be 'draft' or 'published'"), {
        code: 'INVALID_STATUS',
        statusCode: 400,
      });
    }
    return this.repository.findAll(options);
  }

  async findById(id: string): Promise<Project | null> {
    return this.repository.findById(id);
  }

  async create(input: CreateProjectInput): Promise<Project> {
    if (!input.title || !input.summary || !input.description || !input.status) {
      throw Object.assign(new Error('title, summary, description, status are required'), {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }
    if (input.status !== 'draft' && input.status !== 'published') {
      throw Object.assign(new Error("status must be 'draft' or 'published'"), {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    if (input.coverUploadFileId) {
      const cover = await this.repository.findCoverFile(input.coverUploadFileId);
      if (!cover) {
        throw Object.assign(new Error('cover_upload_file_id not found'), {
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        });
      }
    }

    const id = randomUUID();
    const slug = input.slug ?? slugify(input.title);

    // BUG-045: skip the pre-flight findBySlug check entirely — it had
    // a TOCTOU race window where two concurrent POSTs with the same
    // slug both passed the check, then both called INSERT and the
    // second one bubbled a UNIQUE-key violation up as a 500. Now we
    // rely on the UNIQUE KEY declared on project.slug and translate
    // the resulting ER_DUP_ENTRY into a 409 in the repository layer.
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return this.repository.upsertProject({ ...input, id, slug, now });
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return null;
    }

    if (input.status && input.status !== 'draft' && input.status !== 'published') {
      throw Object.assign(new Error("status must be 'draft' or 'published'"), {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    if (input.coverUploadFileId) {
      const cover = await this.repository.findCoverFile(input.coverUploadFileId);
      if (!cover) {
        throw Object.assign(new Error('cover_upload_file_id not found'), {
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        });
      }
    }

    // BUG-045 (update path): same TOCTOU race for slug changes — rely on
    // the UNIQUE KEY constraint and let the repository translate the
    // duplicate-key error into a 409 instead of doing a pre-flight
    // findBySlug that two concurrent UPDATEs could both pass.
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return this.repository.updateProject(id, {
      title: input.title,
      slug: input.slug ?? undefined,
      summary: input.summary,
      description: input.description,
      status: input.status,
      coverUploadFileId: input.coverUploadFileId,
      tags: input.tags,
      now,
    });
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return false;
    }
    await this.repository.deleteProject(id);
    return true;
  }

  async cascadePreview(id: string): Promise<{
    project: { id: string; title: string };
    willDelete: {
      locations: number;
      mediaSets: number;
      mediaImages: number;
      routes: number;
      routeLocations: number;
    };
  } | null> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return null;
    }
    const [locations, mediaSets, mediaImages, routes, routeLocations] = await Promise.all([
      this.repository.countLocationsByProjectId(id),
      this.repository.countMediaSetsByProjectId(id),
      this.repository.countMediaImagesByProjectId(id),
      this.repository.countRoutesByProjectId(id),
      this.repository.countRouteLocationsByProjectId(id),
    ]);
    return {
      project: { id: existing.id, title: existing.title },
      willDelete: { locations, mediaSets, mediaImages, routes, routeLocations },
    };
  }
}
