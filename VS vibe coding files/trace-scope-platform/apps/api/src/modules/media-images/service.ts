import { randomUUID } from 'node:crypto';
import { nowISO } from '../../infrastructure/db/helpers.js';
import { AppError } from '../../app/errors.js';
import type { MediaImageInput, MediaImageRow, MediaImageUpdate } from './types.js';
import { createMediaImageRepository } from './repository.js';

export type { MediaImageRow };

export class MediaImageService {
  private readonly repository = createMediaImageRepository();

  async findAll(mediaSetId?: string): Promise<MediaImageRow[]> {
    return this.repository.findAll(mediaSetId);
  }

  async findById(id: string): Promise<MediaImageRow | null> {
    return this.repository.findById(id);
  }

  async create(input: MediaImageInput): Promise<MediaImageRow> {
    const { media_set_id, upload_file_id, alt_text, caption, sort_order, latitude, longitude } = input;

    if (!media_set_id || !upload_file_id || !alt_text || caption === undefined || sort_order === undefined) {
      throw new AppError('media_set_id, upload_file_id, alt_text, caption, sort_order are required', 400);
    }
    if (sort_order < 0) throw new AppError('sort_order must be >= 0', 400);
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      throw new AppError('latitude must be between -90 and 90', 400);
    }
    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      throw new AppError('longitude must be between -180 and 180', 400);
    }

    const [mediaSet, uploadFile] = await Promise.all([
      this.repository.findMediaSetById(media_set_id),
      this.repository.findUploadFileById(upload_file_id),
    ]);
    if (!mediaSet) throw new AppError('media_set_id not found', 400);
    if (!uploadFile) throw new AppError('upload_file_id not found', 400);

    const existingOrder = await this.repository.findBySortOrder(media_set_id, sort_order);
    if (existingOrder) throw new AppError('sort_order already in use for this media_set', 409);

    const id = randomUUID();
    const now = nowISO();

    const row = await this.repository.upsertMediaImage({
      id,
      media_set_id,
      upload_file_id,
      alt_text,
      caption,
      sort_order,
      latitude: latitude as number | null,
      longitude: longitude as number | null,
      now,
    });

    return row;
  }

  async update(id: string, input: MediaImageUpdate): Promise<MediaImageRow> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw Object.assign(new AppError('Media image not found', 404), { code: 'NOT_FOUND' });
    }

    const { sort_order, latitude, longitude } = input;
    if (sort_order !== undefined && sort_order < 0) {
      throw new AppError('sort_order must be >= 0', 400);
    }
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      throw new AppError('latitude must be between -90 and 90', 400);
    }
    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      throw new AppError('longitude must be between -180 and 180', 400);
    }

    if (sort_order !== undefined && sort_order !== existing.sort_order) {
      const conflict = await this.repository.findBySortOrder(existing.media_set_id, sort_order);
      if (conflict) throw new AppError('sort_order already in use for this media_set', 409);
    }

    const now = nowISO();
    const row = await this.repository.upsertMediaImage({
      id,
      media_set_id: existing.media_set_id,
      upload_file_id: existing.upload_file_id,
      alt_text: input.alt_text ?? existing.alt_text,
      caption: input.caption ?? existing.caption,
      sort_order: sort_order ?? existing.sort_order,
      latitude: (latitude ?? existing.latitude) as number | null,
      longitude: (longitude ?? existing.longitude) as number | null,
      now,
    });

    return row;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw Object.assign(new AppError('Media image not found', 404), { code: 'NOT_FOUND' });
    }
    await this.repository.deleteMediaImage(id);
  }
}
