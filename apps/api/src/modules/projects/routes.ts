import type { FastifyInstance } from 'fastify';
import type { ProjectService } from './service.js';
import type { CreateProjectInput, UpdateProjectInput } from './types.js';

export function registerProjectRoutes(
  server: FastifyInstance,
  service: ProjectService,
) {
  // GET /api/projects
  server.get('/api/projects', async (request, reply) => {
    const { project_id, status } = request.query as { project_id?: string; status?: string };

    const projects = await service.findAll({
      projectId: project_id,
      status: status as 'draft' | 'published' | undefined,
    });

    return projects;
  });

  server.get<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const project = await service.findById(request.params.id);
    if (!project) {
      reply.status(404);
      return { error: 'Project not found' };
    }
    return project;
  });

  server.post<{ Body: CreateProjectInput }>('/api/projects', async (request, reply) => {
    const project = await service.create(request.body);
    reply.status(201);
    return project;
  });

  server.put<{ Params: { id: string }; Body: UpdateProjectInput }>('/api/projects/:id', async (request, reply) => {
    const project = await service.update(request.params.id, request.body);
    if (!project) {
      reply.status(404);
      return { error: 'Project not found' };
    }
    return project;
  });

  server.delete<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const deleted = await service.delete(request.params.id);
    if (!deleted) {
      reply.status(404);
      return { error: 'Project not found' };
    }
    reply.status(204);
    return;
  });
}
