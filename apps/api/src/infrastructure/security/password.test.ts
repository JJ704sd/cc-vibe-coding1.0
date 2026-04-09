import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../infrastructure/security/password';

describe('password helpers', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('trace-scope-2026');
    expect(await verifyPassword('trace-scope-2026', hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });
});
