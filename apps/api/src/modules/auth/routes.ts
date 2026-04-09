import type { FastifyInstance } from 'fastify';

const SESSION_COOKIE_NAME = 'trace_scope_session';

export async function registerAuthRoutes(
  app: FastifyInstance,
  input: {
    authService: {
      login(data: { username: string; password: string; ipAddress: string | null; userAgent: string | null }): Promise<{ sessionToken: string; user: { id: string; username: string; role: 'admin' } }>;
      getSession(data: { sessionToken: string }): Promise<{ user: { id: string; username: string; role: 'admin' } } | null>;
      logout(data: { sessionToken: string }): Promise<void>;
    };
    cookieSecure: boolean;
  },
) {
  app.post('/api/admin/login', async (request, reply) => {
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

    return { user: result.user };
  });

  app.get('/api/admin/session', async (request) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    return { user: token ? (await input.authService.getSession({ sessionToken: token }))?.user ?? null : null };
  });

  app.post('/api/admin/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE_NAME];
    if (token) {
      await input.authService.logout({ sessionToken: token });
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/', httpOnly: true, sameSite: 'lax', secure: input.cookieSecure });
    return { ok: true };
  });
}
