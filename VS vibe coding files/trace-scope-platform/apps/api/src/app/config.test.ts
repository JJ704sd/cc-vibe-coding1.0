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
