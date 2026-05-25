import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../../app/config.js';
import { hashPassword } from '../../infrastructure/security/password.js';
import { getPool } from '../../infrastructure/db/db.js';

type AdminUserRow = {
  id: string;
  username: string;
};

export async function ensureBootstrapAdmin(config: AppConfig) {
  const pool = getPool();
  const rows = await pool.query<AdminUserRow>(
    'SELECT id FROM admin_user WHERE username = ? LIMIT 1',
    [config.adminBootstrapUsername],
  );

  if (rows.length > 0) {
    return;
  }

  const now = new Date();
  const passwordHash = await hashPassword(config.adminBootstrapPassword);

  await pool.execute(
    'INSERT INTO admin_user (id, username, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
    [randomUUID(), config.adminBootstrapUsername, passwordHash, 'admin', now, now],
  );
}
