import type { FastifyInstance } from "fastify";

export function registerRouteRoutes(
  server: FastifyInstance,
  service: {
    findAll(projectId?: string): Promise<unknown[]>;
    findById(id: string): Promise<unknown>;
    create(input: {
      project_id: string;
      name: string;
      description: string;
      line_style: string;
      color: string;
      is_featured?: boolean;
      location_ids?: string[];
    }): Promise<unknown>;
    update(
      id: string,
      input: {
        name?: string;
        description?: string;
        line_style?: string;
        color?: string;
        is_featured?: boolean;
        location_ids?: string[];
      }
    ): Promise<unknown>;
    delete(id: string): Promise<boolean>;
  }
) {
  // GET /routes
  server.get("/routes", async (request) => {
    const { project_id } = request.query as { project_id?: string };
    return service.findAll(project_id);
  });

  // GET /routes/:id
  server.get<{ Params: { id: string } }>("/routes/:id", async (request, reply) => {
    const route = await service.findById(request.params.id);
    if (!route) {
      reply.status(404);
      return { error: "Route not found" };
    }
    return route;
  });

  // POST /routes
  server.post<{
    Body: {
      project_id: string;
      name: string;
      description: string;
      line_style: string;
      color: string;
      is_featured?: boolean;
      location_ids?: string[];
    };
  }>("/routes", async (request, reply) => {
    const route = await service.create(request.body);
    reply.status(201);
    return route;
  });

  // PUT /routes/:id
  server.put<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      line_style?: string;
      color?: string;
      is_featured?: boolean;
      location_ids?: string[];
    };
  }>("/routes/:id", async (request, reply) => {
    const route = await service.update(request.params.id, request.body);
    if (!route) {
      reply.status(404);
      return { error: "Route not found" };
    }
    return route;
  });

  // DELETE /routes/:id
  server.delete<{ Params: { id: string } }>("/routes/:id", async (request, reply) => {
    const deleted = await service.delete(request.params.id);
    if (!deleted) {
      reply.status(404);
      return { error: "Route not found" };
    }
    reply.status(204);
    return;
  });
}
