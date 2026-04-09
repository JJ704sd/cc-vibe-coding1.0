import { getPool } from '../../infrastructure/db/db.js';

type AdminUserRow = {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  is_active: number;
};

type AdminSessionRow = {
  user_id: string;
  username: string;
  role: string;
  expires_at: Date;
};

export function createAuthRepository() {
  const pool = getPool();

  return {
    async findUserByUsername(username: string) {
      const rows = await pool.query<AdminUserRow>(
        'SELECT id, username, password_hash, role, is_active FROM admin_user WHERE username = ? LIMIT 1',
        [username],
      );

      const row = rows[0];
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        username: row.username,
        passwordHash: row.password_hash,
        role: row.role as 'admin',
        isActive: row.is_active === 1,
      };
    },

    async insertSession(input: { id: string; userId: string; sessionTokenHash: string; expiresAt: Date; ipAddress: string | null; userAgent: string | null }) {
      const now = new Date();
      await pool.execute(
        'INSERT INTO admin_session (id, user_id, session_token_hash, expires_at, created_at, last_seen_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [input.id, input.userId, input.sessionTokenHash, input.expiresAt, now, now, input.ipAddress, input.userAgent],
      );
    },

    async findSessionByHash(sessionTokenHash: string) {
      const rows = await pool.query<AdminSessionRow>(
        `SELECT s.user_id, u.username, u.role, s.expires_at
         FROM admin_session s
         INNER JOIN admin_user u ON u.id = s.user_id
         WHERE s.session_token_hash = ?
         LIMIT 1`,
        [sessionTokenHash],
      );

      const row = rows[0];
      if (!row) {
        return null;
      }

      return {
        userId: row.user_id,
        username: row.username,
        role: row.role as 'admin',
        expiresAt: row.expires_at,
      };
    },

    async deleteSessionByHash(sessionTokenHash: string) {
      await pool.execute(
        'DELETE FROM admin_session WHERE session_token_hash = ?',
        [sessionTokenHash],
      );
    },
  };
}
