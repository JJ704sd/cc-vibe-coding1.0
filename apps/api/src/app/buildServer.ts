import Fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { loadConfig } from "./config.js";
import { createLocalFileStorage } from "../infrastructure/storage/localFileStorage.js";
import { registerProjectRoutes } from "../routes/projects.js";
import { registerLocationRoutes } from "../routes/locations.js";
import { registerMediaSetRoutes } from "../routes/mediaSets.js";
import { registerMediaImageRoutes } from "../routes/mediaImages.js";
import { registerRouteRoutes } from "../routes/routes.js";
import { registerUploadRoutes } from "../routes/uploads.js";
import { registerPublicRoutes } from "../routes/public.js";
import { registerAuthRoutes } from "../modules/auth/routes.js";
import type { LocalFileStorage } from "../infrastructure/storage/localFileStorage.js";
import { AppError } from "./errors.js";
import { mkdir } from "node:fs/promises";
import { resolve, isAbsolute } from "node:path";

export const buildServer = async (params?: {
  authService?: {
    login(data: { username: string; password: string; ipAddress: string | null; userAgent: string | null }): Promise<{ sessionToken: string; user: { id: string; username: string; role: 'admin' } }>;
    getSession(data: { sessionToken: string }): Promise<{ user: { id: string; username: string; role: 'admin' } } | null>;
    logout(data: { sessionToken: string }): Promise<void>;
  };
  cookieSecure?: boolean;
}): Promise<FastifyInstance> => {
  const server = Fastify();

  // Register cookie plugin
  await server.register(fastifyCookie);

  // Load config
  const config = loadConfig();

  // Convert storageDir to absolute path if relative
  const storageDir = isAbsolute(config.storageDir)
    ? config.storageDir
    : resolve(process.cwd(), config.storageDir);

  // Ensure storage dir exists
  await mkdir(storageDir, { recursive: true });

  // Create storage
  const storage = createLocalFileStorage({
    rootDir: storageDir,
    publicBaseUrl: config.publicBaseUrl,
  });

  // Register multipart for file uploads
  await server.register(fastifyMultipart, {
    limits: { fileSize: config.maxUploadBytes },
  });

  // Register static file serving for uploaded files
  await server.register(fastifyStatic, {
    root: storageDir,
    prefix: "/uploads/",
    decorateReply: false,
  });

  // Health check
  server.get("/health", async () => ({ status: "ok" }));

  // Register routes
  registerProjectRoutes(server);
  registerLocationRoutes(server);
  registerMediaSetRoutes(server);
  registerMediaImageRoutes(server);
  registerRouteRoutes(server);
  registerUploadRoutes(server, storage, config);
  registerPublicRoutes(server, storage);

  // Register auth routes if authService is provided
  if (params?.authService) {
    await registerAuthRoutes(server, {
      authService: params.authService,
      cookieSecure: params.cookieSecure ?? config.cookieSecure,
    });
  }

  // Global error handler
  server.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({ error: error.message });
      return;
    }
    // Fastify validation errors
    if (typeof error === "object" && error !== null && "validation" in error) {
      reply.status(400).send({ error: String((error as { message?: unknown }).message ?? "Validation error") });
      return;
    }
    request.log.error(error);
    reply.status(500).send({ error: "Internal server error" });
  });

  return server;
};
