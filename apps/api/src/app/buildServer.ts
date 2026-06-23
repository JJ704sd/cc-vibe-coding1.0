import Fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import { loadConfig } from "./config.js";
import { createLocalFileStorage } from "../infrastructure/storage/localFileStorage.js";
import { createProjectRepository } from "../modules/projects/repository.js";
import { ProjectService } from "../modules/projects/service.js";
import { registerProjectRoutes } from "../modules/projects/routes.js";

import { registerLocationRoutes } from "../modules/locations/routes.js";

import { createMediaSetRepository } from "../modules/media-sets/repository.js";
import { MediaSetService } from "../modules/media-sets/service.js";
import { registerMediaSetRoutes } from "../modules/media-sets/routes.js";

import { createMediaImageRepository } from "../modules/media-images/repository.js";
import { MediaImageService } from "../modules/media-images/service.js";
import { registerMediaImageRoutes } from "../modules/media-images/routes.js";

import { createRouteRepository } from "../modules/routes/repository.js";
import { RouteService } from "../modules/routes/service.js";
import { registerRouteRoutes } from "../modules/routes/routes.js";

import { createUploadRepository } from "../modules/uploads/repository.js";
import { UploadService } from "../modules/uploads/service.js";
import { registerUploadRoutes } from "../modules/uploads/routes.js";

import { createPublicRepository } from "../modules/public/repository.js";
import { PublicService } from "../modules/public/service.js";
import { registerPublicRoutes } from "../modules/public/routes.js";

import { registerAuthRoutes, LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS } from "../modules/auth/routes.js";
import { createRequireAdminSession, type AdminAuthService } from "../modules/auth/requireAdminSession.js";
import { registerSystemRoutes } from "../modules/system/routes.js";
import type { LocalFileStorage } from "../infrastructure/storage/localFileStorage.js";
import { AppError } from "./errors.js";
import { mkdir } from "node:fs/promises";
import { resolve, isAbsolute } from "node:path";

export const buildServer = async (input?: {
  authService?: AdminAuthService;
  cookieSecure?: boolean;
  logLevel?: string;
  bodyLimitBytes?: number;
  trustProxy?: boolean;
  corsOrigins?: string[];
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  systemHealthService?: {
    live(): { status: string; checkedAt: string; uptimeSeconds: number };
    ready(): Promise<{ status: string; checkedAt: string; checks: { database: string; storage: string } }>;
  };
}):
 Promise<FastifyInstance> => {
  const server = Fastify({
    trustProxy: input?.trustProxy,
    bodyLimit: input?.bodyLimitBytes,
    logger: input?.logLevel ? { level: input.logLevel } : false,
  });

  // Register hardening plugins
  await server.register(fastifyHelmet, { global: true, contentSecurityPolicy: false });

  if (input?.corsOrigins?.length) {
    await server.register(fastifyCors, {
      origin: input.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    });
  }

  if (input?.rateLimitMax != null && input?.rateLimitWindowMs != null) {
    await server.register(fastifyRateLimit, {
      max: input.rateLimitMax,
      timeWindow: input.rateLimitWindowMs,
    });
  }

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

  // Health check
  server.get("/health", async () => ({ status: "ok" }));

  // System health routes
  if (input?.systemHealthService) {
    server.register(registerSystemRoutes, { systemHealthService: input.systemHealthService });
  }

  // Register routes
  const projectRepo = createProjectRepository();
  const projectService = new ProjectService(projectRepo);

  const mediaSetRepo = createMediaSetRepository();
  const mediaSetService = new MediaSetService(mediaSetRepo);

  const mediaImageRepo = createMediaImageRepository();
  const mediaImageService = new MediaImageService();

  const routeRepo = createRouteRepository();
  const routeService = new RouteService(routeRepo);

  const publicRepo = createPublicRepository();
  const publicService = new PublicService(publicRepo, storage);

  const uploadRepo = createUploadRepository();
  const uploadService = new UploadService(uploadRepo, storage);

  await server.register(async (adminApp) => {
    adminApp.addHook("preHandler", createRequireAdminSession(input?.authService));

    registerProjectRoutes(adminApp, projectService);
    registerLocationRoutes(adminApp);
    registerMediaSetRoutes(adminApp, mediaSetService);
    registerMediaImageRoutes(adminApp, mediaImageService);
    registerRouteRoutes(adminApp, routeService);
    registerUploadRoutes(adminApp, uploadService, {
      isFileReachableFromPublishedContent: publicService.isFileReachableFromPublishedContent.bind(publicService),
    });
  });

  registerPublicRoutes(server, publicService);

  // Register auth routes if authService is provided
  if (input?.authService) {
    const authService = input.authService;
    server.register(async (authApp) => {
      await registerAuthRoutes(authApp, {
        authService,
        cookieSecure: input.cookieSecure ?? config.cookieSecure,
        loginRateLimit: { max: LOGIN_RATE_LIMIT_MAX, timeWindow: LOGIN_RATE_LIMIT_WINDOW_MS },
      });
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
    // Errors with a statusCode property (e.g. rate limit errors)
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      const err = error as { statusCode?: number; message?: string };
      reply.status(err.statusCode ?? 500).send({ error: err.message ?? "Request error" });
      return;
    }
    request.log.error(error);
    reply.status(500).send({ error: "Internal server error" });
  });

  return server;
};
