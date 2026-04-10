import type { FastifyInstance } from 'fastify';
import { AppError } from '../../app/errors.js';
import type { CreateMediaSetInput, MediaSetRow, UpdateMediaSetInput } from './types.js';
export class MediaSetService {
  constructor(
    private readonly repository: {
      findAll(filters?: { projectId?: string; locationId?: string }): Promise<MediaSetRow[]>;
      findById(id: string): Promise<MediaSetRow | null>;
      findByProjectId(projectId: string): Promise<MediaSetRow[]>;
      findByLocationId(locationId: string): Promise<MediaSetRow[]>;
      upsertMediaSet(input: {
        id?: string | null;
        projectId: string;
        locationId?: string | null;
        type: string;
        title: string;
        description: string;
        coverUploadFileId?: string | null;
        isFeatured: boolean;
      }): Promise<MediaSetRow>;
      deleteMediaSet(id: string): Promise<void>;
      findProjectById(id: string): Promise<{ id: string } | null>;
      findLocationById(id: string): Promise<{ id: string } | null>;
      findUploadFileById(id: string): Promise<{ id: string } | null>;
    },
  ) {}

  async getAll(filters?: { projectId?: string; locationId?: string }) {
    return this.repository.findAll(filters);
  }

  async getById(id: string) {
    return this.repository.findById(id);
  }

  async create(input: CreateMediaSetInput) {
    if (!input.projectId || !input.type || !input.title || !input.description) {
      throw new AppError('project_id, type, title, description are required', 400);
    }
    if (input.type !== 'spin360' && input.type !== 'gallery') {
      throw new AppError("type must be 'spin360' or 'gallery'", 400);
    }

    const project = await this.repository.findProjectById(input.projectId);
    if (!project) throw new AppError('project_id not found', 400);

    if (input.locationId) {
      const location = await this.repository.findLocationById(input.locationId);
      if (!location) throw new AppError('location_id not found', 400);
    }
    if (input.coverUploadFileId) {
      const cover = await this.repository.findUploadFileById(input.coverUploadFileId);
      if (!cover) throw new AppError('cover_upload_file_id not found', 400);
    }

    return this.repository.upsertMediaSet({
      projectId: input.projectId,
      locationId: input.locationId,
      type: input.type,
      title: input.title,
      description: input.description,
      coverUploadFileId: input.coverUploadFileId,
      isFeatured: input.isFeatured ?? false,
    });
  }

  async update(id: string, input: UpdateMediaSetInput) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw Object.assign(new Error('Media set not found'), { statusCode: 404 });
    }

    if (input.type && input.type !== 'spin360' && input.type !== 'gallery') {
      throw new AppError("type must be 'spin360' or 'gallery'", 400);
    }
    if (input.locationId) {
      const location = await this.repository.findLocationById(input.locationId);
      if (!location) throw new AppError('location_id not found', 400);
    }
    if (input.coverUploadFileId) {
      const cover = await this.repository.findUploadFileById(input.coverUploadFileId);
      if (!cover) throw new AppError('cover_upload_file_id not found', 400);
    }

    return this.repository.upsertMediaSet({
      id,
      projectId: existing.project_id,
      locationId: input.locationId,
      type: input.type ?? existing.type,
      title: input.title ?? existing.title,
      description: input.description ?? existing.description,
      coverUploadFileId: input.coverUploadFileId,
      isFeatured: input.isFeatured ?? existing.is_featured === 1,
    });
  }

  async delete(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw Object.assign(new Error('Media set not found'), { statusCode: 404 });
    }
    await this.repository.deleteMediaSet(id);
  }
}
