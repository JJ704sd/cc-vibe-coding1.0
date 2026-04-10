import type { FastifyInstance } from "fastify";
import { PublicService } from "./service.js";
import { AppError } from "../../app/errors.js";

export function registerPublicRoutes(server: FastifyInstance, service: PublicService) {
  // GET /api/public/projects - list all published projects
  server.get("/api/public/projects", async () => {
    return service.listProjects();
  });

  // GET /api/public/projects/:projectIdOrSlug - get published project detail
  server.get<{ Params: { projectIdOrSlug: string } }>(
    "/api/public/projects/:projectIdOrSlug",
    async (request, reply) => {
      const { projectIdOrSlug } = request.params;
      const result = await service.getProjectDetail(projectIdOrSlug);
      return result;
    }
  );

  // GET /api/public/media-sets/:mediaSetId - get published media set with images
  server.get<{ Params: { mediaSetId: string } }>(
    "/api/public/media-sets/:mediaSetId",
    async (request, reply) => {
      const { mediaSetId } = request.params;
      return service.getMediaSet(mediaSetId);
    }
  );

  // GET /api/public/uploads/:fileId - serve uploaded file if reachable from published content
  server.get<{ Params: { fileId: string } }>(
    "/api/public/uploads/:fileId",
    async (request, reply) => {
      const { fileId } = request.params;

      const fileResult = await service.getReadableFile(fileId);
      if (!fileResult) {
        throw new AppError("File not found", 404);
      }

      reply.header("Content-Type", fileResult.mimeType);
      reply.header("Cache-Control", "public, max-age=300");
      return reply.send(fileResult.stream);
    }
  );

  // GET /api/public/map-relationship - get source data for map visualization
  server.get("/api/public/map-relationship", async () => {
    return service.getMapRelationship();
  });
}
