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

  for (const file of files) {
    const sql = await readFile(join(sqlDir, file), 'utf8');
    const statements = sql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.query(statement);
    }

    console.log(`Applied ${file}`);
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
