import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const apiDir = join(repoRoot, 'apps', 'api');

// Tiny .env reader — same parser as playwright.config.ts. Avoids pulling
// `dotenv` into the web package just for globalSetup.
function loadApiEnv(): Record<string, string> {
  const envPath = resolve(apiDir, '.env');
  let raw: string;
  try {
    raw = readFileSync(envPath, 'utf8');
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const apiEnv = loadApiEnv();

/**
 * Playwright globalSetup — wipes the e2e fixture DB and re-seeds a
 * known-good project before any spec runs.
 *
 * Runs `npm run seed:e2e` inside `apps/api`. We pin MYSQL_DATABASE to
 * `trace_scope_e2e` here (and only here) so seed-e2e never accidentally
 * wipes the developer's real `trace_scope` database.
 *
 * This script intentionally does not depend on the API server: the webServer
 * block in playwright.config.ts boots the API separately.
 */
export default async function globalSetup(): Promise<void> {
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    MYSQL_HOST: process.env.MYSQL_HOST ?? apiEnv.MYSQL_HOST ?? '127.0.0.1',
    MYSQL_PORT: process.env.MYSQL_PORT ?? apiEnv.MYSQL_PORT ?? '3306',
    MYSQL_USER: process.env.MYSQL_USER ?? apiEnv.MYSQL_USER ?? 'root',
    MYSQL_PASSWORD: process.env.MYSQL_PASSWORD ?? apiEnv.MYSQL_PASSWORD ?? '',
    MYSQL_DATABASE: 'trace_scope_e2e',
    STORAGE_DIR: process.env.STORAGE_DIR ?? './storage-e2e',
  };

  console.log(`[e2e/globalSetup] running seed-e2e against ${childEnv.MYSQL_HOST}:${childEnv.MYSQL_PORT}/${childEnv.MYSQL_DATABASE}`);
  const result = spawnSync('npm', ['run', 'seed:e2e'], {
    cwd: apiDir,
    stdio: 'inherit',
    shell: true,
    env: childEnv,
  });
  if (result.status !== 0) {
    throw new Error(`seed-e2e exited with code ${result.status ?? 'null'}`);
  }
  console.log('[e2e/globalSetup] seed-e2e done');
}