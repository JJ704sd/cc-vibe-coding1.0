import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './service.js';

// BUG-018 regression: every login attempt must run scrypt exactly once,
// regardless of whether the user exists, so attackers can't enumerate
// valid usernames via the ~80ms vs ~5ms timing gap. We assert this by
// spying on the module's verifyPassword — any of the three failure
// paths (no user / disabled / wrong password) must call it.

vi.mock('../../infrastructure/security/password.js', async () => {
  const actual = await vi.importActual<typeof import('../../infrastructure/security/password.js')>(
    '../../infrastructure/security/password.js',
  );
  return {
    ...actual,
    verifyPassword: vi.fn(async () => false),
  };
});

import { verifyPassword } from '../../infrastructure/security/password.js';

function buildRepository(overrides: Partial<{
  findUserByUsername: ReturnType<typeof vi.fn>;
  insertSession: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    findUserByUsername: vi.fn(async () => null),
    insertSession: vi.fn(async () => undefined),
    findSessionByHash: vi.fn(async () => null),
    deleteSessionByHash: vi.fn(async () => undefined),
    ...overrides,
  };
}

const noSessionInput = { username: 'admin', password: 'whatever', ipAddress: null, userAgent: null };

describe('AuthService.login — BUG-018 constant-time guard', () => {
  beforeEach(() => {
    // vi.fn() call history persists across tests by default; reset so
    // each test asserts against a clean counter.
    vi.mocked(verifyPassword).mockClear();
    vi.mocked(verifyPassword).mockResolvedValue(false);
  });
  it('runs scrypt even when the user does not exist', async () => {
    const repository = buildRepository();
    const service = new AuthService(repository);

    await expect(service.login(noSessionInput)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(repository.insertSession).not.toHaveBeenCalled();
  });

  it('runs scrypt when the user exists but is disabled', async () => {
    const repository = buildRepository({
      findUserByUsername: vi.fn(async () => ({
        id: 'u-1',
        username: 'admin',
        passwordHash: 'fake-salt:fake-hash',
        role: 'admin' as const,
        isActive: false,
      })),
    });
    const service = new AuthService(repository);

    await expect(service.login(noSessionInput)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(repository.insertSession).not.toHaveBeenCalled();
  });

  it('runs scrypt and creates a session when credentials are valid', async () => {
    vi.mocked(verifyPassword).mockResolvedValueOnce(true);
    const repository = buildRepository({
      findUserByUsername: vi.fn(async () => ({
        id: 'u-1',
        username: 'admin',
        passwordHash: 'fake-salt:fake-hash',
        role: 'admin' as const,
        isActive: true,
      })),
    });
    const service = new AuthService(repository);

    const result = await service.login(noSessionInput);
    expect(result.user.username).toBe('admin');
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(repository.insertSession).toHaveBeenCalledTimes(1);
  });
});