import type { FastifyInstance } from 'fastify';
import type { ProjectService } from './service.js';
import type { CreateProjectInput, UpdateProjectInput } from './types.js';

export function registerProjectRoutes(
  server: FastifyInstance,
  service: ProjectService,
) {
  // GET /projects
  server.get('/projects', async (request, reply) => {
    const { project_id, status } = request.query as { project_id?: string; status?: string };

    const projects = await service.findAll({
      projectId: project_id,
      status: status as 'draft' | 'published' | undefined,
    });

    return projects;
  });

  // GET /projects/:id
  server.get<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    const project = await service.findById(request.params.id);
    if (!project) {
      reply.status(404);
      return { error: 'Project not found' };
    }
    return project;
  });

  // POST /projects
  server.post<{ Body: CreateProjectInput }>('/projects', async (request, reply) => {
    const project = await service.create(request.body);
    reply.status(201);
    return project;
  });

  // PUT /projects/:id
  server.put<{ Params: { id: string }; Body: UpdateProjectInput }>('/projects/:id', async (request, reply) => {
    const project = await service.update(request.params.id, request.body);
    if (!project) {
      reply.status(404);
      return { error: 'Project not found' };
    }
    return project;
  });

  // DELETE /projects/:id
  server.delete<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    const deleted = await service.delete(request.params.id);
    if (!deleted) {
      reply.status(404);
      return { error: 'Project not found' };
    }
    reply.status(204);
    return;
  });
}
