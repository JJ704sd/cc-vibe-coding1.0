import type { FastifyInstance } from 'fastify';

export async function registerSystemRoutes(
  app: FastifyInstance,
  deps: {
    systemHealthService: {
      live(): { status: string; checkedAt: string; uptimeSeconds: number };
      ready(): Promise<{ status: string; checkedAt: string; checks: { database: string; storage: string } }>;
    };
  },
) {
  app.get('/health/live', async () => deps.systemHealthService.live());
  app.get('/health/ready', async (_request, reply) => {
    const payload = await deps.systemHealthService.ready();
    return reply.status(payload.status === 'ok' ? 200 : 503).send(payload);
  });
}
