# Trace Scope Backend Phase 4 Single-Node Hardening and Operations Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the post-Phase-3 Trace Scope stack for single-machine public deployment by adding production runtime config, proxy-aware API security, health checks, release scripts, backup scripts, and operator-facing deployment docs.

**Architecture:** Keep one `apps/api` Fastify process and one static `apps/web` build on the same machine. Put both behind Caddy, keep MySQL on the host, keep uploads on local disk, and make the backend explicitly aware of trusted proxy headers, public origins, health/readiness checks, and operational backup paths. The code stays a modular monolith; this phase only adds runtime and operations seams.

**Tech Stack:** Node.js, TypeScript, Fastify, MySQL, Vitest, PowerShell, PM2, Caddy

---

## Preconditions

- Phase 3 must already be complete:
  - public API routes exist
  - `GET /api/uploads/:fileId` already enforces published-content access
  - public frontend pages read from backend APIs instead of `localStorage`
- `apps/web` must already produce a deployable build with `npm run build`
- `apps/api` must already build and start with MySQL and local uploads configured

---

## File Map

### New backend and ops files

- `apps/api/.env.production.example`
- `apps/api/src/app/config.test.ts`
- `apps/api/src/modules/system/health.ts`
- `apps/api/src/modules/system/health.test.ts`
- `apps/api/src/modules/system/routes.ts`
- `ecosystem.config.cjs`
- `deploy/caddy/Caddyfile`
- `scripts/ops/build-release.ps1`
- `scripts/ops/check-api-health.ps1`
- `scripts/ops/backup-mysql.ps1`
- `scripts/ops/restore-mysql.ps1`
- `scripts/ops/backup-uploads.ps1`
- `scripts/ops/restore-uploads.ps1`
- `docs/operations/single-node-deployment.md`
- `docs/operations/backup-and-recovery.md`

### Files to modify

- `.gitignore`
- `apps/api/.env.example`
- `apps/api/package.json`
- `apps/api/src/app/buildServer.ts`
- `apps/api/src/app/buildServer.test.ts`
- `apps/api/src/app/config.ts`
- `apps/api/src/main.ts`
- `apps/api/src/modules/auth/routes.ts`
- `apps/api/README.md`

---

## Runtime Rules For Phase 4

- `apps/api` must trust proxy headers only when `TRUST_PROXY=true`
- CORS must be allow-list based, not wildcard based
- production cookies must stay compatible with reverse-proxy HTTPS deployment
- the backend must expose:
  - `GET /health`
  - `GET /health/live`
  - `GET /health/ready`
- readiness must check:
  - MySQL connectivity
  - upload-root writability
- the repository must contain operator artifacts for:
  - building a release
  - health smoke checks
  - MySQL backup and restore
  - upload backup and restore
  - reverse-proxy config
  - deployment and recovery docs

---

## Task 1: Add production runtime config and a PM2 process profile

**Files:**
- Create: `apps/api/.env.production.example`
- Create: `apps/api/src/app/config.test.ts`
- Create: `ecosystem.config.cjs`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app/config.ts`

- [ ] **Step 1: Write the failing config parser test**

Create `apps/api/src/app/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadConfigFrom } from './config.js';

describe('loadConfigFrom', () => {
  it('parses production runtime settings and defaults CORS to PUBLIC_BASE_URL', () => {
    const config = loadConfigFrom({
      MYSQL_HOST: '127.0.0.1',
      MYSQL_PORT: '3306',
      MYSQL_USER: 'root',
      MYSQL_PASSWORD: 'secret',
      MYSQL_DATABASE: 'trace_scope_platform',
      UPLOAD_ROOT: 'D:/trace-scope-platform/data/uploads',
      SESSION_SECRET: 'replace-me',
      ADMIN_BOOTSTRAP_USERNAME: 'admin',
      ADMIN_BOOTSTRAP_PASSWORD: 'change-me-now',
      PUBLIC_BASE_URL: 'https://trace.example.com',
    });

    expect(config.publicBaseUrl).toBe('https://trace.example.com');
    expect(config.corsOrigins).toEqual(['https://trace.example.com']);
    expect(config.trustProxy).toBe(true);
    expect(config.logLevel).toBe('info');
    expect(config.bodyLimitBytes).toBe(10 * 1024 * 1024);
  });
});
```

- [ ] **Step 2: Run the config test and confirm the new parser surface does not exist yet**

Run: `cd apps/api && npm test -- src/app/config.test.ts`

Expected: FAIL because `loadConfigFrom`, `publicBaseUrl`, `corsOrigins`, `trustProxy`, `logLevel`, and `bodyLimitBytes` are not implemented yet.

- [ ] **Step 3: Add the production config surface, env examples, and PM2 profile**

Update `apps/api/src/app/config.ts`:

```ts
export interface AppConfig {
  port: number;
  mysqlHost: string;
  mysqlPort: number;
  mysqlUser: string;
  mysqlPassword: string;
  mysqlDatabase: string;
  uploadRoot: string;
  sessionSecret: string;
  cookieSecure: boolean;
  adminBootstrapUsername: string;
  adminBootstrapPassword: string;
  publicBaseUrl: string;
  corsOrigins: string[];
  trustProxy: boolean;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug';
  bodyLimitBytes: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
}

type EnvSource = Record<string, string | undefined>;

function requireEnv(source: EnvSource, name: string): string {
  const value = source[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  return value === 'true';
}

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric environment value: ${value}`);
  }

  return parsed;
}

function readCsv(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function loadConfigFrom(source: EnvSource): AppConfig {
  const publicBaseUrl = requireEnv(source, 'PUBLIC_BASE_URL');

  return {
    port: readNumber(source.PORT, 4000),
    mysqlHost: requireEnv(source, 'MYSQL_HOST'),
    mysqlPort: readNumber(source.MYSQL_PORT, 3306),
    mysqlUser: requireEnv(source, 'MYSQL_USER'),
    mysqlPassword: requireEnv(source, 'MYSQL_PASSWORD'),
    mysqlDatabase: requireEnv(source, 'MYSQL_DATABASE'),
    uploadRoot: requireEnv(source, 'UPLOAD_ROOT'),
    sessionSecret: requireEnv(source, 'SESSION_SECRET'),
    cookieSecure: readBoolean(source.COOKIE_SECURE, true),
    adminBootstrapUsername: requireEnv(source, 'ADMIN_BOOTSTRAP_USERNAME'),
    adminBootstrapPassword: requireEnv(source, 'ADMIN_BOOTSTRAP_PASSWORD'),
    publicBaseUrl,
    corsOrigins: readCsv(source.CORS_ORIGINS, [publicBaseUrl]),
    trustProxy: readBoolean(source.TRUST_PROXY, true),
    logLevel: (source.LOG_LEVEL ?? 'info') as AppConfig['logLevel'],
    bodyLimitBytes: readNumber(source.BODY_LIMIT_BYTES, 10 * 1024 * 1024),
    rateLimitMax: readNumber(source.RATE_LIMIT_MAX, 60),
    rateLimitWindowMs: readNumber(source.RATE_LIMIT_WINDOW_MS, 60_000),
  };
}

export function loadConfig(): AppConfig {
  return loadConfigFrom(process.env);
}
```

Update `apps/api/.env.example`:

```dotenv
PORT=4000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=trace_scope
MYSQL_PASSWORD=replace-me
MYSQL_DATABASE=trace_scope
UPLOAD_ROOT=./data/uploads
SESSION_SECRET=replace-me
COOKIE_SECURE=false
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=change-me-now
PUBLIC_BASE_URL=http://localhost:4000
CORS_ORIGINS=http://localhost:5173,http://localhost:4000
TRUST_PROXY=false
LOG_LEVEL=info
BODY_LIMIT_BYTES=10485760
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
```

Create `apps/api/.env.production.example`:

```dotenv
PORT=4000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=trace_scope
MYSQL_PASSWORD=replace-me
MYSQL_DATABASE=trace_scope_platform
UPLOAD_ROOT=D:/trace-scope-platform/data/uploads
SESSION_SECRET=replace-me-with-a-long-random-string
COOKIE_SECURE=true
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=change-me-now
PUBLIC_BASE_URL=https://trace.example.com
CORS_ORIGINS=https://trace.example.com
TRUST_PROXY=true
LOG_LEVEL=info
BODY_LIMIT_BYTES=10485760
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
```

Update `apps/api/package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js",
    "start:prod": "node dist/main.js",
    "test": "vitest run --pool threads",
    "migrate": "tsx src/infrastructure/db/migrate.ts"
  }
}
```

Create `ecosystem.config.cjs`:

```js
module.exports = {
  apps: [
    {
      name: 'trace-scope-api',
      cwd: './apps/api',
      script: './dist/main.js',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        DOTENV_CONFIG_PATH: '.env.production',
      },
    },
  ],
};
```

- [ ] **Step 4: Run the config test and build**

Run: `cd apps/api && npm test -- src/app/config.test.ts && npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/.env.example apps/api/.env.production.example apps/api/package.json apps/api/src/app/config.ts apps/api/src/app/config.test.ts ecosystem.config.cjs
git commit -m "feat: add production runtime config profile"
```

## Task 2: Add proxy-aware API hardening for CORS, headers, and rate limiting

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app/buildServer.ts`
- Modify: `apps/api/src/app/buildServer.test.ts`
- Modify: `apps/api/src/modules/auth/routes.ts`

- [ ] **Step 1: Extend the server test with CORS and rate-limit expectations**

Add to `apps/api/src/app/buildServer.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from './buildServer';

describe('buildServer hardening', () => {
  const apps: Array<ReturnType<typeof buildServer>> = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
  });

  it('adds CORS headers for configured origins', async () => {
    const app = buildServer({
      corsOrigins: ['https://trace.example.com'],
      trustProxy: true,
    });
    apps.push(app);

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: 'https://trace.example.com',
        'access-control-request-method': 'GET',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBe('https://trace.example.com');
  });

  it('returns 429 after the configured rate limit is exceeded', async () => {
    const app = buildServer({
      corsOrigins: ['https://trace.example.com'],
      rateLimitMax: 1,
      rateLimitWindowMs: 60_000,
      authService: {
        login: vi.fn().mockResolvedValue({
          sessionToken: 'session-token',
          user: { id: 'admin-1', username: 'admin', role: 'admin' as const },
        }),
        getSession: vi.fn(),
        logout: vi.fn(),
      },
    });
    apps.push(app);

    await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { username: 'admin', password: 'secret' },
    });

    const second = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { username: 'admin', password: 'secret' },
    });

    expect(second.statusCode).toBe(429);
  });
});
```

- [ ] **Step 2: Run the server test and confirm the hardening surface is missing**

Run: `cd apps/api && npm test -- src/app/buildServer.test.ts`

Expected: FAIL because `corsOrigins`, `trustProxy`, `rateLimitMax`, and `rateLimitWindowMs` are not wired into the server yet.

- [ ] **Step 3: Register the Fastify hardening plugins and tighten admin response caching**

Update `apps/api/package.json` dependencies:

```json
{
  "dependencies": {
    "@fastify/cookie": "^11.0.2",
    "@fastify/cors": "^11.1.0",
    "@fastify/helmet": "^13.0.2",
    "@fastify/rate-limit": "^10.3.0",
    "dotenv": "^16.4.7",
    "fastify": "^5.2.1",
    "mysql2": "^3.12.0"
  }
}
```

Update `apps/api/src/app/buildServer.ts`:

```ts
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { toErrorResponse } from './errors.js';
import { registerAuthRoutes } from '../modules/auth/routes.js';

interface BuildServerInput {
  authService?: {
    login(data: { username: string; password: string; ipAddress: string | null; userAgent: string | null }): Promise<{ sessionToken: string; user: { id: string; username: string; role: 'admin' } }>;
    getSession(data: { sessionToken: string }): Promise<{ user: { id: string; username: string; role: 'admin' } } | null>;
    logout(data: { sessionToken: string }): Promise<void>;
  };
  systemHealthService?: {
    live(): { status: string; checkedAt: string; uptimeSeconds: number };
    ready(): Promise<{ status: string; checkedAt: string; checks: { database: string; storage: string } }>;
  };
  cookieSecure?: boolean;
  trustProxy?: boolean;
  corsOrigins?: string[];
  logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug';
  bodyLimitBytes?: number;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
}

export function buildServer(input: BuildServerInput = {}) {
  const app = Fastify({
    logger: { level: input.logLevel ?? 'info' },
    trustProxy: input.trustProxy ?? false,
    bodyLimit: input.bodyLimitBytes ?? 10 * 1024 * 1024,
  });

  app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
  });

  app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, (input.corsOrigins ?? []).includes(origin));
    },
  });

  app.register(rateLimit, {
    global: true,
    max: input.rateLimitMax ?? 60,
    timeWindow: input.rateLimitWindowMs ?? 60_000,
  });

  app.get('/health', async () => ({ status: 'ok' }));

  if (input.authService) {
    const authService = input.authService;
    app.register(cookie);
    app.register(async (authApp) => {
      await registerAuthRoutes(authApp, {
        authService,
        cookieSecure: input.cookieSecure ?? false,
      });
    });
  }

  app.setErrorHandler((error, _request, reply) => {
    const mapped = toErrorResponse(error);
    reply.status(mapped.statusCode).send(mapped.body);
  });

  return app;
}
```

Update `apps/api/src/modules/auth/routes.ts` so `POST /api/admin/login`, `GET /api/admin/session`, and `POST /api/admin/logout` all set:

```ts
reply.header('Cache-Control', 'no-store');
```

- [ ] **Step 4: Run the server test and full API build**

Run: `cd apps/api && npm install && npm test -- src/app/buildServer.test.ts && npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json apps/api/src/app/buildServer.ts apps/api/src/app/buildServer.test.ts apps/api/src/modules/auth/routes.ts
git commit -m "feat: harden api runtime for public deployment"
```

## Task 3: Add live and readiness health checks plus graceful shutdown

**Files:**
- Create: `apps/api/src/modules/system/health.ts`
- Create: `apps/api/src/modules/system/health.test.ts`
- Create: `apps/api/src/modules/system/routes.ts`
- Modify: `apps/api/src/app/buildServer.ts`
- Modify: `apps/api/src/app/buildServer.test.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Write the failing system health service test**

Create `apps/api/src/modules/system/health.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createSystemHealthService } from './health.js';

describe('createSystemHealthService', () => {
  it('returns ready when database and upload storage are both available', async () => {
    const service = createSystemHealthService({
      pingDatabase: vi.fn().mockResolvedValue(undefined),
      checkUploadRoot: vi.fn().mockResolvedValue(undefined),
      getUptimeSeconds: () => 42,
      now: () => '2026-04-09T12:00:00.000Z',
    });

    expect(service.live()).toEqual({
      status: 'ok',
      checkedAt: '2026-04-09T12:00:00.000Z',
      uptimeSeconds: 42,
    });

    await expect(service.ready()).resolves.toEqual({
      status: 'ok',
      checkedAt: '2026-04-09T12:00:00.000Z',
      checks: {
        database: 'ok',
        storage: 'ok',
      },
    });
  });
});
```

- [ ] **Step 2: Run the health test and confirm the system module does not exist yet**

Run: `cd apps/api && npm test -- src/modules/system/health.test.ts`

Expected: FAIL because the system health module is missing.

- [ ] **Step 3: Add the health service, system routes, and graceful shutdown wiring**

Create `apps/api/src/modules/system/health.ts`:

```ts
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
      return {
        status: 'ok',
        checkedAt: now(),
        uptimeSeconds: uptime(),
      };
    },
    async ready() {
      let database: 'ok' | 'error' = 'ok';
      let storage: 'ok' | 'error' = 'ok';

      try {
        await deps.pingDatabase();
      } catch {
        database = 'error';
      }

      try {
        await deps.checkUploadRoot();
      } catch {
        storage = 'error';
      }

      return {
        status: database === 'ok' && storage === 'ok' ? 'ok' : 'degraded',
        checkedAt: now(),
        checks: {
          database,
          storage,
        },
      };
    },
  };
}
```

Create `apps/api/src/modules/system/routes.ts`:

```ts
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
```

Update `apps/api/src/app/buildServer.ts`:

```ts
import { registerSystemRoutes } from '../modules/system/routes.js';

app.get('/health', async () => {
  if (input.systemHealthService) {
    return input.systemHealthService.live();
  }

  return { status: 'ok' };
});

if (input.systemHealthService) {
  app.register(registerSystemRoutes, {
    systemHealthService: input.systemHealthService,
  });
}
```

Update `apps/api/src/main.ts`:

```ts
import 'dotenv/config';
import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { buildServer } from './app/buildServer.js';
import { loadConfig } from './app/config.js';
import { createPool } from './infrastructure/db/pool.js';
import { ensureBootstrapAdmin } from './modules/auth/bootstrapAdmin.js';
import { createAuthRepository } from './modules/auth/repository.js';
import { AuthService } from './modules/auth/service.js';
import { createSystemHealthService } from './modules/system/health.js';

async function main() {
  const config = loadConfig();
  const pool = createPool(config);
  await ensureBootstrapAdmin(pool, config);

  const authRepository = createAuthRepository(pool);
  const authService = new AuthService(authRepository);
  const systemHealthService = createSystemHealthService({
    pingDatabase: async () => {
      await pool.query('SELECT 1');
    },
    checkUploadRoot: async () => {
      await mkdir(config.uploadRoot, { recursive: true });
      await access(config.uploadRoot, constants.W_OK);
    },
  });

  const app = buildServer({
    authService,
    systemHealthService,
    cookieSecure: config.cookieSecure,
    trustProxy: config.trustProxy,
    corsOrigins: config.corsOrigins,
    logLevel: config.logLevel,
    bodyLimitBytes: config.bodyLimitBytes,
    rateLimitMax: config.rateLimitMax,
    rateLimitWindowMs: config.rateLimitWindowMs,
  });

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down trace-scope-api');
    await app.close();
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  await app.listen({ host: '0.0.0.0', port: config.port });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Add to `apps/api/src/app/buildServer.test.ts`:

```ts
it('serves GET /health/live and GET /health/ready when a system health service is provided', async () => {
  const app = buildServer({
    systemHealthService: {
      live: () => ({
        status: 'ok',
        checkedAt: '2026-04-09T12:00:00.000Z',
        uptimeSeconds: 1,
      }),
      ready: async () => ({
        status: 'ok',
        checkedAt: '2026-04-09T12:00:00.000Z',
        checks: { database: 'ok', storage: 'ok' },
      }),
    },
  });
  apps.push(app);

  const live = await app.inject({ method: 'GET', url: '/health/live' });
  const ready = await app.inject({ method: 'GET', url: '/health/ready' });

  expect(live.statusCode).toBe(200);
  expect(ready.statusCode).toBe(200);
  expect(ready.json()).toEqual({
    status: 'ok',
    checkedAt: '2026-04-09T12:00:00.000Z',
    checks: { database: 'ok', storage: 'ok' },
  });
});
```

- [ ] **Step 4: Run the health tests and build**

Run: `cd apps/api && npm test -- src/modules/system/health.test.ts src/app/buildServer.test.ts && npm run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/system apps/api/src/app/buildServer.ts apps/api/src/app/buildServer.test.ts apps/api/src/main.ts
git commit -m "feat: add system health checks and graceful shutdown"
```

## Task 4: Add release-build and smoke-check scripts for single-machine operation

**Files:**
- Create: `scripts/ops/build-release.ps1`
- Create: `scripts/ops/check-api-health.ps1`

- [ ] **Step 1: Run the missing smoke-check script and confirm it does not exist yet**

Run: `powershell -ExecutionPolicy Bypass -File scripts/ops/check-api-health.ps1 -BaseUrl http://127.0.0.1:4000`

Expected: FAIL because the script file does not exist yet.

- [ ] **Step 2: Create the release and smoke-check scripts**

Create `scripts/ops/build-release.ps1`:

```powershell
[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
)

$apiDir = Join-Path $RepoRoot 'apps\api'
$webDir = Join-Path $RepoRoot 'apps\web'

Write-Host "Building API from $apiDir"
Push-Location $apiDir
npm run build
if ($LASTEXITCODE -ne 0) { throw 'API build failed.' }
Pop-Location

Write-Host "Building web app from $webDir"
Push-Location $webDir
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
Pop-Location

Write-Host 'Release build completed.'
```

Create `scripts/ops/check-api-health.ps1`:

```powershell
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl
)

$liveUrl = "$BaseUrl/health/live"
$readyUrl = "$BaseUrl/health/ready"

try {
  $live = Invoke-RestMethod -Uri $liveUrl -Method Get
} catch {
  throw "Live check failed for $liveUrl. $($_.Exception.Message)"
}

try {
  $ready = Invoke-RestMethod -Uri $readyUrl -Method Get
} catch {
  throw "Readiness check failed for $readyUrl. $($_.Exception.Message)"
}

if ($live.status -ne 'ok') {
  throw "Live check returned unexpected payload from $liveUrl"
}

if ($ready.status -ne 'ok') {
  throw "Readiness check returned unexpected payload from $readyUrl"
}

Write-Host "Live: $($live.status)"
Write-Host "Ready: $($ready.status)"
```

- [ ] **Step 3: Run the build and smoke-check scripts**

Run: `powershell -ExecutionPolicy Bypass -File scripts/ops/build-release.ps1`

Expected: API build and web build both complete successfully.

Run: `powershell -ExecutionPolicy Bypass -File scripts/ops/check-api-health.ps1 -BaseUrl http://127.0.0.1:4000`

Expected: `Live: ok` and `Ready: ok`

- [ ] **Step 4: Commit**

```bash
git add scripts/ops/build-release.ps1 scripts/ops/check-api-health.ps1
git commit -m "feat: add release and healthcheck scripts"
```

## Task 5: Add MySQL and upload backup and restore scripts

**Files:**
- Create: `scripts/ops/backup-mysql.ps1`
- Create: `scripts/ops/restore-mysql.ps1`
- Create: `scripts/ops/backup-uploads.ps1`
- Create: `scripts/ops/restore-uploads.ps1`
- Modify: `.gitignore`

- [ ] **Step 1: Run the missing backup script and confirm it does not exist yet**

Run: `powershell -ExecutionPolicy Bypass -File scripts/ops/backup-mysql.ps1 -WhatIf`

Expected: FAIL because the backup script does not exist yet.

- [ ] **Step 2: Create backup/restore scripts and ignore generated artifacts**

Create `scripts/ops/backup-mysql.ps1`:

```powershell
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$MysqlDumpExe = $env:MYSQLDUMP_EXE,
  [string]$MysqlHost = $env:MYSQL_HOST,
  [int]$MysqlPort = 3306,
  [string]$MysqlUser = $env:MYSQL_USER,
  [string]$MysqlPassword = $env:MYSQL_PASSWORD,
  [string]$MysqlDatabase = $env:MYSQL_DATABASE,
  [string]$BackupRoot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path 'backups\mysql')
)

if (-not $MysqlDumpExe) { throw 'MYSQLDUMP_EXE is required.' }
if (-not $MysqlHost) { throw 'MYSQL_HOST is required.' }
if (-not $MysqlUser) { throw 'MYSQL_USER is required.' }
if (-not $MysqlPassword) { throw 'MYSQL_PASSWORD is required.' }
if (-not $MysqlDatabase) { throw 'MYSQL_DATABASE is required.' }
if ($env:MYSQL_PORT) { $MysqlPort = [int]$env:MYSQL_PORT }

New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$targetFile = Join-Path $BackupRoot "$MysqlDatabase-$timestamp.sql"

if ($PSCmdlet.ShouldProcess($targetFile, 'Create MySQL dump')) {
  & $MysqlDumpExe "--host=$MysqlHost" "--port=$MysqlPort" "--user=$MysqlUser" "--password=$MysqlPassword" "--default-character-set=utf8mb4" "--single-transaction" "--quick" $MysqlDatabase | Set-Content -LiteralPath $targetFile -Encoding utf8
  if ($LASTEXITCODE -ne 0) { throw 'mysqldump failed.' }
}

Write-Host "MySQL backup target: $targetFile"
```

Create `scripts/ops/restore-mysql.ps1`:

```powershell
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [string]$DumpFile,
  [string]$MysqlExe = $env:MYSQL_EXE,
  [string]$MysqlHost = $env:MYSQL_HOST,
  [int]$MysqlPort = 3306,
  [string]$MysqlUser = $env:MYSQL_USER,
  [string]$MysqlPassword = $env:MYSQL_PASSWORD,
  [string]$MysqlDatabase = $env:MYSQL_DATABASE
)

if (-not (Test-Path $DumpFile)) { throw "Dump file not found: $DumpFile" }
if (-not $MysqlExe) { throw 'MYSQL_EXE is required.' }
if (-not $MysqlHost) { throw 'MYSQL_HOST is required.' }
if (-not $MysqlUser) { throw 'MYSQL_USER is required.' }
if (-not $MysqlPassword) { throw 'MYSQL_PASSWORD is required.' }
if (-not $MysqlDatabase) { throw 'MYSQL_DATABASE is required.' }
if ($env:MYSQL_PORT) { $MysqlPort = [int]$env:MYSQL_PORT }

if ($PSCmdlet.ShouldProcess($MysqlDatabase, "Restore MySQL dump from $DumpFile")) {
  $process = Start-Process -FilePath $MysqlExe -ArgumentList @("--host=$MysqlHost", "--port=$MysqlPort", "--user=$MysqlUser", "--password=$MysqlPassword", $MysqlDatabase) -RedirectStandardInput $DumpFile -NoNewWindow -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw 'mysql restore failed.' }
}

Write-Host "Restore source: $DumpFile"
```

Create `scripts/ops/backup-uploads.ps1`:

```powershell
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$UploadRoot = $env:UPLOAD_ROOT,
  [string]$BackupRoot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path 'backups\uploads')
)

if (-not $UploadRoot) { throw 'UPLOAD_ROOT is required.' }
if (-not (Test-Path $UploadRoot)) { throw "Upload root not found: $UploadRoot" }

New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$targetFile = Join-Path $BackupRoot "uploads-$timestamp.zip"

if ($PSCmdlet.ShouldProcess($targetFile, 'Create upload archive')) {
  Compress-Archive -LiteralPath $UploadRoot -DestinationPath $targetFile -Force
}

Write-Host "Upload backup target: $targetFile"
```

Create `scripts/ops/restore-uploads.ps1`:

```powershell
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)]
  [string]$ArchiveFile,
  [string]$UploadRoot = $env:UPLOAD_ROOT
)

if (-not (Test-Path $ArchiveFile)) { throw "Archive not found: $ArchiveFile" }
if (-not $UploadRoot) { throw 'UPLOAD_ROOT is required.' }

$parentDir = Split-Path -Parent $UploadRoot
$leafName = Split-Path -Leaf $UploadRoot
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stagingRoot = Join-Path $parentDir "restore-$leafName-$timestamp"
$previousRoot = "$UploadRoot.pre-restore-$timestamp"

if ($PSCmdlet.ShouldProcess($UploadRoot, "Restore uploads from $ArchiveFile")) {
  New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null
  Expand-Archive -LiteralPath $ArchiveFile -DestinationPath $stagingRoot -Force

  if (Test-Path $UploadRoot) {
    Move-Item -LiteralPath $UploadRoot -Destination $previousRoot
  }

  Move-Item -LiteralPath (Join-Path $stagingRoot $leafName) -Destination $UploadRoot
}

Write-Host "Upload restore source: $ArchiveFile"
```

Update `.gitignore`:

```gitignore
.worktrees/
apps/api/.env
apps/api/.env.production
apps/api/dist/
apps/api/data/
apps/api/node_modules/
apps/web/dist/
apps/web/node_modules/
backups/
```

- [ ] **Step 3: Run the scripts in dry-run mode**

Run: `powershell -ExecutionPolicy Bypass -File scripts/ops/backup-mysql.ps1 -WhatIf`

Expected: script prints the target dump path without writing a file.

Run: `powershell -Command "New-Item -ItemType Directory -Force -Path '.\backups\mysql' | Out-Null; New-Item -ItemType File -Force -Path '.\backups\mysql\sample.sql' | Out-Null"`

Expected: a sample dump file exists for the dry-run restore command.

Run: `powershell -ExecutionPolicy Bypass -File scripts/ops/restore-mysql.ps1 -DumpFile .\backups\mysql\sample.sql -WhatIf`

Expected: script validates arguments and prints the restore source without mutating the database.

Run: `powershell -ExecutionPolicy Bypass -File scripts/ops/backup-uploads.ps1 -WhatIf`

Expected: script prints the target archive path without writing a zip.

Run: `powershell -Command "New-Item -ItemType Directory -Force -Path '.\backups\uploads' | Out-Null; New-Item -ItemType File -Force -Path '.\backups\uploads\sample.zip' | Out-Null"`

Expected: a sample archive file exists for the dry-run restore command.

Run: `powershell -ExecutionPolicy Bypass -File scripts/ops/restore-uploads.ps1 -ArchiveFile .\backups\uploads\sample.zip -WhatIf`

Expected: script prints the restore source without moving the current upload root.

- [ ] **Step 4: Commit**

```bash
git add .gitignore scripts/ops/backup-mysql.ps1 scripts/ops/restore-mysql.ps1 scripts/ops/backup-uploads.ps1 scripts/ops/restore-uploads.ps1
git commit -m "feat: add backup and restore scripts"
```

## Task 6: Add Caddy config and operator-facing deployment docs

**Files:**
- Create: `deploy/caddy/Caddyfile`
- Create: `docs/operations/single-node-deployment.md`
- Create: `docs/operations/backup-and-recovery.md`
- Modify: `apps/api/README.md`

- [ ] **Step 1: Confirm the deployment config does not exist yet**

Run: `powershell -Command "Test-Path 'deploy/caddy/Caddyfile'"`

Expected: `False`

- [ ] **Step 2: Create the Caddy config and runbooks**

Create `deploy/caddy/Caddyfile`:

```caddyfile
{$TRACE_SCOPE_DOMAIN} {
  encode gzip zstd

  @api path /api/* /health /health/* /uploads/*
  handle @api {
    reverse_proxy 127.0.0.1:{$TRACE_SCOPE_API_PORT}
  }

  root * {$TRACE_SCOPE_WEB_ROOT}
  try_files {path} /index.html
  file_server

  header {
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    X-Frame-Options "SAMEORIGIN"
  }
}
```

Create `docs/operations/single-node-deployment.md`:

````md
# Trace Scope Single-Node Deployment

## Runtime Shape

- Caddy serves the built frontend
- Caddy reverse-proxies `/api/*`, `/health*`, and `/uploads/*` to `trace-scope-api`
- PM2 runs one Node.js API process
- MySQL stays on the same host and is not exposed publicly

## 1. Install dependencies

```powershell
Set-Location 'D:\VS vibe coding files\trace-scope-platform\apps\api'
npm install
Set-Location 'D:\VS vibe coding files\trace-scope-platform\apps\web'
npm install
```

## 2. Prepare the production env file

```powershell
Copy-Item apps\api\.env.production.example apps\api\.env.production
```

Set these values before first start:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `UPLOAD_ROOT`
- `SESSION_SECRET`
- `PUBLIC_BASE_URL`
- `CORS_ORIGINS`

## 3. Build the release

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ops\build-release.ps1
```

## 4. Start the API with PM2

```powershell
pm2 start ecosystem.config.cjs --only trace-scope-api --env production
pm2 save
```

## 5. Configure Caddy environment values

```powershell
$env:TRACE_SCOPE_DOMAIN='trace.example.com'
$env:TRACE_SCOPE_WEB_ROOT='D:\VS vibe coding files\trace-scope-platform\apps\web\dist'
$env:TRACE_SCOPE_API_PORT='4000'
```

## 6. Validate and start Caddy

```powershell
caddy validate --config deploy\caddy\Caddyfile
caddy run --config deploy\caddy\Caddyfile
```

## 7. Smoke-check the deployment

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ops\check-api-health.ps1 -BaseUrl https://trace.example.com
```
````

Create `docs/operations/backup-and-recovery.md`:

````md
# Trace Scope Backup and Recovery

## Backup Commands

### MySQL

```powershell
$env:MYSQLDUMP_EXE='D:\Mysql community\server\bin\mysqldump.exe'
powershell -ExecutionPolicy Bypass -File scripts\ops\backup-mysql.ps1
```

### Uploads

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ops\backup-uploads.ps1
```

## Restore Commands

### MySQL

```powershell
$env:MYSQL_EXE='D:\Mysql community\server\bin\mysql.exe'
powershell -ExecutionPolicy Bypass -File scripts\ops\restore-mysql.ps1 -DumpFile .\backups\mysql\trace_scope_platform-20260409-120000.sql
```

### Uploads

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ops\restore-uploads.ps1 -ArchiveFile .\backups\uploads\uploads-20260409-120000.zip
```

## Recommended Schedule

- MySQL dump: once every day
- Upload archive: once every day after the MySQL dump
- Keep at least 7 daily backups locally
- Copy the `backups/` directory to a second disk or second machine before deleting old archives

## Post-Recovery Checks

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ops\check-api-health.ps1 -BaseUrl http://127.0.0.1:4000
```

Verify all four items:

- health checks return `ok`
- admin login still works
- at least one public project page opens
- at least one uploaded image still resolves through `/uploads/:fileId`
````

Update `apps/api/README.md`:

```md
# Trace Scope API

## Local development

1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Create the MySQL database named in `MYSQL_DATABASE`
4. Run `npm run migrate`
5. Run `npm run dev`

## Production operations

- deployment guide: `../../docs/operations/single-node-deployment.md`
- backup and recovery guide: `../../docs/operations/backup-and-recovery.md`
- PM2 profile: `../../ecosystem.config.cjs`
- Caddy config: `../../deploy/caddy/Caddyfile`
```

- [ ] **Step 3: Validate the deployment artifacts**

Run: `caddy validate --config deploy/caddy/Caddyfile`

Expected: `Valid configuration` or equivalent.

Run: `pm2 start ecosystem.config.cjs --only trace-scope-api --env production`

Expected: PM2 starts one process named `trace-scope-api`.

- [ ] **Step 4: Commit**

```bash
git add deploy/caddy/Caddyfile docs/operations/single-node-deployment.md docs/operations/backup-and-recovery.md apps/api/README.md
git commit -m "docs: add single-node deployment runbook"
```

---

## Phase 4 Completion Checklist

- `apps/api` accepts production runtime config from `.env.production`
- API honors trusted-proxy mode, CORS allow-list, request body limits, and rate limits
- `/health`, `/health/live`, and `/health/ready` all work
- `scripts/ops/build-release.ps1` builds both apps successfully
- `scripts/ops/check-api-health.ps1` succeeds against the running API
- MySQL and upload backup scripts work
- MySQL and upload restore scripts exist and support dry-run verification with `-WhatIf`
- `deploy/caddy/Caddyfile` validates
- `docs/operations/*.md` document the exact single-node deployment and recovery flow

---

## Self-Review

### Spec coverage

- single-machine, non-container deployment: covered by Tasks 1, 4, 5, and 6
- MySQL on host and local-disk uploads: covered by Tasks 3 and 5
- future public access hardening: covered by Tasks 2 and 6
- operator-ready deployment flow: covered by Tasks 4, 5, and 6

### Placeholder scan

- no `TODO`
- no `TBD`
- no deferred “implement later” markers

### Type consistency

- runtime config names are consistent across Tasks 1 to 6:
  - `PUBLIC_BASE_URL`
  - `CORS_ORIGINS`
  - `TRUST_PROXY`
  - `BODY_LIMIT_BYTES`
  - `RATE_LIMIT_MAX`
  - `RATE_LIMIT_WINDOW_MS`

---

Plan complete and saved to `docs/superpowers/plans/2026-04-09-trace-scope-backend-phase-4-single-node-hardening-and-ops.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
