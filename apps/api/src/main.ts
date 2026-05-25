import 'dotenv/config';
import { buildServer } from './app/buildServer.js';
import { loadConfig } from './app/config.js';
import { initDb, getPool } from './infrastructure/db/db.js';
import { ensureBootstrapAdmin } from './modules/auth/bootstrapAdmin.js';
import { createAuthRepository } from './modules/auth/repository.js';
import { AuthService } from './modules/auth/service.js';
import { createSystemHealthService } from './modules/system/health.js';
import { access } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';

async function main() {
  const config = loadConfig();
  await initDb(config);
  await ensureBootstrapAdmin(config);

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
