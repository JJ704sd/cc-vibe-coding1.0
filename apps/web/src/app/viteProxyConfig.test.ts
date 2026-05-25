import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('vite.config.ts', 'utf-8');

describe('vite dev proxy', () => {
  it('targets the API through the IPv4 loopback address', () => {
    expect(source).toContain("target: 'http://127.0.0.1:4000'");
    expect(source).not.toContain("target: 'http://localhost:4000'");
  });
});
