import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from './buildServer';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('buildServer', () => {
  const apps: Array<ReturnType<typeof buildServer>> = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
  });

  it('serves GET /health', async () => {
    const app = await buildServer();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('serves GET /health/live with systemHealthService', async () => {
    const systemHealthService = {
      live: () => ({ status: 'ok', checkedAt: '2026-04-09T12:00:00.000Z', uptimeSeconds: 42 }),
      ready: vi.fn().mockResolvedValue({ status: 'ok', checkedAt: '2026-04-09T12:00:00.000Z', checks: { database: 'ok', storage: 'ok' } }),
    };
    const app = await buildServer({ systemHealthService });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', checkedAt: '2026-04-09T12:00:00.000Z', uptimeSeconds: 42 });
  });

  it('serves GET /health/ready with systemHealthService and returns 200 when ok', async () => {
    const systemHealthService = {
      live: () => ({ status: 'ok', checkedAt: '2026-04-09T12:00:00.000Z', uptimeSeconds: 0 }),
      ready: vi.fn().mockResolvedValue({ status: 'ok', checkedAt: '2026-04-09T12:00:00.000Z', checks: { database: 'ok', storage: 'ok' } }),
    };
    const app = await buildServer({ systemHealthService });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', checkedAt: '2026-04-09T12:00:00.000Z', checks: { database: 'ok', storage: 'ok' } });
  });

  it('serves GET /health/ready with systemHealthService and returns 503 when degraded', async () => {
    const systemHealthService = {
      live: () => ({ status: 'ok', checkedAt: '2026-04-09T12:00:00.000Z', uptimeSeconds: 0 }),
      ready: vi.fn().mockResolvedValue({ status: 'degraded', checkedAt: '2026-04-09T12:00:00.000Z', checks: { database: 'error', storage: 'ok' } }),
    };
    const app = await buildServer({ systemHealthService });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'degraded', checkedAt: '2026-04-09T12:00:00.000Z', checks: { database: 'error', storage: 'ok' } });
  });
});

describe('buildServer hardening', () => {
  const apps: Array<ReturnType<typeof buildServer>> = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
  });

  it('adds CORS headers for configured origins', async () => {
    const app = await buildServer({
      corsOrigins: ['https://trace.example.com'],
      trustProxy: true,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: 'https://trace.example.com',
        'access-control-request-method': 'GET',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBe('https://trace.example.com');
  });

  it('returns 429 after the configured rate limit is exceeded', async () => {
    const app = await buildServer({
      corsOrigins: ['https://trace.example.com'],
      rateLimitMax: 1,
      rateLimitWindowMs: 60_000,
      authService: {
        login: vi.fn().mockResolvedValue({
          sessionToken: 'session-token',
          user: { id: 'admin-1', username: 'admin', role: 'admin' as const },
        }),
        getSession: vi.fn(),
        logout: vi.fn(),
      },
    });
    apps.push(app);

    await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { username: 'admin', password: 'secret' },
    });

    const second = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { username: 'admin', password: 'secret' },
    });

    expect(second.statusCode).toBe(429);
  });

  it('does not serve uploaded storage files through the static /uploads path', async () => {
    const storageDir = await mkdtemp(join(tmpdir(), 'trace-scope-storage-'));
    const previousStorageDir = process.env.STORAGE_DIR;
    process.env.STORAGE_DIR = storageDir;

    const app = await buildServer();

    try {
      await writeFile(join(storageDir, 'leaked.txt'), 'draft file');

      const response = await app.inject({
        method: 'GET',
        url: '/uploads/leaked.txt',
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
      if (previousStorageDir === undefined) {
        delete process.env.STORAGE_DIR;
      } else {
        process.env.STORAGE_DIR = previousStorageDir;
      }
      await rm(storageDir, { recursive: true, force: true });
    }
  });

  it('applies the configured log level to the fastify logger', async () => {
    const app = await buildServer({ logLevel: 'debug' });
    apps.push(app);

    expect((app.log as unknown as { level: string }).level).toBe('debug');
  });

  it('honors trustProxy=true by trusting X-Forwarded-For for request.ip', async () => {
    const app = await buildServer({ trustProxy: true });
    apps.push(app);

    app.get('/_test_ip', (request) => ({ ip: request.ip }));

    const response = await app.inject({
      method: 'GET',
      url: '/_test_ip',
      headers: { 'x-forwarded-for': '203.0.113.42' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ip: '203.0.113.42' });
  });

  it('returns 413 when the request body exceeds the configured body limit', async () => {
    const app = await buildServer({ bodyLimitBytes: 100 });
    apps.push(app);

    app.post('/_test_body', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'POST',
      url: '/_test_body',
      payload: 'x'.repeat(200),
      headers: { 'content-type': 'text/plain' },
    });

    expect(response.statusCode).toBe(413);
  });
});

describe('buildServer admin route authentication', () => {
  const apps: Array<ReturnType<typeof buildServer>> = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
  });

  const protectedRequests = [
    { method: 'GET', url: '/api/projects' },
    { method: 'POST', url: '/api/projects', payload: {} },
    { method: 'PUT', url: '/api/projects/project-1', payload: {} },
    { method: 'DELETE', url: '/api/projects/project-1' },
    { method: 'GET', url: '/api/locations' },
    { method: 'POST', url: '/api/locations', payload: {} },
    { method: 'PUT', url: '/api/locations/location-1', payload: {} },
    { method: 'DELETE', url: '/api/locations/location-1' },
    { method: 'GET', url: '/api/media-sets' },
    { method: 'POST', url: '/api/media-sets', payload: {} },
    { method: 'PUT', url: '/api/media-sets/media-set-1', payload: {} },
    { method: 'DELETE', url: '/api/media-sets/media-set-1' },
    { method: 'GET', url: '/api/media-images' },
    { method: 'POST', url: '/api/media-images', payload: {} },
    { method: 'PUT', url: '/api/media-images/media-image-1', payload: {} },
    { method: 'DELETE', url: '/api/media-images/media-image-1' },
    { method: 'GET', url: '/api/routes' },
    { method: 'POST', url: '/api/routes', payload: {} },
    { method: 'PUT', url: '/api/routes/route-1', payload: {} },
    { method: 'DELETE', url: '/api/routes/route-1' },
    { method: 'GET', url: '/api/uploads' },
    { method: 'POST', url: '/api/uploads', payload: {} },
    { method: 'DELETE', url: '/api/uploads/upload-1' },
  ] as const;

  it.each(protectedRequests)('returns 401 for unauthenticated $method $url', async (request) => {
    const authService = {
      login: vi.fn(),
      getSession: vi.fn(),
      logout: vi.fn(),
    };
    const app = await buildServer({ authService });
    apps.push(app);

    const response = await app.inject(request);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Admin session required' });
    expect(authService.getSession).not.toHaveBeenCalled();
  });

  it('allows protected admin routes with a valid admin session cookie', async () => {
    const authService = {
      login: vi.fn(),
      getSession: vi.fn().mockResolvedValue({
        user: { id: 'admin-1', username: 'admin', role: 'admin' as const },
      }),
      logout: vi.fn(),
    };
    const app = await buildServer({ authService });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/uploads',
      headers: {
        cookie: 'trace_scope_session=valid-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
    expect(authService.getSession).toHaveBeenCalledWith({ sessionToken: 'valid-token' });
  });

  it('keeps auth session lookup public so clients can check login state', async () => {
    const authService = {
      login: vi.fn(),
      getSession: vi.fn(),
      logout: vi.fn(),
    };
    const app = await buildServer({ authService });
    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/session',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ user: null });
  });
});
