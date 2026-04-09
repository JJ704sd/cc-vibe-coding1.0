import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { buildServer } from "../app/buildServer.js";
import { initDb } from "../infrastructure/db/db.js";
import { loadConfig } from "../app/config.js";

describe("public routes", () => {
  let tmp: string;
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    tmp = join(tmpdir(), `trace-scope-test-${randomUUID()}`);
    await mkdir(tmp, { recursive: true });
    process.env.STORAGE_DIR = tmp;
    // Initialize database before building server
    const config = loadConfig();
    await initDb(config);
    server = await buildServer();
  });

  it("GET /api/public/projects returns only published projects", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/public/projects",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty("items");
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("GET /api/public/projects/:idOrSlug returns 404 for non-existent project", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/public/projects/non-existent-id",
    });

    expect(response.statusCode).toBe(404);
  });

  it("GET /api/public/media-sets/:id returns 404 for non-existent media set", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/public/media-sets/non-existent-id",
    });

    expect(response.statusCode).toBe(404);
  });

  it("GET /api/public/uploads/:fileId returns 404 for non-existent file", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/public/uploads/non-existent-file-id",
    });

    expect(response.statusCode).toBe(404);
  });

  it("GET /api/public/map-relationship returns valid structure", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/public/map-relationship",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty("projects");
    expect(body).toHaveProperty("locations");
    expect(body).toHaveProperty("mediaSets");
    expect(body).toHaveProperty("routes");
  });

  it("GET /health returns ok", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  afterEach(async () => {
    await server.close();
    await rm(tmp, { recursive: true, force: true });
  });
});
