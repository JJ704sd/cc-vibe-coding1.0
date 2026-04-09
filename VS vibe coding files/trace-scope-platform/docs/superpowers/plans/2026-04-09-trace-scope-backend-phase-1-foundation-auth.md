# Trace Scope Backend Phase 1 Foundation/Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable `apps/api` service with Fastify, MySQL connectivity, migrations, bootstrap admin creation, and server-side session login/logout/session endpoints.

**Architecture:** Create a standalone `apps/api` package. Keep Fastify bootstrap in `src/app`, MySQL helpers in `src/infrastructure/db`, security helpers in `src/infrastructure/security`, and auth logic in `src/modules/auth`. This phase intentionally stops at the backend foundation so it can be verified and deployed before content CRUD is added.

**Tech Stack:** Node.js, TypeScript, Fastify, Vitest, mysql2/promise, @fastify/cookie, dotenv, Node `crypto`

---

## Scope Split

This is Phase 1 of the backend work.

Follow-up plans should be written separately:

1. Phase 2: admin content CRUD for `project`, `location`, `route`, `media_set`, `media_image`, `upload_file`
2. Phase 3: public read APIs and frontend migration off `localStorage`

This plan only covers the foundation and authentication layer.

---

## File Map

### New files

- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/vitest.config.ts`
- `apps/api/.env.example`
- `apps/api/src/main.ts`
- `apps/api/src/app/config.ts`
- `apps/api/src/app/errors.ts`
- `apps/api/src/app/buildServer.ts`
- `apps/api/src/app/buildServer.test.ts`
- `apps/api/src/infrastructure/db/pool.ts`
- `apps/api/src/infrastructure/db/runInTransaction.ts`
- `apps/api/src/infrastructure/db/runInTransaction.test.ts`
- `apps/api/src/infrastructure/db/migrate.ts`
- `apps/api/src/infrastructure/db/sql/001_initial_schema.sql`
- `apps/api/src/infrastructure/security/password.ts`
- `apps/api/src/infrastructure/security/password.test.ts`
- `apps/api/src/infrastructure/security/sessionToken.ts`
- `apps/api/src/modules/auth/repository.ts`
- `apps/api/src/modules/auth/service.ts`
- `apps/api/src/modules/auth/routes.ts`
- `apps/api/src/modules/auth/routes.test.ts`
- `apps/api/src/modules/auth/bootstrapAdmin.ts`
- `apps/api/README.md`

### Existing files intentionally untouched

- `apps/web/src/services/storage/adminDataStore.ts`
- `apps/web/src/services/storage/publicDataReader.ts`
- `apps/web/src/services/auth/authContext.tsx`

---

## Task 1: Bootstrap `apps/api` and prove the server can start cleanly

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/.env.example`
- Create: `apps/api/src/app/config.ts`
- Create: `apps/api/src/app/errors.ts`
- Create: `apps/api/src/app/buildServer.ts`
- Create: `apps/api/src/app/buildServer.test.ts`
- Create: `apps/api/src/main.ts`

- [ ] **Step 1: Write the failing bootstrap test**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from './buildServer';

describe('buildServer', () => {
  const apps: Array<ReturnType<typeof buildServer>> = [];

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
  });

  it('serves GET /health', async () => {
    const app = buildServer();
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run the test to confirm the package does not exist yet**

Run: `cd apps/api && npm test -- src/app/buildServer.test.ts`

Expected: FAIL with a missing `package.json` or missing `./buildServer`.

- [ ] **Step 3: Add the API package and minimal Fastify bootstrap**

Create `apps/api/package.json`:

```json
{
  "name": "trace-scope-api",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js",
    "test": "vitest run",
    "migrate": "tsx src/infrastructure/db/migrate.ts"
  },
  "dependencies": {
    "@fastify/cookie": "^11.0.2",
    "dotenv": "^16.4.7",
    "fastify": "^5.2.1",
    "mysql2": "^3.12.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.1",
    "tsx": "^4.19.3",
    "typescript": "^5.8.3",
    "vitest": "^4.1.2"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "rootDir": "src",
    "outDir": "dist",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

Create `apps/api/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    pool: 'threads',
  },
});
```

Create `apps/api/src/app/buildServer.ts`:

```ts
import Fastify from 'fastify';
import { toErrorResponse } from './errors.js';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({ status: 'ok' }));

  app.setErrorHandler((error, _request, reply) => {
    const mapped = toErrorResponse(error);
    reply.status(mapped.statusCode).send(mapped.body);
  });

  return app;
}
```

Create `apps/api/src/app/errors.ts`:

```ts
export function toErrorResponse(error: unknown) {
  if (typeof error === 'object' && error !== null && 'statusCode' in error && 'message' in error && 'code' in error) {
    const appError = error as { statusCode: number; message: string; code: string; details?: unknown };
    return {
      statusCode: appError.statusCode,
      body: {
        code: appError.code,
        message: appError.message,
        details: appError.details ?? null,
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error',
      details: null,
    },
  };
}
```

Create `apps/api/src/app/config.ts`:

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
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? '4000'),
    mysqlHost: requireEnv('MYSQL_HOST'),
    mysqlPort: Number(process.env.MYSQL_PORT ?? '3306'),
    mysqlUser: requireEnv('MYSQL_USER'),
    mysqlPassword: requireEnv('MYSQL_PASSWORD'),
    mysqlDatabase: requireEnv('MYSQL_DATABASE'),
    uploadRoot: requireEnv('UPLOAD_ROOT'),
    sessionSecret: requireEnv('SESSION_SECRET'),
    cookieSecure: (process.env.COOKIE_SECURE ?? 'false') === 'true',
    adminBootstrapUsername: requireEnv('ADMIN_BOOTSTRAP_USERNAME'),
    adminBootstrapPassword: requireEnv('ADMIN_BOOTSTRAP_PASSWORD'),
  };
}
```

Create `apps/api/.env.example`:

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
```

Create `apps/api/src/main.ts`:

```ts
import 'dotenv/config';
import { buildServer } from './app/buildServer.js';
import { loadConfig } from './app/config.js';

async function main() {
  const config = loadConfig();
  const app = buildServer();
  await app.listen({ host: '0.0.0.0', port: config.port });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 4: Install dependencies**

Run: `cd apps/api && npm install`

Expected: installs Fastify, mysql2, dotenv, tsx, TypeScript, and Vitest cleanly.

- [ ] **Step 5: Run the bootstrap test again**

Run: `cd apps/api && npm test -- src/app/buildServer.test.ts`

Expected: PASS with `GET /health` returning `{ "status": "ok" }`.

- [ ] **Step 6: Commit the bootstrap**

```bash
git add apps/api/package.json apps/api/package-lock.json apps/api/tsconfig.json apps/api/vitest.config.ts apps/api/.env.example apps/api/src/app/config.ts apps/api/src/app/errors.ts apps/api/src/app/buildServer.ts apps/api/src/app/buildServer.test.ts apps/api/src/main.ts
git commit -m "feat: bootstrap trace scope api"
```

---

## Task 2: Add MySQL pool, transaction helper, and the initial auth/session schema

**Files:**
- Create: `apps/api/src/infrastructure/db/pool.ts`
- Create: `apps/api/src/infrastructure/db/runInTransaction.ts`
- Create: `apps/api/src/infrastructure/db/runInTransaction.test.ts`
- Create: `apps/api/src/infrastructure/db/migrate.ts`
- Create: `apps/api/src/infrastructure/db/sql/001_initial_schema.sql`

- [ ] **Step 1: Write the failing transaction-helper test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { runInTransaction } from './runInTransaction';

describe('runInTransaction', () => {
  it('commits successful work', async () => {
    const calls: string[] = [];
    const connection = {
      beginTransaction: vi.fn(async () => calls.push('begin')),
      commit: vi.fn(async () => calls.push('commit')),
      rollback: vi.fn(async () => calls.push('rollback')),
      release: vi.fn(() => calls.push('release')),
    };

    const pool = {
      getConnection: vi.fn(async () => connection),
    };

    const result = await runInTransaction(pool as never, async () => 'done');

    expect(result).toBe('done');
    expect(calls).toEqual(['begin', 'commit', 'release']);
  });
});
```

- [ ] **Step 2: Run the infrastructure test to confirm the helper is missing**

Run: `cd apps/api && npm test -- src/infrastructure/db/runInTransaction.test.ts`

Expected: FAIL with missing `./runInTransaction`.

- [ ] **Step 3: Add the MySQL infrastructure**

Create `apps/api/src/infrastructure/db/pool.ts`:

```ts
import mysql from 'mysql2/promise';
import type { AppConfig } from '../../app/config.js';

export function createPool(config: AppConfig) {
  return mysql.createPool({
    host: config.mysqlHost,
    port: config.mysqlPort,
    user: config.mysqlUser,
    password: config.mysqlPassword,
    database: config.mysqlDatabase,
    waitForConnections: true,
    connectionLimit: 10,
  });
}
```

Create `apps/api/src/infrastructure/db/runInTransaction.ts`:

```ts
import type { Pool, PoolConnection } from 'mysql2/promise';

export async function runInTransaction<T>(pool: Pool, work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

Create `apps/api/src/infrastructure/db/sql/001_initial_schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS admin_user (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_session (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  session_token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  CONSTRAINT fk_admin_session_user FOREIGN KEY (user_id) REFERENCES admin_user(id) ON DELETE CASCADE
);
```

Create `apps/api/src/infrastructure/db/migrate.ts`:

```ts
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../../app/config.js';
import { createPool } from './pool.js';

async function main() {
  const config = loadConfig();
  const pool = createPool(config);
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sqlDir = join(currentDir, 'sql');
  const files = (await readdir(sqlDir)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = await readFile(join(sqlDir, file), 'utf8');
    await pool.query(sql);
    console.log(`Applied ${file}`);
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 4: Run the transaction-helper test again**

Run: `cd apps/api && npm test -- src/infrastructure/db/runInTransaction.test.ts`

Expected: PASS with the transaction helper committing successful work.

- [ ] **Step 5: Apply the initial schema**

Run: `cd apps/api && npm run migrate`

Expected: console output includes `Applied 001_initial_schema.sql` and exits cleanly.

- [ ] **Step 6: Commit the database foundation**

```bash
git add apps/api/src/infrastructure/db/pool.ts apps/api/src/infrastructure/db/runInTransaction.ts apps/api/src/infrastructure/db/runInTransaction.test.ts apps/api/src/infrastructure/db/migrate.ts apps/api/src/infrastructure/db/sql/001_initial_schema.sql
git commit -m "feat: add mysql foundation for api"
```

---

## Task 3: Implement bootstrap admin creation, password hashing, sessions, and auth routes

**Files:**
- Create: `apps/api/src/infrastructure/security/password.ts`
- Create: `apps/api/src/infrastructure/security/password.test.ts`
- Create: `apps/api/src/infrastructure/security/sessionToken.ts`
- Create: `apps/api/src/modules/auth/repository.ts`
- Create: `apps/api/src/modules/auth/service.ts`
- Create: `apps/api/src/modules/auth/routes.ts`
- Create: `apps/api/src/modules/auth/routes.test.ts`
- Create: `apps/api/src/modules/auth/bootstrapAdmin.ts`
- Create: `apps/api/README.md`
- Modify: `apps/api/src/app/buildServer.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Write the failing password and auth route tests**

```ts
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../infrastructure/security/password';

describe('password helpers', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('trace-scope-2026');
    expect(await verifyPassword('trace-scope-2026', hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });
});
```

```ts
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { describe, expect, it, vi } from 'vitest';
import { registerAuthRoutes } from './routes';

describe('registerAuthRoutes', () => {
  it('sets a session cookie on successful login', async () => {
    const authService = {
      login: vi.fn(async () => ({
        sessionToken: 'plain-token',
        user: { id: 'user-1', username: 'admin', role: 'admin' as const },
      })),
      getSession: vi.fn(),
      logout: vi.fn(),
    };

    const app = Fastify();
    await app.register(cookie);
    await registerAuthRoutes(app, { authService, cookieSecure: false });

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { username: 'admin', password: 'change-me-now' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.cookies[0]?.name).toBe('trace_scope_session');
  });
});
```

- [ ] **Step 2: Run the auth tests to confirm the module is missing**

Run: `cd apps/api && npm test -- src/infrastructure/security/password.test.ts src/modules/auth/routes.test.ts`

Expected: FAIL with missing `./password` and `./routes`.

- [ ] **Step 3: Add password/session helpers, bootstrap admin logic, and auth routes**

Create `apps/api/src/infrastructure/security/password.ts`:

```ts
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(':');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(key, Buffer.from(hashHex, 'hex'));
}
```

Create `apps/api/src/infrastructure/security/sessionToken.ts`:

```ts
import { createHash, randomBytes } from 'node:crypto';

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
```

Create `apps/api/src/modules/auth/service.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { createSessionToken, hashSessionToken } from '../../infrastructure/security/sessionToken.js';
import { verifyPassword } from '../../infrastructure/security/password.js';

export class AuthService {
  constructor(
    private readonly repository: {
      findUserByUsername(username: string): Promise<{ id: string; username: string; passwordHash: string; role: 'admin'; isActive: boolean } | null>;
      insertSession(input: { id: string; userId: string; sessionTokenHash: string; expiresAt: Date; ipAddress: string | null; userAgent: string | null }): Promise<void>;
      findSessionByHash(sessionTokenHash: string): Promise<{ userId: string; username: string; role: 'admin'; expiresAt: Date } | null>;
      deleteSessionByHash(sessionTokenHash: string): Promise<void>;
    },
  ) {}

  async login(input: { username: string; password: string; ipAddress: string | null; userAgent: string | null }) {
    const user = await this.repository.findUserByUsername(input.username);

    if (!user || !user.isActive || !(await verifyPassword(input.password, user.passwordHash))) {
      throw Object.assign(new Error('Invalid username or password'), {
        code: 'INVALID_CREDENTIALS',
        statusCode: 401,
        details: null,
      });
    }

    const sessionToken = createSessionToken();
    await this.repository.insertSession({
      id: randomUUID(),
      userId: user.id,
      sessionTokenHash: hashSessionToken(sessionToken),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      sessionToken,
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  async getSession(input: { sessionToken: string }) {
    const session = await this.repository.findSessionByHash(hashSessionToken(input.sessionToken));
    if (!session || session.expiresAt.getTime() < Date.now()) {
      return null;
    }
    return { user: { id: session.userId, username: session.username, role: session.role } };
  }

  async logout(input: { sessionToken: string }) {
    await this.repository.deleteSessionByHash(hashSessionToken(input.sessionToken));
  }
}
```

Create `apps/api/src/modules/auth/routes.ts`:

```ts
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
```

Create `apps/api/src/modules/auth/bootstrapAdmin.ts`:

```ts
import { randomUUID } from 'node:crypto';
import type { Pool } from 'mysql2/promise';
import type { AppConfig } from '../../app/config.js';
import { hashPassword } from '../../infrastructure/security/password.js';

export async function ensureBootstrapAdmin(pool: Pool, config: AppConfig) {
  const [rows] = await pool.query(
    'SELECT id FROM admin_user WHERE username = ? LIMIT 1',
    [config.adminBootstrapUsername],
  );

  if (Array.isArray(rows) && rows.length > 0) {
    return;
  }

  const now = new Date();
  const passwordHash = await hashPassword(config.adminBootstrapPassword);

  await pool.query(
    'INSERT INTO admin_user (id, username, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
    [randomUUID(), config.adminBootstrapUsername, passwordHash, 'admin', now, now],
  );
}
```

Call `ensureBootstrapAdmin(pool, config)` from `src/main.ts` before `app.listen`.

Modify `apps/api/src/app/buildServer.ts` to register `@fastify/cookie` and `registerAuthRoutes(...)` when a real `authService` is supplied.

Create `apps/api/README.md` with:

```md
# Trace Scope API Phase 1

1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Create the MySQL database named in `MYSQL_DATABASE`
4. Run `npm run migrate`
5. Run `npm run dev`
6. Log in through `POST /api/admin/login`
```

- [ ] **Step 4: Run the auth tests again**

Run: `cd apps/api && npm test -- src/infrastructure/security/password.test.ts src/modules/auth/routes.test.ts`

Expected: PASS with both password verification and login-cookie tests green.

- [ ] **Step 5: Smoke-test the real login flow**

Run: `cd apps/api && npm run dev`

Then in a second terminal:

```bash
curl -i -X POST http://localhost:4000/api/admin/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"change-me-now\"}"
```

Expected: `200 OK`, a `Set-Cookie: trace_scope_session=...` header, and a JSON body containing the bootstrap admin user.

- [ ] **Step 6: Commit the auth foundation**

```bash
git add apps/api/src/infrastructure/security/password.ts apps/api/src/infrastructure/security/password.test.ts apps/api/src/infrastructure/security/sessionToken.ts apps/api/src/modules/auth/repository.ts apps/api/src/modules/auth/service.ts apps/api/src/modules/auth/routes.ts apps/api/src/modules/auth/routes.test.ts apps/api/src/modules/auth/bootstrapAdmin.ts apps/api/src/app/buildServer.ts apps/api/src/main.ts apps/api/README.md
git commit -m "feat: add admin auth to trace scope api"
```

---

## Self-Review Checklist

1. **Spec coverage**
   - Fastify app scaffold: Task 1
   - MySQL and migration runner: Task 2
   - admin bootstrap, password hashing, sessions, login/logout/session API: Task 3

2. **Placeholder scan**
   - no `TODO`
   - no vague "handle later" phrasing
   - all steps include exact paths, commands, and expected outcomes

3. **Type consistency**
   - session cookie name is always `trace_scope_session`
   - auth role is always `admin` in Phase 1
   - session persistence always uses `session_token_hash`

4. **Scope check**
   - plan intentionally stops before content CRUD
   - resulting slice is still runnable, testable, and deployable on its own
