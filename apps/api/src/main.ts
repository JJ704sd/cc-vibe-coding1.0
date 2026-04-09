import 'dotenv/config';
import { buildServer } from './app/buildServer.js';
import { loadConfig } from './app/config.js';
import { initDb, getPool } from './infrastructure/db/db.js';
import { ensureBootstrapAdmin } from './modules/auth/bootstrapAdmin.js';
import { createAuthRepository } from './modules/auth/repository.js';
import { AuthService } from './modules/auth/service.js';

async function main() {
  const config = loadConfig();
  await initDb(config);
  await ensureBootstrapAdmin(config);

  const authRepository = createAuthRepository();
  const authService = new AuthService(authRepository);
  const app = await buildServer({
    authService,
    cookieSecure: config.cookieSecure,
  });

  await app.listen({ host: config.host, port: config.port });
  console.log(`Server running at http://${config.host}:${config.port}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
