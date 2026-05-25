export function createSystemHealthService(deps: {
  pingDatabase(): Promise<void>;
  checkUploadRoot(): Promise<void>;
  getUptimeSeconds?: () => number;
  now?: () => string;
}) {
  const now = () => deps.now?.() ?? new Date().toISOString();
  const uptime = () => deps.getUptimeSeconds?.() ?? Math.round(process.uptime());

  return {
    live() {
      return { status: 'ok', checkedAt: now(), uptimeSeconds: uptime() };
    },
    async ready() {
      let database: 'ok' | 'error' = 'ok';
      let storage: 'ok' | 'error' = 'ok';
      try { await deps.pingDatabase(); } catch { database = 'error'; }
      try { await deps.checkUploadRoot(); } catch { storage = 'error'; }
      return {
        status: database === 'ok' && storage === 'ok' ? 'ok' : 'degraded',
        checkedAt: now(),
        checks: { database, storage },
      };
    },
  };
}
