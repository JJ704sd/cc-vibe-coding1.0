import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { nowISO } from '../../infrastructure/db/helpers.js';
import { AppError } from '../../app/errors.js';
import type { LocalFileStorage } from '../../infrastructure/storage/localFileStorage.js';
import type { UploadFileRow } from './types.js';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export class UploadService {
  constructor(
    private readonly repository: {
      findById(id: string): Promise<{ id: string; storage_key: string; original_filename: string; mime_type: string; byte_size: number; sha256_hash: string; created_at: string } | null>;
      findByIds(ids: string[]): Promise<{ id: string; storage_key: string; original_filename: string; mime_type: string; byte_size: number; sha256_hash: string; created_at: string }[]>;
      insertUploadFile(input: { id: string; storageKey: string; originalFilename: string; mimeType: string; byteSize: number; sha256Hash: string; createdAt: string }): Promise<void>;
      deleteUploadFile(id: string): Promise<void>;
    },
    private readonly storage: LocalFileStorage,
  ) {}

  async getUpload(id: string): Promise<UploadFileRow | null> {
    return await this.repository.findById(id);
  }

  async createUpload(request: FastifyRequest): Promise<{
    id: string;
    storageKey: string;
    originalFilename: string;
    mimeType: string;
    byteSize: number;
    sha256Hash: string;
    url: string;
    created_at: string;
  }> {
    const data = await request.file();
    if (!data) {
      throw new AppError('No file uploaded', 400);
    }

    const chunks: Buffer[] = [];
    let totalBytes = 0;

    for await (const chunk of data.file) {
      totalBytes += chunk.byteLength;
      if (totalBytes > MAX_BYTES) {
        throw new AppError(`File exceeds maximum size of ${MAX_BYTES} bytes`, 413);
      }
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    const originalFilename = data.filename || data.fieldname;
    const mimeType = data.mimetype || 'application/octet-stream';

    const saved = await this.storage.saveBuffer({ buffer, originalFilename, mimeType });

    const id = randomUUID();
    const createdAt = nowISO();

    await this.repository.insertUploadFile({
      id,
      storageKey: saved.storageKey,
      originalFilename: saved.originalFilename,
      mimeType: saved.mimeType,
      byteSize: saved.byteSize,
      sha256Hash: saved.sha256Hash,
      createdAt,
    });

    return {
      id,
      storageKey: saved.storageKey,
      originalFilename: saved.originalFilename,
      mimeType: saved.mimeType,
      byteSize: saved.byteSize,
      sha256Hash: saved.sha256Hash,
      url: saved.url,
      created_at: createdAt,
    };
  }

  async deleteUpload(id: string): Promise<void> {
    await this.repository.deleteUploadFile(id);
  }
}
