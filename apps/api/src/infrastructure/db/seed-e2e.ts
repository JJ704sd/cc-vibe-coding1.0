import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../../app/config.js';
import { createPool } from './pool.js';

/**
 * E2E fixture seeder — wipes business tables and inserts a known-good
 * project/location/mediaset/route/image set that Playwright tests rely on.
 *
 * Run via `npm run seed:e2e` from `apps/api`. The admin user is created by
 * the API bootstrap path on first start (`bootstrapAdmin`), so we never
 * touch `admin_user` here.
 *
 * IDs of the inserted rows are written to
 * `apps/web/playwright-report/.last-seed.json` so test specs can address
 * the fixture entities by stable IDs.
 */
type SeedIds = {
  projectId: string;
  projectSlug: string;
  locationId: string;
  mediaSetId: string;
  image1Id: string;
  image2Id: string;
  routeId: string;
  uploadFileId: string;
};

const FIXTURE_TABLES = [
  'route_location',
  'route',
  'media_image',
  'media_set',
  'location',
  'project_tag',
  'project',
  'upload_file',
  'admin_session',
] as const;

async function main(): Promise<void> {
  const config = loadConfig();

  // Refuse to wipe a database whose name doesn't contain `e2e`. The seed
  // deletes every business row, so pointing it at a real database would
  // destroy content. This guard runs even if `npm run seed:e2e` is invoked
  // manually with the wrong env.
  if (!config.mysqlDatabase.toLowerCase().includes('e2e')) {
    throw new Error(
      `[seed-e2e] refusing to run against database "${config.mysqlDatabase}". ` +
        `Seed-e2e requires a database name containing "e2e" (e.g. "trace_scope_e2e"). ` +
        `Set MYSQL_DATABASE before running.`,
    );
  }

  const pool = createPool(config);

  console.log(`[seed-e2e] connected to ${config.mysqlHost}:${config.mysqlPort}/${config.mysqlDatabase}`);

  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    // The fixture DB is throwaway by design, so we wipe every business row
    // (and admin sessions) on each run. The bootstrap admin row is kept
    // because we never include `admin_user` in FIXTURE_TABLES.
    for (const table of FIXTURE_TABLES) {
      await pool.execute(`DELETE FROM ${table}`);
    }
  } finally {
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  const ids: SeedIds = {
    projectId: randomUUID(),
    projectSlug: 'e2e-test-project',
    locationId: randomUUID(),
    mediaSetId: randomUUID(),
    image1Id: randomUUID(),
    image2Id: randomUUID(),
    routeId: randomUUID(),
    uploadFileId: randomUUID(),
  };

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // 1) upload_file (PNG metadata — Playwright tests never fetch the bytes,
  //    the /api/public/uploads/:fileId endpoint is exercised separately).
  await pool.execute(
    `INSERT INTO upload_file (id, storage_key, original_filename, mime_type, byte_size, sha256_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      ids.uploadFileId,
      'e2e-fixtures/sample.png',
      'sample.png',
      'image/png',
      1024,
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      now,
    ],
  );

  // 2) project (published so /api/public/projects picks it up)
  await pool.execute(
    `INSERT INTO project (id, title, slug, summary, description, cover_upload_file_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ids.projectId,
      'E2E Test Project',
      ids.projectSlug,
      'A fixture project used by Playwright end-to-end tests.',
      'Created by apps/api/src/infrastructure/db/seed-e2e.ts. Safe to delete.',
      ids.uploadFileId,
      'published',
      now,
      now,
    ],
  );
  await pool.execute(
    `INSERT INTO project_tag (project_id, tag) VALUES (?, ?), (?, ?)`,
    [ids.projectId, 'e2e', ids.projectId, 'fixture'],
  );

  // 3) location (Beijing — matches /api/public/map-relationship assertions)
  await pool.execute(
    `INSERT INTO location (id, project_id, name, slug, description, latitude, longitude, address_text, visit_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ids.locationId,
      ids.projectId,
      'Tiananmen',
      'tiananmen',
      'Beijing central square fixture for E2E.',
      39.9054,
      116.3976,
      'Beijing',
      1,
      now,
      now,
    ],
  );

  // 4) media_set (spin360 — kept separate from any gallery fixture by design)
  await pool.execute(
    `INSERT INTO media_set (id, project_id, location_id, type, title, description, cover_upload_file_id, is_featured, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ids.mediaSetId,
      ids.projectId,
      ids.locationId,
      'spin360',
      'E2E Spin Set',
      'Spin360 fixture for E2E tests.',
      ids.uploadFileId,
      1,
      now,
      now,
    ],
  );

  // 5) media_image x 2
  await pool.execute(
    `INSERT INTO media_image (id, media_set_id, upload_file_id, alt_text, caption, sort_order, latitude, longitude, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ids.image1Id,
      ids.mediaSetId,
      ids.uploadFileId,
      'frame-1',
      'Frame 1 of spin360',
      0,
      39.9054,
      116.3976,
      now,
      now,
      ids.image2Id,
      ids.mediaSetId,
      ids.uploadFileId,
      'frame-2',
      'Frame 2 of spin360',
      1,
      39.9054,
      116.3976,
      now,
      now,
    ],
  );

  // 6) route + route_location
  await pool.execute(
    `INSERT INTO route (id, project_id, name, description, line_style, color, is_featured, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ids.routeId,
      ids.projectId,
      'E2E Route',
      'Route fixture for E2E tests.',
      'solid',
      '#3b82f6',
      0,
      now,
      now,
    ],
  );
  await pool.execute(
    `INSERT INTO route_location (route_id, location_id, sort_order) VALUES (?, ?, ?)`,
    [ids.routeId, ids.locationId, 0],
  );

  await pool.end();

  const reportDir = join(process.cwd(), '..', 'web', 'playwright-report');
  await mkdir(reportDir, { recursive: true });
  const seedFile = join(reportDir, '.last-seed.json');
  await writeFile(seedFile, JSON.stringify(ids, null, 2));

  console.log('[seed-e2e] done. IDs:', ids);
  console.log(`[seed-e2e] wrote ${seedFile}`);
}

main().catch((error: unknown) => {
  console.error('[seed-e2e] failed:', error);
  process.exit(1);
});