import { randomUUID } from 'node:crypto';
import { createSessionToken, hashSessionToken } from '../../infrastructure/security/sessionToken.js';
import { verifyPassword } from '../../infrastructure/security/password.js';

// BUG-018: constant-time login guard. Without this, the previous
// short-circuit (`!user || !user.isActive || !verifyPassword(...)`)
// would skip scrypt entirely when the user was missing or disabled,
// producing a ~80ms vs ~5ms timing gap that an attacker could use to
// enumerate valid usernames via repeated login probes.
//
// `verifyPassword` always runs scrypt(keylen=64). The dummy hash below
// has the same `salt:hashHex` shape (32 hex salt + 128 hex key) so the
// call costs the same as a real verification; the result is discarded.
// We use a salt of all-zero so it can never collide with any real
// hashPassword output (which uses randomBytes(16)).
const TIMING_SAFE_DUMMY_HASH =
  '00000000000000000000000000000000:' +
  '00000000000000000000000000000000' +
  '00000000000000000000000000000000' +
  '00000000000000000000000000000000' +
  '00000000000000000000000000000000';

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

    // BUG-018: always run scrypt exactly once, regardless of whether
    // the user exists or is active, so all three failure paths
    // (no user / disabled / wrong password) take the same time as the
    // happy path.
    const passwordHashToCheck = user?.passwordHash ?? TIMING_SAFE_DUMMY_HASH;
    const passwordOk = await verifyPassword(input.password, passwordHashToCheck);

    if (!user || !user.isActive || !passwordOk) {
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
