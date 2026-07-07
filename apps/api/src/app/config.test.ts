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

  it('prefers STORAGE_DIR over the legacy UPLOAD_ROOT alias', () => {
    const config = loadConfigFrom({
      STORAGE_DIR: 'D:/canonical/uploads',
      UPLOAD_ROOT: 'D:/legacy/uploads',
    });

    expect(config.storageDir).toBe('D:/canonical/uploads');
  });

  it('falls back to UPLOAD_ROOT when STORAGE_DIR is not set', () => {
    const config = loadConfigFrom({
      UPLOAD_ROOT: 'D:/legacy/uploads',
    });

    expect(config.storageDir).toBe('D:/legacy/uploads');
  });

  it('defaults storageDir to ./storage when neither STORAGE_DIR nor UPLOAD_ROOT is set', () => {
    const config = loadConfigFrom({});

    expect(config.storageDir).toBe('./storage');
  });

  // BUG-017: production-time validation of SESSION_SECRET and COOKIE_SECURE.
  // Without these guards, an empty .env.production would silently boot with
  // a hard-coded dev fallback that any reader of the source knows.

  it('throws when SESSION_SECRET is unset in production', () => {
    expect(() =>
      loadConfigFrom({
        NODE_ENV: 'production',
        MYSQL_PASSWORD: 'x',
        PUBLIC_BASE_URL: 'https://trace.example.com',
      })
    ).toThrow(/SESSION_SECRET/);
  });

  it('throws when COOKIE_SECURE is not "true" in production', () => {
    expect(() =>
      loadConfigFrom({
        NODE_ENV: 'production',
        SESSION_SECRET: 'some-long-random-string',
        MYSQL_PASSWORD: 'x',
        PUBLIC_BASE_URL: 'https://trace.example.com',
      })
    ).toThrow(/COOKIE_SECURE/);
  });

  it('accepts an explicit SESSION_SECRET + COOKIE_SECURE=true in production', () => {
    const config = loadConfigFrom({
      NODE_ENV: 'production',
      SESSION_SECRET: 'some-long-random-string',
      COOKIE_SECURE: 'true',
      MYSQL_PASSWORD: 'x',
      PUBLIC_BASE_URL: 'https://trace.example.com',
    });

    expect(config.sessionSecret).toBe('some-long-random-string');
    expect(config.cookieSecure).toBe(true);
  });

  it('keeps the dev SESSION_SECRET fallback when NODE_ENV is not production', () => {
    const config = loadConfigFrom({});

    expect(config.sessionSecret).toBe('dev-secret-change-in-production');
    expect(config.cookieSecure).toBe(false);
  });
});
