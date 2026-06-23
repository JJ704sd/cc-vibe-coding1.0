import type { FastifyInstance } from 'fastify';
import type { AdminAuthService } from './requireAdminSession.js';
import { SESSION_COOKIE_NAME } from './requireAdminSession.js';

export const LOGIN_RATE_LIMIT_MAX = 5;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 60_000;

export type AuthRoutesOptions = {
  authService: AdminAuthService;
  cookieSecure: boolean;
  loginRateLimit?: { max: number; timeWindow: number };
};

type LoginAttempt = { count: number; windowStart: number };

export async function registerAuthRoutes(
  app: FastifyInstance,
  input: AuthRoutesOptions,
) {
  const loginRateLimit = input.loginRateLimit ?? {
    max: LOGIN_RATE_LIMIT_MAX,
    timeWindow: LOGIN_RATE_LIMIT_WINDOW_MS,
  };

  const loginAttemptsByIp = new Map<string, LoginAttempt>();
  const cleanupExpired = (now: number) => {
    for (const [ip, attempt] of loginAttemptsByIp) {
      if (now - attempt.windowStart >= loginRateLimit.timeWindow) {
        loginAttemptsByIp.delete(ip);
      }
    }
  };

  app.post('/api/admin/login', async (request, reply) => {
    const ip = request.ip ?? 'unknown';
    const now = Date.now();
    const existing = loginAttemptsByIp.get(ip);
    if (!existing || now - existing.windowStart >= loginRateLimit.timeWindow) {
      loginAttemptsByIp.set(ip, { count: 1, windowStart: now });
    } else {
      existing.count += 1;
      if (existing.count > loginRateLimit.max) {
        if (loginAttemptsByIp.size > 100) cleanupExpired(now);
        reply.status(429);
        return { error: 'Too many login attempts' };
      }
    }

    const body = request.body as { username: string; password: string };
    const result = await input.authService.login({
      username: body.username,
      password: body.password,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
    });

    reply.setCookie(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: input.cookieSecure,
    });
    reply.header('Cache-Control', 'no-store');

    return { user: result.user };
  });

  app.get('/api/admin/session', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    reply.header('Cache-Control', 'no-store');
    return { user: token ? (await input.authService.getSession({ sessionToken: token }))?.user ?? null : null };
  });

  app.post('/api/admin/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    if (token) {
      await input.authService.logout({ sessionToken: token });
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/', httpOnly: true, sameSite: 'lax', secure: input.cookieSecure });
    reply.header('Cache-Control', 'no-store');
    return { ok: true };
  });
}