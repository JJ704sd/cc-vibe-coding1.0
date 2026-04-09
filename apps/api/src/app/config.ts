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
}

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (!value && fallback !== undefined) {
    return fallback;
  }
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? '4000'),
    host: process.env.HOST ?? '0.0.0.0',
    publicBaseUrl: optionalEnv('PUBLIC_BASE_URL', 'http://localhost:4000/uploads'),
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? '10485760'),
    storageDir: optionalEnv('STORAGE_DIR', './storage'),
    mysqlHost: optionalEnv('MYSQL_HOST', 'localhost'),
    mysqlPort: Number(optionalEnv('MYSQL_PORT', '3306')),
    mysqlUser: optionalEnv('MYSQL_USER', 'root'),
    mysqlPassword: optionalEnv('MYSQL_PASSWORD', ''),
    mysqlDatabase: optionalEnv('MYSQL_DATABASE', 'trace-scope-platform'),
    uploadRoot: optionalEnv('UPLOAD_ROOT', './uploads'),
    sessionSecret: requireEnv('SESSION_SECRET', 'dev-secret-change-in-production'),
    cookieSecure: (process.env.COOKIE_SECURE ?? 'false') === 'true',
    adminBootstrapUsername: optionalEnv('ADMIN_BOOTSTRAP_USERNAME', 'admin'),
    adminBootstrapPassword: optionalEnv('ADMIN_BOOTSTRAP_PASSWORD', 'admin123'),
  };
}
