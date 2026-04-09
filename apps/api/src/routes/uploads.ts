import type { FastifyInstance, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { getPool, queryOne, runQuery, nowISO } from "../infrastructure/db/helpers.js";
import { AppError } from "../app/errors.js";
import type { LocalFileStorage } from "../infrastructure/storage/localFileStorage.js";
import type { AppConfig } from "../app/config.js";

type UploadFileRow = {
  id: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  sha256_hash: string;
  created_at: string;
};

export const registerUploadRoutes = (
  server: FastifyInstance,
  storage: LocalFileStorage,
  _config: AppConfig
) => {
  // GET /uploads/:id
  server.get<{ Params: { id: string } }>("/uploads/:id", async (request, reply) => {
    const pool = getPool();
    const file = queryOne<UploadFileRow>(pool, `SELECT * FROM upload_file WHERE id = ?`, [request.params.id]);
    if (!file) {
      reply.status(404);
      return { error: "Upload not found" };
    }
    return file;
  });

  // POST /uploads
  server.post("/uploads", async (request: FastifyRequest, reply) => {
    const pool = getPool();

    const data = await request.file();
    if (!data) {
      throw new AppError("No file uploaded", 400);
    }

    const maxBytes = 10 * 1024 * 1024; // 10MB default
    const chunks: Buffer[] = [];

    for await (const chunk of data.file) {
      chunks.push(chunk);
      if (chunks.reduce((acc, c) => acc + c.byteLength, 0) > maxBytes) {
        throw new AppError(`File exceeds maximum size of ${maxBytes} bytes`, 413);
      }
    }

    const buffer = Buffer.concat(chunks);
    const originalFilename = data.filename || data.fieldname;
    const mimeType = data.mimetype || "application/octet-stream";

    const saved = await storage.saveBuffer({ buffer, originalFilename, mimeType });

    const id = randomUUID();
    const now = nowISO();
    runQuery(
      pool,
      `INSERT INTO upload_file (id, storage_key, original_filename, mime_type, byte_size, sha256_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, saved.storageKey, saved.originalFilename, saved.mimeType, saved.byteSize, saved.sha256Hash, now]
    );

    await getPool().persist();

    reply.status(201);
    return {
      id,
      storageKey: saved.storageKey,
      originalFilename: saved.originalFilename,
      mimeType: saved.mimeType,
      byteSize: saved.byteSize,
      sha256Hash: saved.sha256Hash,
      url: saved.url,
      created_at: now,
    };
  });

  // DELETE /uploads/:id
  server.delete<{ Params: { id: string } }>("/uploads/:id", async (request, reply) => {
    const pool = getPool();
    const existing = queryOne<UploadFileRow>(pool, `SELECT id FROM upload_file WHERE id = ?`, [request.params.id]);
    if (!existing) {
      reply.status(404);
      return { error: "Upload not found" };
    }
    runQuery(pool, `DELETE FROM upload_file WHERE id = ?`, [request.params.id]);
    await getPool().persist();
    reply.status(204);
    return;
  });
};
