import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from './buildServer';

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
});
