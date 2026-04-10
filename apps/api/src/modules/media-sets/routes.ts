import type { FastifyInstance } from 'fastify';
import type { MediaSetService } from './service.js';

export function registerMediaSetRoutes(server: FastifyInstance, service: MediaSetService) {
  // GET /media-sets
  server.get('/media-sets', async (request) => {
    const { project_id, location_id } = request.query as { project_id?: string; location_id?: string };
    return service.getAll({ projectId: project_id, locationId: location_id });
  });

  // GET /media-sets/:id
  server.get<{ Params: { id: string } }>('/media-sets/:id', async (request, reply) => {
    const mediaSet = await service.getById(request.params.id);
    if (!mediaSet) {
      reply.status(404);
      return { error: 'Media set not found' };
    }
    return mediaSet;
  });

  // POST /media-sets
  server.post<{
    Body: {
      project_id: string;
      location_id?: string;
      type: string;
      title: string;
      description: string;
      cover_upload_file_id?: string;
      is_featured?: boolean;
    };
  }>('/media-sets', async (request, reply) => {
    const result = await service.create({
      projectId: request.body.project_id,
      locationId: request.body.location_id,
      type: request.body.type as 'spin360' | 'gallery',
      title: request.body.title,
      description: request.body.description,
      coverUploadFileId: request.body.cover_upload_file_id,
      isFeatured: request.body.is_featured,
    });
    await reply.status(201);
    return result;
  });

  // PUT /media-sets/:id
  server.put<{
    Params: { id: string };
    Body: {
      location_id?: string;
      type?: string;
      title?: string;
      description?: string;
      cover_upload_file_id?: string;
      is_featured?: boolean;
    };
  }>('/media-sets/:id', async (request, reply) => {
    try {
      const result = await service.update(request.params.id, {
        locationId: request.body.location_id,
        type: request.body.type as 'spin360' | 'gallery' | undefined,
        title: request.body.title,
        description: request.body.description,
        coverUploadFileId: request.body.cover_upload_file_id,
        isFeatured: request.body.is_featured,
      });
      return result;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
        reply.status(404);
        return { error: 'Media set not found' };
      }
      throw err;
    }
  });

  // DELETE /media-sets/:id
  server.delete<{ Params: { id: string } }>('/media-sets/:id', async (request, reply) => {
    try {
      await service.delete(request.params.id);
      await reply.status(204);
      return;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
        reply.status(404);
        return { error: 'Media set not found' };
      }
      throw err;
    }
  });
}
