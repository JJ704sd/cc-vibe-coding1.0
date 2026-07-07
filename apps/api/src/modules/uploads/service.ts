import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { nowISO } from '../../infrastructure/db/helpers.js';
import { AppError } from '../../app/errors.js';
import type { LocalFileStorage } from '../../infrastructure/storage/localFileStorage.js';
import type { UploadFileRow } from './types.js';

export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MiB

export class UploadService {
  // BUG-021: maxBytes used to be a module-level constant hard-coded to
  // 10 MiB, ignoring config.maxUploadBytes. Now it's an instance field
  // injected by buildServer (from config.ts) so operators can raise
  // the upload limit via MAX_UPLOAD_BYTES env var without a code edit.
  private readonly maxBytes: number;

  constructor(
    private readonly repository: {
      findById(id: string): Promise<{ id: string; storage_key: string; original_filename: string; mime_type: string; byte_size: number; sha256_hash: string; created_at: string } | null>;
      findByIds(ids: string[]): Promise<{ id: string; storage_key: string; original_filename: string; mime_type: string; byte_size: number; sha256_hash: string; created_at: string }[]>;
      insertUploadFile(input: { id: string; storageKey: string; originalFilename: string; mimeType: string; byteSize: number; sha256Hash: string; createdAt: string }): Promise<void>;
      deleteUploadFile(id: string): Promise<void>;
      countReferences(id: string): Promise<number>;
    },
    private readonly storage: LocalFileStorage,
    maxBytes: number = DEFAULT_MAX_UPLOAD_BYTES,
  ) {
    this.maxBytes = maxBytes;
  }

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
      if (totalBytes > this.maxBytes) {
        throw new AppError(`File exceeds maximum size of ${this.maxBytes} bytes`, 413);
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
    const file = await this.repository.findById(id);
    if (!file) {
      // Already gone; nothing to do.
      return;
    }

    // Reject the delete if any row still references the file. Without this
    // check the DB DELETE below would fail with a FK violation after the
    // file on disk was already removed, leaving an orphan row pointing at a
    // missing blob.
    const references = await this.repository.countReferences(id);
    if (references > 0) {
      throw new AppError(
        `Cannot delete upload ${id}: still referenced by ${references} row(s)`,
        409,
      );
    }

    // Delete the DB row first, then the file. If the disk delete fails the
    // row is already gone, but the worst case is a stale blob that an
    // operator can prune manually — never an orphan DB row pointing at a
    // missing file.
    await this.repository.deleteUploadFile(id);
    await this.storage.deleteFile(file.storage_key);
  }
}
