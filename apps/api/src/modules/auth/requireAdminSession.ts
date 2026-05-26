import type { FastifyReply, FastifyRequest } from 'fastify';

export const SESSION_COOKIE_NAME = 'trace_scope_session';

export interface AdminAuthService {
  login(data: {
    username: string;
    password: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<{ sessionToken: string; user: { id: string; username: string; role: 'admin' } }>;
  getSession(data: { sessionToken: string }): Promise<{ user: { id: string; username: string; role: 'admin' } } | null>;
  logout(data: { sessionToken: string }): Promise<void>;
}

export function createRequireAdminSession(authService?: AdminAuthService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.method === 'OPTIONS') {
      return;
    }

    const token = request.cookies[SESSION_COOKIE_NAME];
    if (!token || !authService) {
      reply.status(401).send({ error: 'Admin session required' });
      return;
    }

    const session = await authService.getSession({ sessionToken: token });
    if (!session) {
      reply.status(401).send({ error: 'Admin session required' });
    }
  };
}
