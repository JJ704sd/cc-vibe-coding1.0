# Trace Scope Backend Phase 2 Content CRUD and Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `apps/api` beyond Phase 1 auth so admin users can create, edit, delete, and reorder projects, locations, routes, media sets, media images, and uploaded files through authenticated backend APIs.

**Architecture:** Keep one Fastify service in `apps/api`. Add a dedicated `uploads` module for multipart intake and local-disk storage, then add focused CRUD modules for `projects`, `locations`, `routes`, `media-sets`, and `media-images`. Move the admin frontend from browser-local persistence to thin API clients and feature hooks while leaving the public pages on the local read model until Phase 3.

**Tech Stack:** Node.js, TypeScript, Fastify, `@fastify/multipart`, MySQL, Vitest, React

---

## Preconditions

- Phase 1 must already exist in `apps/api` with auth, session routes, migration runner, and MySQL helpers.
- This phase does **not** replace the public data flow in:
  - `apps/web/src/services/storage/publicDataReader.ts`
  - `apps/web/src/services/storage/usePublicData.ts`

---

## File Map

### New backend files

- `apps/api/src/infrastructure/db/sql/002_content_and_uploads.sql`
- `apps/api/src/infrastructure/storage/localFileStorage.ts`
- `apps/api/src/infrastructure/storage/localFileStorage.test.ts`
- `apps/api/src/modules/uploads/{types,schemas,repository,service,service.test,routes,routes.test}.ts`
- `apps/api/src/modules/projects/{schemas,repository,service,service.test,routes}.ts`
- `apps/api/src/modules/locations/{schemas,repository,service,service.test,routes}.ts`
- `apps/api/src/modules/routes/{schemas,repository,service,service.test,routes}.ts`
- `apps/api/src/modules/media-sets/{schemas,repository,service,service.test,routes}.ts`
- `apps/api/src/modules/media-images/{schemas,repository,service,service.test,routes}.ts`

### New frontend files

- `apps/web/src/services/api/httpClient.ts`
- `apps/web/src/features/projects/api/useAdminProjects.ts`
- `apps/web/src/features/locations/api/useAdminLocations.ts`
- `apps/web/src/features/routes/api/useAdminRoutes.ts`
- `apps/web/src/features/media/api/useAdminMedia.ts`
- `apps/web/src/features/media/api/uploadFile.ts`

### Files to modify

- `apps/api/package.json`
- `apps/api/src/app/config.ts`
- `apps/api/src/app/buildServer.ts`
- `apps/web/src/services/auth/authContext.tsx`
- `apps/web/src/services/storage/useAdminData.ts`
- `apps/web/src/app/routes/admin/projects/AdminProjectsPage.tsx`
- `apps/web/src/app/routes/admin/locations/AdminLocationsPage.tsx`
- `apps/web/src/app/routes/admin/routes/AdminRoutesPage.tsx`
- `apps/web/src/app/routes/admin/media/AdminMediaPage.tsx`

---

## Task 1: Add the content schema migration and local file storage abstraction

**Files:**
- Create: `apps/api/src/infrastructure/db/sql/002_content_and_uploads.sql`
- Create: `apps/api/src/infrastructure/storage/localFileStorage.ts`
- Create: `apps/api/src/infrastructure/storage/localFileStorage.test.ts`
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app/config.ts`

- [ ] **Step 1: Write the failing storage test**

Create `apps/api/src/infrastructure/storage/localFileStorage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalFileStorage } from './localFileStorage.js';

describe('createLocalFileStorage', () => {
  it('writes files under a sharded relative storage key', async () => {
    const root = mkdtempSync(join(tmpdir(), 'trace-scope-upload-'));
    const storage = createLocalFileStorage({ root });

    try {
      const stored = await storage.write({
        originalFilename: 'cover.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('image-bytes'),
      });

      expect(stored.storageKey).toMatch(/^original\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\//);
      expect(readFileSync(join(root, stored.storageKey), 'utf8')).toBe('image-bytes');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run the test to confirm the storage module does not exist yet**

Run: `cd apps/api && npm test -- src/infrastructure/storage/localFileStorage.test.ts`

Expected: FAIL with `Cannot find module './localFileStorage.js'` or equivalent.

- [ ] **Step 3: Add the migration, multipart dependency, and storage implementation**

Update `apps/api/package.json`:

```json
{
  "dependencies": {
    "@fastify/cookie": "^11.0.2",
    "@fastify/multipart": "^9.0.3",
    "dotenv": "^16.4.7",
    "fastify": "^5.2.1",
    "mysql2": "^3.12.0"
  }
}
```

Extend `apps/api/src/app/config.ts`:

```ts
export interface AppConfig {
  publicBaseUrl: string;
  maxUploadBytes: number;
}

export function loadConfig(): AppConfig {
  return {
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000',
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? `${10 * 1024 * 1024}`),
  };
}
```

Create `apps/api/src/infrastructure/storage/localFileStorage.ts`:

```ts
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export function createLocalFileStorage({ root }: { root: string }) {
  return {
    async write(input: {
      originalFilename: string;
      mimeType: string;
      buffer: Buffer;
    }) {
      const now = new Date();
      const sha256Hash = createHash('sha256').update(input.buffer).digest('hex');
      const extension = input.originalFilename.includes('.')
        ? input.originalFilename.slice(input.originalFilename.lastIndexOf('.'))
        : '';
      const storageKey = [
        'original',
        String(now.getUTCFullYear()),
        String(now.getUTCMonth() + 1).padStart(2, '0'),
        String(now.getUTCDate()).padStart(2, '0'),
        sha256Hash.slice(0, 2),
        sha256Hash.slice(2, 4),
        `${randomUUID()}${extension}`,
      ].join('/');

      const absolutePath = join(root, storageKey);
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, input.buffer);

      return {
        storageKey,
        sha256Hash,
        byteSize: input.buffer.byteLength,
        mimeType: input.mimeType,
        originalFilename: input.originalFilename,
      };
    },
  };
}
```

Create `apps/api/src/infrastructure/db/sql/002_content_and_uploads.sql`:

```sql
CREATE TABLE upload_file (
  id VARCHAR(36) PRIMARY KEY,
  storage_key VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  byte_size BIGINT NOT NULL,
  sha256_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_upload_file_storage_key (storage_key)
);

CREATE TABLE project (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_upload_file_id VARCHAR(36) NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_project_slug (slug),
  CONSTRAINT fk_project_cover_upload FOREIGN KEY (cover_upload_file_id) REFERENCES upload_file(id)
);

CREATE TABLE project_tag (
  project_id VARCHAR(36) NOT NULL,
  tag VARCHAR(100) NOT NULL,
  PRIMARY KEY (project_id, tag),
  CONSTRAINT fk_project_tag_project FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
);

CREATE TABLE location (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,
  address_text VARCHAR(255) NOT NULL,
  visit_order INT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_location_project_slug (project_id, slug),
  CONSTRAINT fk_location_project FOREIGN KEY (project_id) REFERENCES project(id)
);

CREATE TABLE media_set (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  location_id VARCHAR(36) NULL,
  type VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  cover_upload_file_id VARCHAR(36) NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_media_set_project FOREIGN KEY (project_id) REFERENCES project(id),
  CONSTRAINT fk_media_set_location FOREIGN KEY (location_id) REFERENCES location(id),
  CONSTRAINT fk_media_set_cover_upload FOREIGN KEY (cover_upload_file_id) REFERENCES upload_file(id)
);

CREATE TABLE media_image (
  id VARCHAR(36) PRIMARY KEY,
  media_set_id VARCHAR(36) NOT NULL,
  upload_file_id VARCHAR(36) NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  caption TEXT NOT NULL,
  sort_order INT NOT NULL,
  latitude DECIMAL(9, 6) NULL,
  longitude DECIMAL(9, 6) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_media_image_media_set_order (media_set_id, sort_order),
  CONSTRAINT fk_media_image_media_set FOREIGN KEY (media_set_id) REFERENCES media_set(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_image_upload_file FOREIGN KEY (upload_file_id) REFERENCES upload_file(id)
);

CREATE TABLE route (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  line_style VARCHAR(20) NOT NULL,
  color VARCHAR(20) NOT NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_route_project FOREIGN KEY (project_id) REFERENCES project(id)
);

CREATE TABLE route_location (
  route_id VARCHAR(36) NOT NULL,
  location_id VARCHAR(36) NOT NULL,
  sort_order INT NOT NULL,
  PRIMARY KEY (route_id, location_id),
  UNIQUE KEY uq_route_location_sort (route_id, sort_order),
  CONSTRAINT fk_route_location_route FOREIGN KEY (route_id) REFERENCES route(id) ON DELETE CASCADE,
  CONSTRAINT fk_route_location_location FOREIGN KEY (location_id) REFERENCES location(id)
);
```

- [ ] **Step 4: Run the targeted storage test and the migration command**

Run: `cd apps/api && npm test -- src/infrastructure/storage/localFileStorage.test.ts`

Expected: PASS

Run: `cd apps/api && npm run migrate`

Expected: migration runner logs `002_content_and_uploads.sql` as applied.

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json apps/api/src/app/config.ts apps/api/src/infrastructure/db/sql/002_content_and_uploads.sql apps/api/src/infrastructure/storage/localFileStorage.ts apps/api/src/infrastructure/storage/localFileStorage.test.ts
git commit -m "feat: add content schema and local upload storage"
```

## Task 2: Implement the authenticated upload module

**Files:**
- Create: `apps/api/src/modules/uploads/{types,schemas,repository,service,service.test,routes,routes.test}.ts`
- Modify: `apps/api/src/app/buildServer.ts`

- [ ] **Step 1: Write the failing service and route tests**

Create `apps/api/src/modules/uploads/service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createUploadsService } from './service.js';

describe('createUploadsService', () => {
  it('rejects unsupported mime types', async () => {
    const service = createUploadsService({
      maxUploadBytes: 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      storage: { write: vi.fn() },
      repository: { insertUploadFile: vi.fn() },
      idGenerator: () => 'upload-1',
      now: () => new Date('2026-04-09T00:00:00.000Z'),
    });

    await expect(
      service.createUpload({
        originalFilename: 'clip.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('x'),
      }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_UPLOAD_TYPE' });
  });
});
```

Create `apps/api/src/modules/uploads/routes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildServer } from '../../app/buildServer.js';

describe('upload routes', () => {
  it('requires an authenticated admin session', async () => {
    const app = buildServer();
    const response = await app.inject({ method: 'POST', url: '/api/admin/uploads' });
    expect(response.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: Run the upload tests to verify they fail**

Run: `cd apps/api && npm test -- src/modules/uploads/service.test.ts src/modules/uploads/routes.test.ts`

Expected: FAIL because the upload module files and route registration do not exist yet.

- [ ] **Step 3: Add the upload repository, service, schemas, and routes**

Create `apps/api/src/modules/uploads/service.ts`:

```ts
import { AppError } from '../../app/errors.js';

export function createUploadsService(deps: {
  maxUploadBytes: number;
  allowedMimeTypes: string[];
  storage: { write(input: { originalFilename: string; mimeType: string; buffer: Buffer }): Promise<{ storageKey: string; sha256Hash: string; byteSize: number; mimeType: string; originalFilename: string }> };
  repository: { insertUploadFile(input: { id: string; storageKey: string; originalFilename: string; mimeType: string; byteSize: number; sha256Hash: string; createdAt: string }): Promise<void> };
  idGenerator: () => string;
  now: () => Date;
}) {
  return {
    async createUpload(input: { originalFilename: string; mimeType: string; buffer: Buffer }) {
      if (!deps.allowedMimeTypes.includes(input.mimeType)) {
        throw new AppError(415, 'UNSUPPORTED_UPLOAD_TYPE', 'Unsupported upload type');
      }
      if (input.buffer.byteLength > deps.maxUploadBytes) {
        throw new AppError(413, 'UPLOAD_TOO_LARGE', 'Upload exceeds configured size limit');
      }

      const stored = await deps.storage.write(input);
      const record = { id: deps.idGenerator(), ...stored, createdAt: deps.now().toISOString() };
      await deps.repository.insertUploadFile(record);
      return record;
    },
  };
}
```

Register the route in `apps/api/src/modules/uploads/routes.ts`:

```ts
app.post('/api/admin/uploads', async (request, reply) => {
  await request.requireAdminSession();
  const part = await request.file();
  if (!part) {
    return reply.status(400).send({ code: 'UPLOAD_REQUIRED', message: 'Upload file is required' });
  }

  const upload = await app.uploadsService.createUpload({
    originalFilename: part.filename,
    mimeType: part.mimetype,
    buffer: await part.toBuffer(),
  });

  reply.status(201).send({
    id: upload.id,
    mimeType: upload.mimeType,
    byteSize: upload.byteSize,
    assetUrl: `/api/uploads/${upload.id}`,
  });
});
```

Modify `apps/api/src/app/buildServer.ts`:

```ts
import multipart from '@fastify/multipart';
import { registerUploadRoutes } from '../modules/uploads/routes.js';

app.register(multipart, { limits: { files: 1 } });
app.register(registerUploadRoutes);
```

- [ ] **Step 4: Run the upload tests and a smoke health check**

Run: `cd apps/api && npm test -- src/modules/uploads/service.test.ts src/modules/uploads/routes.test.ts`

Expected: PASS

Run: `cd apps/api && npm test -- src/app/buildServer.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/uploads apps/api/src/app/buildServer.ts
git commit -m "feat: add admin upload module"
```

## Task 3: Add project and location CRUD with validation against the new schema

**Files:**
- Create: `apps/api/src/modules/projects/{schemas,repository,service,service.test,routes}.ts`
- Create: `apps/api/src/modules/locations/{schemas,repository,service,service.test,routes}.ts`
- Modify: `apps/api/src/app/buildServer.ts`

- [ ] **Step 1: Write the failing validation tests**

Create `apps/api/src/modules/projects/service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createProjectsService } from './service.js';

describe('createProjectsService', () => {
  it('rejects publish when title or summary is empty', async () => {
    const service = createProjectsService({
      repository: { upsertProject: vi.fn(), replaceProjectTags: vi.fn() },
      idGenerator: () => 'project-1',
      now: () => new Date('2026-04-09T00:00:00.000Z'),
    });

    await expect(
      service.saveProject({
        title: '',
        slug: 'demo',
        summary: '',
        description: 'desc',
        coverUploadFileId: null,
        tags: [],
        status: 'published',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PROJECT' });
  });
});
```

Create `apps/api/src/modules/locations/service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createLocationsService } from './service.js';

describe('createLocationsService', () => {
  it('rejects locations for missing projects', async () => {
    const service = createLocationsService({
      projectRepository: { findProjectById: vi.fn().mockResolvedValue(null) },
      repository: { upsertLocation: vi.fn() },
      idGenerator: () => 'location-1',
      now: () => new Date('2026-04-09T00:00:00.000Z'),
    });

    await expect(
      service.saveLocation({
        projectId: 'project-missing',
        name: 'Bund',
        slug: 'bund',
        description: 'desc',
        latitude: 31.24,
        longitude: 121.49,
        addressText: 'Shanghai',
        visitOrder: 1,
      }),
    ).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND' });
  });
});
```

- [ ] **Step 2: Run the tests to verify the services do not exist yet**

Run: `cd apps/api && npm test -- src/modules/projects/service.test.ts src/modules/locations/service.test.ts`

Expected: FAIL because the service files do not exist.

- [ ] **Step 3: Add the schemas, repositories, services, and routes**

Create `apps/api/src/modules/projects/service.ts`:

```ts
import { AppError } from '../../app/errors.js';

export function createProjectsService(deps: {
  repository: {
    upsertProject(input: {
      id: string;
      title: string;
      slug: string;
      summary: string;
      description: string;
      coverUploadFileId: string | null;
      status: 'draft' | 'published';
      createdAt: string;
      updatedAt: string;
    }): Promise<void>;
    replaceProjectTags(projectId: string, tags: string[]): Promise<void>;
  };
  idGenerator: () => string;
  now: () => Date;
}) {
  return {
    async saveProject(input: {
      id?: string;
      title: string;
      slug: string;
      summary: string;
      description: string;
      coverUploadFileId: string | null;
      tags: string[];
      status: 'draft' | 'published';
    }) {
      if (input.status === 'published' && (!input.title.trim() || !input.summary.trim())) {
        throw new AppError(422, 'INVALID_PROJECT', 'Published projects require title and summary');
      }

      const timestamp = deps.now().toISOString();
      const projectId = input.id ?? deps.idGenerator();
      await deps.repository.upsertProject({
        id: projectId,
        title: input.title.trim(),
        slug: input.slug.trim(),
        summary: input.summary.trim(),
        description: input.description.trim(),
        coverUploadFileId: input.coverUploadFileId,
        status: input.status,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await deps.repository.replaceProjectTags(projectId, input.tags);
      return { id: projectId };
    },
  };
}
```

Create `apps/api/src/modules/locations/service.ts`:

```ts
import { AppError } from '../../app/errors.js';

export function createLocationsService(deps: {
  projectRepository: { findProjectById(projectId: string): Promise<{ id: string } | null> };
  repository: {
    upsertLocation(input: {
      id: string;
      projectId: string;
      name: string;
      slug: string;
      description: string;
      latitude: number;
      longitude: number;
      addressText: string;
      visitOrder: number | null;
      createdAt: string;
      updatedAt: string;
    }): Promise<void>;
  };
  idGenerator: () => string;
  now: () => Date;
}) {
  return {
    async saveLocation(input: {
      id?: string;
      projectId: string;
      name: string;
      slug: string;
      description: string;
      latitude: number;
      longitude: number;
      addressText: string;
      visitOrder: number | null;
    }) {
      const project = await deps.projectRepository.findProjectById(input.projectId);
      if (!project) {
        throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project does not exist');
      }

      const timestamp = deps.now().toISOString();
      return deps.repository.upsertLocation({
        id: input.id ?? deps.idGenerator(),
        ...input,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    },
  };
}
```

Register route modules in `apps/api/src/app/buildServer.ts`:

```ts
import { registerProjectRoutes } from '../modules/projects/routes.js';
import { registerLocationRoutes } from '../modules/locations/routes.js';

app.register(registerProjectRoutes);
app.register(registerLocationRoutes);
```

All routes must call `request.requireAdminSession()` before touching data.

- [ ] **Step 4: Run the service tests and a route smoke test**

Run: `cd apps/api && npm test -- src/modules/projects/service.test.ts src/modules/locations/service.test.ts`

Expected: PASS

Run: `cd apps/api && npm test -- src/app/buildServer.test.ts`

Expected: PASS with project/location route registration in place.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/projects apps/api/src/modules/locations apps/api/src/app/buildServer.ts
git commit -m "feat: add project and location admin crud"
```

## Task 4: Implement route, media-set, and media-image CRUD with explicit ordering rules

**Files:**
- Create: `apps/api/src/modules/routes/{schemas,repository,service,service.test,routes}.ts`
- Create: `apps/api/src/modules/media-sets/{schemas,repository,service,service.test,routes}.ts`
- Create: `apps/api/src/modules/media-images/{schemas,repository,service,service.test,routes}.ts`
- Modify: `apps/api/src/app/buildServer.ts`

- [ ] **Step 1: Write the failing ordering tests**

Create `apps/api/src/modules/routes/service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createRoutesService } from './service.js';

describe('createRoutesService', () => {
  it('persists route location order through the association table', async () => {
    const replaceRouteLocations = vi.fn();
    const service = createRoutesService({
      projectRepository: { findProjectById: vi.fn().mockResolvedValue({ id: 'project-1' }) },
      locationRepository: { findLocationsByIds: vi.fn().mockResolvedValue([{ id: 'loc-1' }, { id: 'loc-2' }]) },
      repository: { upsertRoute: vi.fn(), replaceRouteLocations },
      idGenerator: () => 'route-1',
      now: () => new Date('2026-04-09T00:00:00.000Z'),
    });

    await service.saveRoute({
      projectId: 'project-1',
      name: 'loop',
      description: 'desc',
      lineStyle: 'solid',
      color: '#72e3d2',
      isFeatured: true,
      locationIds: ['loc-2', 'loc-1'],
    });

    expect(replaceRouteLocations).toHaveBeenCalledWith('route-1', [
      { locationId: 'loc-2', sortOrder: 1 },
      { locationId: 'loc-1', sortOrder: 2 },
    ]);
  });
});
```

Create `apps/api/src/modules/media-images/service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createMediaImagesService } from './service.js';

describe('createMediaImagesService', () => {
  it('rejects image writes when the media set does not exist', async () => {
    const service = createMediaImagesService({
      mediaSetRepository: { findMediaSetById: vi.fn().mockResolvedValue(null) },
      repository: { upsertMediaImage: vi.fn() },
      idGenerator: () => 'image-1',
      now: () => new Date('2026-04-09T00:00:00.000Z'),
    });

    await expect(
      service.saveMediaImage({
        mediaSetId: 'missing-set',
        uploadFileId: 'upload-1',
        altText: 'Alt',
        caption: 'Caption',
        sortOrder: 1,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_SET_NOT_FOUND' });
  });
});
```

- [ ] **Step 2: Run the tests and confirm the modules are absent**

Run: `cd apps/api && npm test -- src/modules/routes/service.test.ts src/modules/media-images/service.test.ts`

Expected: FAIL because the services do not exist yet.

- [ ] **Step 3: Add the services and route registration**

Create `apps/api/src/modules/routes/service.ts`:

```ts
import { AppError } from '../../app/errors.js';

export function createRoutesService(deps: {
  projectRepository: { findProjectById(projectId: string): Promise<{ id: string } | null> };
  locationRepository: { findLocationsByIds(ids: string[]): Promise<Array<{ id: string }>> };
  repository: {
    upsertRoute(input: { id: string; projectId: string; name: string; description: string; lineStyle: 'solid' | 'dashed'; color: string; isFeatured: boolean; createdAt: string; updatedAt: string }): Promise<void>;
    replaceRouteLocations(routeId: string, items: Array<{ locationId: string; sortOrder: number }>): Promise<void>;
  };
  idGenerator: () => string;
  now: () => Date;
}) {
  return {
    async saveRoute(input: { id?: string; projectId: string; name: string; description: string; lineStyle: 'solid' | 'dashed'; color: string; isFeatured: boolean; locationIds: string[] }) {
      const project = await deps.projectRepository.findProjectById(input.projectId);
      if (!project) {
        throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project does not exist');
      }

      const locations = await deps.locationRepository.findLocationsByIds(input.locationIds);
      if (locations.length !== input.locationIds.length) {
        throw new AppError(422, 'INVALID_ROUTE_LOCATIONS', 'Route references missing locations');
      }

      const routeId = input.id ?? deps.idGenerator();
      const timestamp = deps.now().toISOString();
      await deps.repository.upsertRoute({
        id: routeId,
        projectId: input.projectId,
        name: input.name,
        description: input.description,
        lineStyle: input.lineStyle,
        color: input.color,
        isFeatured: input.isFeatured,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await deps.repository.replaceRouteLocations(
        routeId,
        input.locationIds.map((locationId, index) => ({ locationId, sortOrder: index + 1 })),
      );

      return { id: routeId };
    },
  };
}
```

Create `apps/api/src/modules/media-images/service.ts`:

```ts
import { AppError } from '../../app/errors.js';

export function createMediaImagesService(deps: {
  mediaSetRepository: { findMediaSetById(id: string): Promise<{ id: string } | null> };
  repository: {
    upsertMediaImage(input: { id: string; mediaSetId: string; uploadFileId: string; altText: string; caption: string; sortOrder: number; latitude: number | null; longitude: number | null; createdAt: string; updatedAt: string }): Promise<void>;
  };
  idGenerator: () => string;
  now: () => Date;
}) {
  return {
    async saveMediaImage(input: { id?: string; mediaSetId: string; uploadFileId: string; altText: string; caption: string; sortOrder: number; latitude?: number; longitude?: number }) {
      const mediaSet = await deps.mediaSetRepository.findMediaSetById(input.mediaSetId);
      if (!mediaSet) {
        throw new AppError(404, 'MEDIA_SET_NOT_FOUND', 'Media set does not exist');
      }

      const timestamp = deps.now().toISOString();
      await deps.repository.upsertMediaImage({
        id: input.id ?? deps.idGenerator(),
        mediaSetId: input.mediaSetId,
        uploadFileId: input.uploadFileId,
        altText: input.altText,
        caption: input.caption,
        sortOrder: input.sortOrder,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    },
  };
}
```

Register route modules:

```ts
import { registerAdminRouteRoutes } from '../modules/routes/routes.js';
import { registerMediaSetRoutes } from '../modules/media-sets/routes.js';
import { registerMediaImageRoutes } from '../modules/media-images/routes.js';

app.register(registerAdminRouteRoutes);
app.register(registerMediaSetRoutes);
app.register(registerMediaImageRoutes);
```

- [ ] **Step 4: Run the ordering tests and the full API test suite**

Run: `cd apps/api && npm test -- src/modules/routes/service.test.ts src/modules/media-images/service.test.ts src/modules/media-sets/service.test.ts`

Expected: PASS

Run: `cd apps/api && npm test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/routes apps/api/src/modules/media-sets apps/api/src/modules/media-images apps/api/src/app/buildServer.ts
git commit -m "feat: add route and media admin crud"
```

## Task 5: Replace admin localStorage writes with API clients and page-level hooks

**Files:**
- Create: `apps/web/src/services/api/httpClient.ts`
- Create: `apps/web/src/features/projects/api/useAdminProjects.ts`
- Create: `apps/web/src/features/locations/api/useAdminLocations.ts`
- Create: `apps/web/src/features/routes/api/useAdminRoutes.ts`
- Create: `apps/web/src/features/media/api/useAdminMedia.ts`
- Create: `apps/web/src/features/media/api/uploadFile.ts`
- Modify: `apps/web/src/services/auth/authContext.tsx`
- Modify: `apps/web/src/services/storage/useAdminData.ts`
- Modify: `apps/web/src/app/routes/admin/projects/AdminProjectsPage.tsx`
- Modify: `apps/web/src/app/routes/admin/locations/AdminLocationsPage.tsx`
- Modify: `apps/web/src/app/routes/admin/routes/AdminRoutesPage.tsx`
- Modify: `apps/web/src/app/routes/admin/media/AdminMediaPage.tsx`

- [ ] **Step 1: Write the failing frontend auth/API test**

Create `apps/web/src/features/projects/api/useAdminProjects.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAdminProjects } from './useAdminProjects';

describe('useAdminProjects', () => {
  it('loads projects from the admin API instead of localStorage', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      items: [{ id: 'project-1', title: 'Trace Scope', slug: 'trace-scope', summary: 'summary', description: 'desc', tags: [], status: 'draft' }],
    });

    const { result } = renderHook(() => useAdminProjects({ fetcher }));

    await waitFor(() => expect(result.current.projects).toHaveLength(1));
    expect(fetcher).toHaveBeenCalledWith('/api/admin/projects');
  });
});
```

- [ ] **Step 2: Run the frontend test and confirm the hook does not exist yet**

Run: `cd apps/web && npm test -- src/features/projects/api/useAdminProjects.test.tsx`

Expected: FAIL because the admin API hooks do not exist yet.

- [ ] **Step 3: Add the HTTP client, auth fetches, and admin hooks**

Create `apps/web/src/services/api/httpClient.ts`:

```ts
export async function httpJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

Create `apps/web/src/features/projects/api/useAdminProjects.ts`:

```ts
import { useEffect, useState } from 'react';
import { httpJson } from '@/services/api/httpClient';
import type { Project } from '@/types/domain';

export function useAdminProjects({
  fetcher = (url: string) => httpJson<{ items: Project[] }>(url),
}: {
  fetcher?: (url: string) => Promise<{ items: Project[] }>;
} = {}) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetcher('/api/admin/projects').then((data) => {
      if (!cancelled) {
        setProjects(data.items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  return { projects };
}
```

Modify `apps/web/src/services/auth/authContext.tsx` so `login`, `logout`, and session boot call Phase 1 backend routes instead of checking hard-coded credentials.

Modify each admin page so it:

- reads data from feature hooks
- posts creates/updates/deletes to `/api/admin/*`
- uploads files through `POST /api/admin/uploads`
- stops calling `adminDataStore.save*` and `adminDataStore.delete*`

- [ ] **Step 4: Run focused frontend tests and a full build**

Run: `cd apps/web && npm test -- src/features/projects/api/useAdminProjects.test.tsx`

Expected: PASS

Run: `cd apps/web && npm run build`

Expected: PASS or only fail on pre-existing unrelated issues already documented before this phase.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/api/httpClient.ts apps/web/src/features/projects/api/useAdminProjects.ts apps/web/src/features/locations/api/useAdminLocations.ts apps/web/src/features/routes/api/useAdminRoutes.ts apps/web/src/features/media/api apps/web/src/services/auth/authContext.tsx apps/web/src/services/storage/useAdminData.ts apps/web/src/app/routes/admin
git commit -m "feat: switch admin pages to backend content api"
```

## Verification Checklist

- `apps/api` starts and still serves `GET /health`
- all `/api/admin/*` content routes require a valid session
- uploads land on disk under a sharded relative path
- `route_location` ordering is persisted explicitly
- admin pages no longer depend on `localStorage` for source-of-truth writes
- public pages still read from local storage until Phase 3

## Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-09-trace-scope-backend-phase-2-content-crud-and-uploads.md`.

Next plan to execute after this one: `docs/superpowers/plans/2026-04-09-trace-scope-backend-phase-3-public-api-and-frontend-migration.md`
