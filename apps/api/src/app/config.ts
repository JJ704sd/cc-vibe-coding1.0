export interface AppConfig {
  port: number;
  host: string;
  publicBaseUrl: string;
  maxUploadBytes: number;
  storageDir: string;
  mysqlHost: string;
  mysqlPort: number;
  mysqlUser: string;
  mysqlPassword: string;
  mysqlDatabase: string;
  sessionSecret: string;
  cookieSecure: boolean;
  adminBootstrapUsername: string;
  adminBootstrapPassword: string;
  corsOrigins: string[];
  trustProxy: boolean;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug';
  bodyLimitBytes: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
}

type EnvSource = Record<string, string | undefined>;

function requireEnv(env: EnvSource, name: string, fallback?: string): string {
  const value = env[name];
  if (!value && fallback !== undefined) {
    return fallback;
  }
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(env: EnvSource, name: string, fallback: string): string {
  return env[name] ?? fallback;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true';
}

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) throw new Error(`Invalid numeric environment value: ${value}`);
  return parsed;
}

function readCsv(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value.split(',').map(e => e.trim()).filter(Boolean);
}

/**
 * BUG-035: enforce that LOG_LEVEL is one of the values Pino / Fastify
 * actually accept. Without this, a typo like LOG_LEVEL=INFO (uppercase)
 * silently falls through to the cast and produces a logger that emits
 * zero events — much harder to diagnose than a startup error.
 */
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug'] as const;
function readLogLevel(value: string | undefined): AppConfig['logLevel'] {
  const raw = value ?? 'info';
  if (!(LOG_LEVELS as readonly string[]).includes(raw)) {
    throw new Error(
      `Invalid LOG_LEVEL "${raw}". Must be one of: ${LOG_LEVELS.join(', ')}`,
    );
  }
  return raw as AppConfig['logLevel'];
}

/**
 * BUG-035: CORS_ORIGINS must be a comma-separated list of URLs that
 * include a scheme. Bare hostnames like "example.com" silently pass
 * @fastify/cors's origin matcher (it accepts any non-empty string),
 * which then fails the actual CORS handshake at request time with a
 * confusing browser error. Fail fast at startup.
 */
function readCorsOrigins(value: string | undefined, fallback: string[]): string[] {
  const items = readCsv(value, fallback);
  for (const origin of items) {
    if (!origin.includes('://')) {
      throw new Error(
        `Invalid CORS_ORIGINS entry "${origin}". Each origin must be a full URL with scheme (e.g. https://example.com).`,
      );
    }
  }
  return items;
}

/**
 * BUG-035: rate-limit knobs must be positive integers; a non-positive
 * value silently produces an always-blocked or always-allowed limiter
 * depending on @fastify/rate-limit's interpretation. Reject at startup.
 */
function readPositiveInt(value: number, name: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(
      `Invalid ${name} value ${value}. Must be a positive integer.`,
    );
  }
  return value;
}

/**
 * BUG-017: SESSION_SECRET must be set explicitly in production. Without
 * this guard, an empty `.env.production` (or a forgotten env var) silently
 * boots the API with a hard-coded fallback string that any reader of the
 * open-source code knows — i.e. all production sessions would be forgeable.
 *
 * In non-production we still keep the dev fallback so `npm run dev`
 * keeps working out of the box; this matches the .env.example defaults.
 */
function readSessionSecret(env: EnvSource): string {
  const value = env.SESSION_SECRET;
  if (value) return value;
  if (env.NODE_ENV !== 'production') {
    return 'dev-secret-change-in-production';
  }
  throw new Error(
    'Missing required env: SESSION_SECRET (production requires explicit value; generate with `openssl rand -base64 48`)'
  );
}

/**
 * BUG-017: COOKIE_SECURE must be "true" in production, otherwise session
 * cookies travel over plaintext HTTP and can be sniffed off the wire.
 * We do not auto-default to true on production because explicit operator
 * opt-in prevents accidental flips during migration.
 */
function readCookieSecure(env: EnvSource): boolean {
  const parsed = env.COOKIE_SECURE === undefined ? false : env.COOKIE_SECURE === 'true';
  if (env.NODE_ENV === 'production' && !parsed) {
    throw new Error(
      'COOKIE_SECURE must be set to "true" in production (sessions must travel over HTTPS only)'
    );
  }
  return parsed;
}

export function loadConfigFrom(env: EnvSource): AppConfig {
  const publicBaseUrl = requireEnv(env, 'PUBLIC_BASE_URL', 'http://localhost:4000/uploads');

  return {
    port: Number(env.PORT ?? '4000'),
    host: optionalEnv(env, 'HOST', '0.0.0.0'),
    publicBaseUrl,
    maxUploadBytes: Number(env.MAX_UPLOAD_BYTES ?? '10485760'),
    // STORAGE_DIR is the canonical upload storage directory used by the API,
    // backup scripts, and deployment docs. UPLOAD_ROOT is a legacy alias kept
    // for backward compatibility with older deployments.
    storageDir: env.STORAGE_DIR ?? env.UPLOAD_ROOT ?? './storage',
    mysqlHost: optionalEnv(env, 'MYSQL_HOST', 'localhost'),
    mysqlPort: Number(optionalEnv(env, 'MYSQL_PORT', '3306')),
    mysqlUser: optionalEnv(env, 'MYSQL_USER', 'root'),
    mysqlPassword: optionalEnv(env, 'MYSQL_PASSWORD', ''),
    mysqlDatabase: optionalEnv(env, 'MYSQL_DATABASE', 'trace-scope-platform'),
    sessionSecret: readSessionSecret(env),
    cookieSecure: readCookieSecure(env),
    adminBootstrapUsername: optionalEnv(env, 'ADMIN_BOOTSTRAP_USERNAME', 'admin'),
    adminBootstrapPassword: optionalEnv(env, 'ADMIN_BOOTSTRAP_PASSWORD', 'admin123'),
    corsOrigins: readCorsOrigins(env.CORS_ORIGINS, [publicBaseUrl]),
    trustProxy: readBoolean(env.TRUST_PROXY, true),
    logLevel: readLogLevel(env.LOG_LEVEL),
    bodyLimitBytes: readNumber(env.BODY_LIMIT_BYTES, 10 * 1024 * 1024),
    rateLimitMax: readPositiveInt(readNumber(env.RATE_LIMIT_MAX, 1000), 'RATE_LIMIT_MAX'),
    rateLimitWindowMs: readPositiveInt(readNumber(env.RATE_LIMIT_WINDOW_MS, 60_000), 'RATE_LIMIT_WINDOW_MS'),
  };
}

export function loadConfig(): AppConfig {
  return loadConfigFrom(process.env);
}
