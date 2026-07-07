import type { FastifyInstance } from 'fastify';
import { AppError } from '../../app/errors.js';
import type { CreateMediaSetInput, MediaSetRow, UpdateMediaSetInput } from './types.js';
import type { MediaImageRow } from '../media-images/types.js';

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
      findMediaImagesByMediaSetId(mediaSetId: string): Promise<{ id: string }[]>;
      reorderMediaImages(input: {
        mediaSetId: string;
        imageIds: string[];
      }): Promise<MediaImageRow[]>;
      countMediaImagesByMediaSetId(mediaSetId: string): Promise<number>;
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

    // BUG-046: empty-string `locationId` previously slipped past the
// `if (input.locationId)` truthiness check (which is falsy for `''`)
// and reached the FK constraint as an empty string, producing a 500.
// Treat empty string as a validation error up front.
if (input.locationId === '') {
  throw new AppError('location_id must not be an empty string', 400);
}
if (input.locationId) {
      const location = await this.repository.findLocationById(input.locationId);
      if (!location) throw new AppError('location_id not found', 400);
    }
    if (input.coverUploadFileId === '') {
      throw new AppError('cover_upload_file_id must not be an empty string', 400);
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
    if (input.locationId === '') {
      throw new AppError('location_id must not be an empty string', 400);
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

  async reorderImages(mediaSetId: string, imageIds: string[]): Promise<MediaImageRow[]> {
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      throw new AppError('imageIds must be a non-empty array', 400);
    }

    const mediaSet = await this.repository.findById(mediaSetId);
    if (!mediaSet) {
      throw Object.assign(new Error('Media set not found'), { statusCode: 404 });
    }

    // No duplicates allowed within the requested order.
    const uniqueIds = new Set(imageIds);
    if (uniqueIds.size !== imageIds.length) {
      throw new AppError('imageIds must not contain duplicates', 400);
    }

    const existingImages = await this.repository.findMediaImagesByMediaSetId(mediaSetId);
    const existingIds = new Set(existingImages.map((img) => img.id));

    // Every requested id must belong to this media set.
    for (const id of imageIds) {
      if (!existingIds.has(id)) {
        throw new AppError(`imageId ${id} does not belong to this media set`, 400);
      }
    }

    // The list must cover every existing image (no missing images allowed).
    if (uniqueIds.size !== existingIds.size) {
      throw new AppError('imageIds must include every image of the media set exactly once', 400);
    }

    return this.repository.reorderMediaImages({ mediaSetId, imageIds });
  }

  async cascadePreview(id: string): Promise<{
    mediaSet: { id: string; title: string };
    willDelete: { mediaImages: number };
  } | null> {
    const mediaSet = await this.repository.findById(id);
    if (!mediaSet) {
      return null;
    }
    const mediaImages = await this.repository.countMediaImagesByMediaSetId(id);
    return {
      mediaSet: { id: mediaSet.id, title: mediaSet.title },
      willDelete: { mediaImages },
    };
  }
}
