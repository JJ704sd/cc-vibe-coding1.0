import dotenv from 'dotenv';
import { buildServer } from './app/buildServer.js';
import { loadConfig } from './app/config.js';
import { initDb, getPool } from './infrastructure/db/db.js';
import { ensureBootstrapAdmin } from './modules/auth/bootstrapAdmin.js';
import { createAuthRepository } from './modules/auth/repository.js';
import { AuthService } from './modules/auth/service.js';
import { createSystemHealthService } from './modules/system/health.js';
import { access } from 'node:fs/promises';
import { resolve, isAbsolute, join } from 'node:path';

// Honour DOTENV_CONFIG_PATH (set by ecosystem.config.cjs in production)
// before reading any config that depends on process.env. The bare
// `import 'dotenv/config'` shortcut only loads `.env`, so a PM2 deploy with
// `DOTENV_CONFIG_PATH=.env.production` would silently fall through to the
// hard-coded defaults in config.ts — including a `dev-secret-*` session
// secret.
const envFile = process.env.DOTENV_CONFIG_PATH ?? '.env';
const envPath = isAbsolute(envFile) ? envFile : join(process.cwd(), envFile);
dotenv.config({ path: envPath });

async function main() {
  const config = loadConfig();
  await initDb(config);
  await ensureBootstrapAdmin(config);

  // BUG-020: purge expired admin sessions at startup so the table
  // doesn't grow unbounded over months of uptime. Cheap because
  // `admin_session.expires_at` is indexed (see 001_initial_schema.sql).
  // Failure here is non-fatal — log and continue, a future request
  // will still succeed even if this sweep dies.
  try {
    const pool = getPool();
    const result = await pool.execute(
      'DELETE FROM admin_session WHERE expires_at < NOW()'
    );
    if (result.affectedRows > 0) {
      console.log(`[startup] purged ${result.affectedRows} expired admin session(s)`);
    }
  } catch (err) {
    console.warn('[startup] failed to purge expired admin sessions:', err);
  }

  const authRepository = createAuthRepository();
  const authService = new AuthService(authRepository);

  // Determine storage directory (same logic as buildServer)
  const storageDir = isAbsolute(config.storageDir)
    ? config.storageDir
    : resolve(process.cwd(), config.storageDir);

  // Create system health service
  const systemHealthService = createSystemHealthService({
    pingDatabase: async () => {
      const pool = getPool();
      await pool.query('SELECT 1');
    },
    checkUploadRoot: async () => {
      await access(storageDir);
    },
  });

  const app = await buildServer({
    authService,
    cookieSecure: config.cookieSecure,
    logLevel: config.logLevel,
    bodyLimitBytes: config.bodyLimitBytes,
    trustProxy: config.trustProxy,
    corsOrigins: config.corsOrigins,
    rateLimitMax: config.rateLimitMax,
    rateLimitWindowMs: config.rateLimitWindowMs,
    maxUploadBytes: config.maxUploadBytes,
    systemHealthService,
  });

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await app.listen({ host: config.host, port: config.port });
  console.log(`Server running at http://${config.host}:${config.port}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
