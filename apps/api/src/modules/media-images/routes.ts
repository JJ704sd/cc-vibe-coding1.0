import type { FastifyInstance } from 'fastify';
import type { MediaImageService } from './service.js';

export function registerMediaImageRoutes(server: FastifyInstance, service: MediaImageService) {
  // GET /media-images
  server.get('/media-images', async (request) => {
    const { media_set_id } = request.query as { media_set_id?: string };
    return service.findAll(media_set_id);
  });

  // GET /media-images/:id
  server.get<{ Params: { id: string } }>('/media-images/:id', async (request, reply) => {
    const image = await service.findById(request.params.id);
    if (!image) {
      reply.status(404);
      return { error: 'Media image not found' };
    }
    return image;
  });

  // POST /media-images
  server.post<{ Body: Parameters<MediaImageService['create']>[0] }>(
    '/media-images',
    async (request, reply) => {
      const row = await service.create(request.body);
      reply.status(201);
      return row;
    },
  );

  // PUT /media-images/:id
  server.put<{ Params: { id: string }; Body: Parameters<MediaImageService['update']>[1] }>(
    '/media-images/:id',
    async (request, reply) => {
      try {
        return await service.update(request.params.id, request.body);
      } catch (err: unknown) {
        if ((err as { code?: string }).code === 'NOT_FOUND') {
          reply.status(404);
          return { error: 'Media image not found' };
        }
        throw err;
      }
    },
  );

  // DELETE /media-images/:id
  server.delete<{ Params: { id: string } }>('/media-images/:id', async (request, reply) => {
    try {
      await service.delete(request.params.id);
      reply.status(204);
      return;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'NOT_FOUND') {
        reply.status(404);
        return { error: 'Media image not found' };
      }
      throw err;
    }
  });
}
