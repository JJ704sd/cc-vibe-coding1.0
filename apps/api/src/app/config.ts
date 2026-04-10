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
  uploadRoot: string;
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

export function loadConfigFrom(env: EnvSource): AppConfig {
  const publicBaseUrl = requireEnv(env, 'PUBLIC_BASE_URL', 'http://localhost:4000/uploads');

  return {
    port: Number(env.PORT ?? '4000'),
    host: optionalEnv(env, 'HOST', '0.0.0.0'),
    publicBaseUrl,
    maxUploadBytes: Number(env.MAX_UPLOAD_BYTES ?? '10485760'),
    storageDir: optionalEnv(env, 'STORAGE_DIR', './storage'),
    mysqlHost: optionalEnv(env, 'MYSQL_HOST', 'localhost'),
    mysqlPort: Number(optionalEnv(env, 'MYSQL_PORT', '3306')),
    mysqlUser: optionalEnv(env, 'MYSQL_USER', 'root'),
    mysqlPassword: optionalEnv(env, 'MYSQL_PASSWORD', ''),
    mysqlDatabase: optionalEnv(env, 'MYSQL_DATABASE', 'trace-scope-platform'),
    uploadRoot: optionalEnv(env, 'UPLOAD_ROOT', './uploads'),
    sessionSecret: requireEnv(env, 'SESSION_SECRET', 'dev-secret-change-in-production'),
    cookieSecure: readBoolean(env.COOKIE_SECURE, false),
    adminBootstrapUsername: optionalEnv(env, 'ADMIN_BOOTSTRAP_USERNAME', 'admin'),
    adminBootstrapPassword: optionalEnv(env, 'ADMIN_BOOTSTRAP_PASSWORD', 'admin123'),
    corsOrigins: readCsv(env.CORS_ORIGINS, [publicBaseUrl]),
    trustProxy: readBoolean(env.TRUST_PROXY, true),
    logLevel: (env.LOG_LEVEL ?? 'info') as AppConfig['logLevel'],
    bodyLimitBytes: readNumber(env.BODY_LIMIT_BYTES, 10 * 1024 * 1024),
    rateLimitMax: readNumber(env.RATE_LIMIT_MAX, 60),
    rateLimitWindowMs: readNumber(env.RATE_LIMIT_WINDOW_MS, 60_000),
  };
}

export function loadConfig(): AppConfig {
  return loadConfigFrom(process.env);
}
