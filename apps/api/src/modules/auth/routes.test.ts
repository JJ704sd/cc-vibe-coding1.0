import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { describe, expect, it, vi } from 'vitest';
import { registerAuthRoutes } from './routes';

describe('registerAuthRoutes', () => {
  it('sets a session cookie on successful login', async () => {
    const authService = {
      login: vi.fn(async () => ({
        sessionToken: 'plain-token',
        user: { id: 'user-1', username: 'admin', role: 'admin' as const },
      })),
      getSession: vi.fn(),
      logout: vi.fn(),
    };

    const app = Fastify();
    await app.register(cookie);
    await registerAuthRoutes(app, { authService, cookieSecure: false });

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { username: 'admin', password: 'change-me-now' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.cookies[0]?.name).toBe('trace_scope_session');
  });

  it('returns 429 with "Too many login attempts" on the 6th login within a minute from the same IP', async () => {
    const authService = {
      login: vi.fn(async () => ({
        sessionToken: 'plain-token',
        user: { id: 'user-1', username: 'admin', role: 'admin' as const },
      })),
      getSession: vi.fn(),
      logout: vi.fn(),
    };

    const app = Fastify({ trustProxy: true });
    await app.register(cookie);
    await registerAuthRoutes(app, { authService, cookieSecure: false });

    const loginPayload = { username: 'admin', password: 'change-me-now' };
    const headers = { 'x-forwarded-for': '198.51.100.7' };

    for (let i = 0; i < 5; i++) {
      const ok = await app.inject({
        method: 'POST',
        url: '/api/admin/login',
        headers,
        payload: loginPayload,
      });
      expect(ok.statusCode).toBe(200);
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      headers,
      payload: loginPayload,
    });

    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({ error: 'Too many login attempts' });
  });

  it('tracks login rate limits per IP so different IPs are not blocked together', async () => {
    const authService = {
      login: vi.fn(async () => ({
        sessionToken: 'plain-token',
        user: { id: 'user-1', username: 'admin', role: 'admin' as const },
      })),
      getSession: vi.fn(),
      logout: vi.fn(),
    };

    const app = Fastify({ trustProxy: true });
    await app.register(cookie);
    await registerAuthRoutes(app, { authService, cookieSecure: false });

    const loginPayload = { username: 'admin', password: 'change-me-now' };

    for (let i = 0; i < 5; i++) {
      const ok = await app.inject({
        method: 'POST',
        url: '/api/admin/login',
        headers: { 'x-forwarded-for': '198.51.100.10' },
        payload: loginPayload,
      });
      expect(ok.statusCode).toBe(200);
    }

    const otherIp = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      headers: { 'x-forwarded-for': '198.51.100.11' },
      payload: loginPayload,
    });

    expect(otherIp.statusCode).toBe(200);
  });

  it('does not apply the login rate limit to /api/admin/session or /api/admin/logout', async () => {
    const authService = {
      login: vi.fn(),
      getSession: vi.fn().mockResolvedValue(null),
      logout: vi.fn().mockResolvedValue(undefined),
    };

    const app = Fastify({ trustProxy: true });
    await app.register(cookie);
    await registerAuthRoutes(app, { authService, cookieSecure: false });

    const headers = { 'x-forwarded-for': '198.51.100.20' };

    for (let i = 0; i < 7; i++) {
      const session = await app.inject({
        method: 'GET',
        url: '/api/admin/session',
        headers,
      });
      expect(session.statusCode).toBe(200);

      const logout = await app.inject({
        method: 'POST',
        url: '/api/admin/logout',
        headers,
      });
      expect(logout.statusCode).toBe(200);
    }
  });
});
