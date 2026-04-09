import { randomUUID } from 'node:crypto';
import { createSessionToken, hashSessionToken } from '../../infrastructure/security/sessionToken.js';
import { verifyPassword } from '../../infrastructure/security/password.js';

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

    if (!user || !user.isActive || !(await verifyPassword(input.password, user.passwordHash))) {
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
