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

    // Check slug uniqueness
    const existing = await this.repository.findBySlug(slug);
    if (existing) {
      throw Object.assign(new Error('Slug already in use'), {
        code: 'SLUG_CONFLICT',
        statusCode: 409,
      });
    }

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

    const newSlug = input.slug ?? existing.slug;
    if (input.slug && input.slug !== existing.slug) {
      const conflict = await this.repository.findBySlug(input.slug);
      if (conflict) {
        throw Object.assign(new Error('Slug already in use'), {
          code: 'SLUG_CONFLICT',
          statusCode: 409,
        });
      }
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return this.repository.updateProject(id, {
      title: input.title,
      slug: input.slug ? newSlug : undefined,
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
}
