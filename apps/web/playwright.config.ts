import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Tiny `.env` reader for the API connection settings. We avoid pulling in
 * the `dotenv` package on the web side; the file format is stable and the
 * parser below only needs KEY=VALUE pairs (no expansion, no multiline).
 */
function loadApiEnv(): Record<string, string> {
  const envPath = resolve(__dirname, '../api/.env');
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
 * Playwright config for Trace Scope Platform end-to-end tests.
 *
 * - webServer boots the API (port 4000) and the Vite dev server (port 5173).
 *   Both bind to 127.0.0.1 to match vite.config.ts and the production env.
 * - The fixture DB `trace_scope_e2e` must already exist; globalSetup runs
 *   `apps/api npm run seed:e2e` before any spec executes.
 * - API connection settings come from `apps/api/.env` (loaded here via
 *   dotenv) so local developers don't have to duplicate MySQL creds in
 *   their shell. CI sets them via service-container env directly.
 * - `CI=1` env disables `reuseExistingServer` so the runner never reuses
 *   a stale local instance from a previous failed run.
 */
const PORT = 4000;
const WEB_PORT = 5173;
const API_URL = `http://127.0.0.1:${PORT}`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
const isCI = !!process.env.CI;

// Expose the API base URL to test specs so they can address the API port
// directly when Vite's dev proxy doesn't cover the path (e.g. /health).
// Playwright workers don't inherit the webServer[*].env block, so we set
// it on the parent process before workers spin up.
process.env.PLAYWRIGHT_API_URL = API_URL;

export default defineConfig({
  testDir: './e2e',
  // Fixture data is shared across specs (single published project, etc.),
  // so tests run serially to keep the seed deterministic.
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: isCI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // The Playwright 1.61 release expects chromium-1228, but the
        // sandbox in this repo only has chromium-1181 cached (the official
        // download from playwright.azureedge.net is firewalled in this
        // environment). Pin to the cached binary so the suite still runs.
        // Override locally by deleting this line — `npx playwright install`
        // will then populate the 1228 directory.
        launchOptions: {
          executablePath:
            process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
            'C:\\Users\\lenovo\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1181\\chrome-win\\headless_shell.exe',
        },
      },
    },
  ],
  globalSetup: './e2e/global-setup.ts',
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../api',
      url: `${API_URL}/health`,
      reuseExistingServer: !isCI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: String(PORT),
        HOST: '127.0.0.1',
        // Fall back to API's .env so local devs don't have to duplicate
        // creds in their shell. CI overrides via service-container env.
        MYSQL_HOST: process.env.MYSQL_HOST ?? apiEnv.MYSQL_HOST ?? '127.0.0.1',
        MYSQL_PORT: process.env.MYSQL_PORT ?? apiEnv.MYSQL_PORT ?? '3306',
        MYSQL_USER: process.env.MYSQL_USER ?? apiEnv.MYSQL_USER ?? 'root',
        MYSQL_PASSWORD: process.env.MYSQL_PASSWORD ?? apiEnv.MYSQL_PASSWORD ?? '',
        MYSQL_DATABASE: process.env.MYSQL_DATABASE ?? 'trace_scope_e2e',
        STORAGE_DIR: process.env.STORAGE_DIR ?? './storage-e2e',
        SESSION_SECRET: 'e2e-test-secret-do-not-use-in-production',
        COOKIE_SECURE: 'false',
        ADMIN_BOOTSTRAP_USERNAME: 'e2e-admin',
        ADMIN_BOOTSTRAP_PASSWORD: 'e2e-admin-pass',
        PUBLIC_BASE_URL: API_URL,
        CORS_ORIGINS: WEB_URL,
        TRUST_PROXY: 'false',
        LOG_LEVEL: 'warn',
        // E2E specs issue bursts of API calls (fetch + 4-5 follow-ups);
        // raise the global ceiling so the dev default never trips the test.
        RATE_LIMIT_MAX: '10000',
      },
    },
    {
      command: 'npm run dev',
      cwd: '.',
      url: WEB_URL,
      reuseExistingServer: !isCI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});