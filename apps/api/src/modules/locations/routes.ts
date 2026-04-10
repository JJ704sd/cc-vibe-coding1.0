import type { FastifyInstance } from "fastify";
import { createLocationRepository } from "./repository.js";
import { LocationService } from "./service.js";

export function registerLocationRoutes(server: FastifyInstance) {
  const repository = createLocationRepository();
  const service = new LocationService(repository);

  // GET /locations
  server.get("/locations", async (request) => {
    const { project_id } = request.query as { project_id?: string };
    return service.getAll(project_id);
  });

  // GET /locations/:id
  server.get<{ Params: { id: string } }>("/locations/:id", async (request, reply) => {
    const location = await service.getById(request.params.id);
    if (!location) {
      reply.status(404);
      return { error: "Location not found" };
    }
    return location;
  });

  // POST /locations
  server.post<{ Body: import("./types.js").CreateLocationInput }>("/locations", async (request, reply) => {
    const location = await service.create(request.body);
    reply.status(201);
    return location;
  });

  // PUT /locations/:id
  server.put<{ Params: { id: string }; Body: import("./types.js").UpdateLocationInput }>(
    "/locations/:id",
    async (request, reply) => {
      const location = await service.update(request.params.id, request.body);
      if (!location) {
        reply.status(404);
        return { error: "Location not found" };
      }
      return location;
    }
  );

  // DELETE /locations/:id
  server.delete<{ Params: { id: string } }>("/locations/:id", async (request, reply) => {
    const deleted = await service.delete(request.params.id);
    if (!deleted) {
      reply.status(404);
      return { error: "Location not found" };
    }
    reply.status(204);
    return;
  });
}
