import type { FastifyInstance } from 'fastify';

export function registerUploadRoutes(
  server: FastifyInstance,
  service: {
    getUpload(id: string): Promise<{ id: string; storage_key: string; original_filename: string; mime_type: string; byte_size: number; sha256_hash: string; created_at: string } | null>;
    createUpload(request: import('fastify').FastifyRequest): Promise<{ id: string; storageKey: string; originalFilename: string; mimeType: string; byteSize: number; sha256Hash: string; url: string; created_at: string }>;
    deleteUpload(id: string): Promise<void>;
  },
) {
  // GET /uploads
  server.get('/uploads', async () => {
    // Return empty list for now - gallery loads via publicDataReader
    return [];
  });

  // GET /uploads/:id
  server.get<{ Params: { id: string } }>('/uploads/:id', async (request, reply) => {
    const file = await service.getUpload(request.params.id);
    if (!file) {
      reply.status(404);
      return { error: 'Upload not found' };
    }
    return file;
  });

  // POST /uploads
  server.post('/uploads', async (request, reply) => {
    const result = await service.createUpload(request);
    reply.status(201);
    return result;
  });

  // DELETE /uploads/:id
  server.delete<{ Params: { id: string } }>('/uploads/:id', async (request, reply) => {
    const file = await service.getUpload(request.params.id);
    if (!file) {
      reply.status(404);
      return { error: 'Upload not found' };
    }
    await service.deleteUpload(request.params.id);
    reply.status(204);
    return;
  });
}
