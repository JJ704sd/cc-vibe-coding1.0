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
});
