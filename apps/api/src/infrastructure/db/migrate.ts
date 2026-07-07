import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../../app/config.js';
import { createPool } from './pool.js';

async function main() {
  const config = loadConfig();
  const pool = createPool(config);
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sqlDir = join(currentDir, 'sql');
  const files = (await readdir(sqlDir)).filter((file) => file.endsWith('.sql')).sort();

  // BUG-036: track which migration files have already been applied so
  // a re-run of `npm run migrate` is idempotent and so the operator
  // can safely add new ALTER statements without worrying about whether
  // a previous run already changed the schema. Without this table the
  // loader re-executes every statement every run, and any future ALTER
  // (not CREATE TABLE IF NOT EXISTS) blows up on the second invocation.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // mysql2 native pool returns [rows, fields] from query — cast rows to
// the shape we expect, since the wrapper DbPool (db.ts) is what
// strips the FieldPacket array.
const queryResult = (await pool.query(
  `SELECT filename FROM schema_migrations`,
)) as unknown as [{ filename: string }[], unknown];
const applied = new Set(queryResult[0].map((row) => row.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    const sql = await readFile(join(sqlDir, file), 'utf8');
    const statements = sql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.query(statement);
    }

    // Record the file as applied so the next run skips it.
    await pool.execute(
      `INSERT INTO schema_migrations (filename) VALUES (?)`,
      [file],
    );

    console.log(`Applied ${file}`);
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});