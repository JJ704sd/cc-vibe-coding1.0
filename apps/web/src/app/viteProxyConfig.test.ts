import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('vite.config.ts', 'utf-8');

describe('vite dev proxy', () => {
  it('targets the API through the IPv4 loopback address', () => {
    expect(source).toContain("target: 'http://127.0.0.1:4000'");
    expect(source).not.toContain("target: 'http://localhost:4000'");
  });

  it('binds the dev server to the IPv4 loopback so the page works at http://127.0.0.1:5173', () => {
    // Default `localhost` resolves to IPv6 first on Windows hosts; without
    // an explicit host binding the Vite server lands on [::1]:5173 and
    // 127.0.0.1:5173 silently refuses the connection (ERR_CONNECTION_REFUSED).
    expect(source).toContain("host: '127.0.0.1'");
  });
});
