import Fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
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

export const buildServer = async (input?: {
  authService?: {
    login(data: { username: string; password: string; ipAddress: string | null; userAgent: string | null }): Promise<{ sessionToken: string; user: { id: string; username: string; role: 'admin' } }>;
    getSession(data: { sessionToken: string }): Promise<{ user: { id: string; username: string; role: 'admin' } } | null>;
    logout(data: { sessionToken: string }): Promise<void>;
  };
  cookieSecure?: boolean;
  logLevel?: string;
  bodyLimitBytes?: number;
  trustProxy?: boolean;
  corsOrigins?: string[];
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
}): Promise<FastifyInstance> => {
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
  if (input?.authService) {
    const authService = input.authService;
    server.register(async (authApp) => {
      await registerAuthRoutes(authApp, {
        authService,
        cookieSecure: input.cookieSecure ?? config.cookieSecure,
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