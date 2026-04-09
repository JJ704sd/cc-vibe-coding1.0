# Trace Scope Backend Phase 3 Public API and Frontend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add read-only public APIs that expose only published content, then migrate the public frontend from `localStorage`-backed readers to backend fetches without rewriting the existing page presentation layer.

**Architecture:** Add a `public` module in `apps/api` that aggregates page-friendly read models from the normalized content tables. Keep the frontend display components and map view-model logic, but replace `usePublicData` with feature-specific API hooks for projects, project details, media sets, and map relationship data. Remove the public dependency on `adminDataStore` after all public routes are switched.

**Tech Stack:** Node.js, TypeScript, Fastify, MySQL, Vitest, React

---

## Preconditions

- Phase 2 must already be complete:
  - authenticated admin CRUD routes exist
  - uploads are stored on disk and referenced from `upload_file`
  - admin pages no longer use browser-local writes as source of truth
- Existing public pages still depend on:
  - `apps/web/src/services/storage/publicDataReader.ts`
  - `apps/web/src/services/storage/usePublicData.ts`

---

## File Map

### New backend files

- `apps/api/src/modules/public/{types,schemas,repository,service,service.test,routes,routes.test}.ts`

### New frontend files

- `apps/web/src/features/projects/api/usePublicProjects.ts`
- `apps/web/src/features/projects/api/usePublicProjectDetail.ts`
- `apps/web/src/features/media/api/usePublicMediaSet.ts`
- `apps/web/src/features/map/api/fetchMapRelationshipData.ts`

### Files to modify

- `apps/api/src/app/buildServer.ts`
- `apps/api/src/modules/uploads/routes.ts`
- `apps/api/src/modules/uploads/repository.ts`
- `apps/web/src/app/routes/public/projects/ProjectsPage.tsx`
- `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx`
- `apps/web/src/app/routes/public/gallery-view/GalleryViewPage.tsx`
- `apps/web/src/app/routes/public/spin-view/SpinViewPage.tsx`
- `apps/web/src/app/routes/public/map/MapPage.tsx`
- `apps/web/src/features/map/api/useMapRelationshipData.ts`
- `apps/web/src/services/api/httpClient.ts`
- `apps/web/src/services/storage/usePublicData.ts`
- `apps/web/src/services/storage/publicDataReader.ts`

---

## Public API Contract

The backend route surface in this phase should be:

- `GET /api/public/projects`
- `GET /api/public/projects/:projectIdOrSlug`
- `GET /api/public/media-sets/:mediaSetId`
- `GET /api/public/map-relationship`
- `GET /api/uploads/:fileId`

Rules:

- only `project.status = 'published'` content can appear
- unpublished projects must return `404`, not a partial payload
- media sets, routes, locations, and images are public only through a published project
- `GET /api/uploads/:fileId` must reject access to files not reachable from published content

---

## Task 1: Implement the public aggregation module with published-only filtering

**Files:**
- Create: `apps/api/src/modules/public/{types,schemas,repository,service,service.test,routes,routes.test}.ts`
- Modify: `apps/api/src/app/buildServer.ts`

- [ ] **Step 1: Write the failing service test**

Create `apps/api/src/modules/public/service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createPublicService } from './service.js';

describe('createPublicService', () => {
  it('returns only published projects from the list endpoint', async () => {
    const service = createPublicService({
      repository: {
        listProjectsForPublic: vi.fn().mockResolvedValue([
          { id: 'published-1', status: 'published', title: 'Visible' },
          { id: 'draft-1', status: 'draft', title: 'Hidden' },
        ]),
      },
    });

    const result = await service.listProjects();
    expect(result.items).toEqual([{ id: 'published-1', status: 'published', title: 'Visible' }]);
  });
});
```

- [ ] **Step 2: Run the test and confirm the module does not exist yet**

Run: `cd apps/api && npm test -- src/modules/public/service.test.ts`

Expected: FAIL because the public module files do not exist.

- [ ] **Step 3: Add the public service, repository contract, and routes**

Create `apps/api/src/modules/public/types.ts`:

```ts
export interface PublicProjectCardDto {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImage: string | null;
  tags: string[];
  status: 'published';
}

export interface PublicProjectDetailDto {
  project: PublicProjectCardDto & { description: string };
  locations: Array<{ id: string; name: string; slug: string; description: string; latitude: number; longitude: number; addressText: string; visitOrder: number | null }>;
  mediaSets: Array<{ id: string; type: 'spin360' | 'gallery'; title: string; description: string; coverImage: string | null; locationId: string | null; isFeatured: boolean }>;
  routes: Array<{ id: string; name: string; description: string; lineStyle: 'solid' | 'dashed'; color: string; locationIds: string[]; isFeatured: boolean }>;
}
```

Create `apps/api/src/modules/public/service.ts`:

```ts
import { AppError } from '../../app/errors.js';

export function createPublicService(deps: {
  repository: {
    listProjectsForPublic(): Promise<Array<{ id: string; slug: string; title: string; summary: string; coverImage: string | null; tags: string[]; status: 'draft' | 'published' }>>;
    findProjectDetailByIdOrSlug(projectIdOrSlug: string): Promise<unknown | null>;
    findMediaSetById(mediaSetId: string): Promise<unknown | null>;
    getMapRelationshipSource(): Promise<unknown>;
  };
}) {
  return {
    async listProjects() {
      const projects = await deps.repository.listProjectsForPublic();
      return { items: projects.filter((project) => project.status === 'published') };
    },
    async getProjectDetail(projectIdOrSlug: string) {
      const detail = await deps.repository.findProjectDetailByIdOrSlug(projectIdOrSlug);
      if (!detail) {
        throw new AppError(404, 'PUBLIC_PROJECT_NOT_FOUND', 'Published project not found');
      }
      return detail;
    },
    async getMediaSet(mediaSetId: string) {
      const mediaSet = await deps.repository.findMediaSetById(mediaSetId);
      if (!mediaSet) {
        throw new AppError(404, 'PUBLIC_MEDIA_SET_NOT_FOUND', 'Published media set not found');
      }
      return mediaSet;
    },
    async getMapRelationship() {
      return deps.repository.getMapRelationshipSource();
    },
  };
}
```

Create `apps/api/src/modules/public/routes.ts`:

```ts
import type { FastifyInstance } from 'fastify';

export async function registerPublicRoutes(app: FastifyInstance) {
  app.get('/api/public/projects', async () => app.publicService.listProjects());
  app.get('/api/public/projects/:projectIdOrSlug', async (request) => app.publicService.getProjectDetail((request.params as { projectIdOrSlug: string }).projectIdOrSlug));
  app.get('/api/public/media-sets/:mediaSetId', async (request) => app.publicService.getMediaSet((request.params as { mediaSetId: string }).mediaSetId));
  app.get('/api/public/map-relationship', async () => app.publicService.getMapRelationship());
}
```

Register the module in `apps/api/src/app/buildServer.ts`:

```ts
import { registerPublicRoutes } from '../modules/public/routes.js';

app.register(registerPublicRoutes);
```

- [ ] **Step 4: Run the public service and route tests**

Run: `cd apps/api && npm test -- src/modules/public/service.test.ts src/modules/public/routes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/public apps/api/src/app/buildServer.ts
git commit -m "feat: add public content api"
```

## Task 2: Expose uploaded files through a public-safe file read path

**Files:**
- Modify: `apps/api/src/modules/uploads/routes.ts`
- Modify: `apps/api/src/modules/uploads/repository.ts`
- Create: `apps/api/src/modules/uploads/routes.public.test.ts`

- [ ] **Step 1: Write the failing file-read authorization test**

Create `apps/api/src/modules/uploads/routes.public.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildServer } from '../../app/buildServer.js';

describe('public upload reads', () => {
  it('returns 404 for files not reachable from published content', async () => {
    const app = buildServer();
    const response = await app.inject({ method: 'GET', url: '/api/uploads/upload-hidden' });
    expect(response.statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Run the test and confirm the route behavior is missing**

Run: `cd apps/api && npm test -- src/modules/uploads/routes.public.test.ts`

Expected: FAIL because the public-safe read path is not implemented yet.

- [ ] **Step 3: Add the protected file read logic**

Modify `apps/api/src/modules/uploads/routes.ts`:

```ts
app.get('/api/uploads/:fileId', async (request, reply) => {
  const params = request.params as { fileId: string };
  const file = await app.uploadsService.getReadableFile(params.fileId);

  if (!file) {
    return reply.status(404).send({ code: 'UPLOAD_NOT_FOUND', message: 'File not found' });
  }

  reply.header('Content-Type', file.mimeType);
  reply.header('Cache-Control', 'public, max-age=300');
  return reply.send(file.stream);
});
```

The backing service/repository logic must verify:

- file exists
- file is referenced from a media image or cover file
- that reference belongs to a published project

- [ ] **Step 4: Run the file-read test**

Run: `cd apps/api && npm test -- src/modules/uploads/routes.public.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/uploads/routes.ts apps/api/src/modules/uploads/repository.ts apps/api/src/modules/uploads/routes.public.test.ts
git commit -m "feat: add public-safe uploaded file reads"
```

## Task 3: Replace `usePublicData` with project and media API hooks

**Files:**
- Create: `apps/web/src/features/projects/api/usePublicProjects.ts`
- Create: `apps/web/src/features/projects/api/usePublicProjectDetail.ts`
- Create: `apps/web/src/features/media/api/usePublicMediaSet.ts`
- Modify: `apps/web/src/services/api/httpClient.ts`
- Modify: `apps/web/src/services/storage/usePublicData.ts`
- Modify: `apps/web/src/services/storage/publicDataReader.ts`

- [ ] **Step 1: Write the failing public project hook test**

Create `apps/web/src/features/projects/api/usePublicProjects.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePublicProjects } from './usePublicProjects';

describe('usePublicProjects', () => {
  it('loads project cards from the public API', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      items: [{ id: 'project-1', slug: 'trace-scope', title: 'Trace Scope', summary: 'summary', coverImage: null, tags: [], status: 'published' }],
    });

    const { result } = renderHook(() => usePublicProjects({ fetcher }));

    await waitFor(() => expect(result.current.projects).toHaveLength(1));
    expect(fetcher).toHaveBeenCalledWith('/api/public/projects');
  });
});
```

- [ ] **Step 2: Run the hook test and confirm it fails**

Run: `cd apps/web && npm test -- src/features/projects/api/usePublicProjects.test.tsx`

Expected: FAIL because the public API hook does not exist yet.

- [ ] **Step 3: Add the public hooks and deprecate the storage reader**

Create `apps/web/src/features/projects/api/usePublicProjects.ts`:

```ts
import { useEffect, useState } from 'react';
import { httpJson } from '@/services/api/httpClient';
import type { Project } from '@/types/domain';

export function usePublicProjects({
  fetcher = (url: string) => httpJson<{ items: Project[] }>(url),
}: {
  fetcher?: (url: string) => Promise<{ items: Project[] }>;
} = {}) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetcher('/api/public/projects').then((data) => {
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

Create `apps/web/src/features/projects/api/usePublicProjectDetail.ts` and `apps/web/src/features/media/api/usePublicMediaSet.ts` with the same pattern, targeting:

- `/api/public/projects/:projectIdOrSlug`
- `/api/public/media-sets/:mediaSetId`

Modify `apps/web/src/services/storage/usePublicData.ts` to:

```ts
export function usePublicData() {
  throw new Error('usePublicData is deprecated in Phase 3. Use public API hooks instead.');
}
```

Modify `apps/web/src/services/storage/publicDataReader.ts` to:

```ts
/**
 * Deprecated in Phase 3.
 * Public pages must use feature-level API hooks instead of the local storage reader.
 */
export {};
```

- [ ] **Step 4: Run the new hook test**

Run: `cd apps/web && npm test -- src/features/projects/api/usePublicProjects.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/projects/api/usePublicProjects.ts apps/web/src/features/projects/api/usePublicProjectDetail.ts apps/web/src/features/media/api/usePublicMediaSet.ts apps/web/src/services/storage/usePublicData.ts apps/web/src/services/storage/publicDataReader.ts
git commit -m "feat: add public api hooks"
```

## Task 4: Migrate the public pages incrementally, starting with projects and detail pages

**Files:**
- Modify: `apps/web/src/app/routes/public/projects/ProjectsPage.tsx`
- Modify: `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx`
- Modify: `apps/web/src/app/routes/public/gallery-view/GalleryViewPage.tsx`
- Modify: `apps/web/src/app/routes/public/spin-view/SpinViewPage.tsx`

- [ ] **Step 1: Write the failing page test for the projects page**

Add to `apps/web/src/app/routes/public/projects/ProjectsPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectsPage } from './ProjectsPage';

vi.mock('@/features/projects/api/usePublicProjects', () => ({
  usePublicProjects: () => ({
    projects: [{ id: 'project-1', title: 'Trace Scope', slug: 'trace-scope', summary: 'summary', description: 'desc', coverImage: null, tags: [], status: 'published' }],
  }),
}));

describe('ProjectsPage', () => {
  it('renders published projects from the public API hook', () => {
    render(<ProjectsPage />);
    expect(screen.getByText('Trace Scope')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the page test and confirm the old data source is still wired**

Run: `cd apps/web && npm test -- src/app/routes/public/projects/ProjectsPage.test.tsx`

Expected: FAIL or still depend on `usePublicData`.

- [ ] **Step 3: Rewrite the page data sources**

Change `apps/web/src/app/routes/public/projects/ProjectsPage.tsx`:

```tsx
import { usePublicProjects } from '@/features/projects/api/usePublicProjects';

export function ProjectsPage() {
  const { projects } = usePublicProjects();
  // keep the rest of the existing rendering structure
}
```

Change `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx` so it reads one aggregated payload from `usePublicProjectDetail()` instead of manually filtering `reader.getState()`.

Change `apps/web/src/app/routes/public/gallery-view/GalleryViewPage.tsx` and `apps/web/src/app/routes/public/spin-view/SpinViewPage.tsx` so both read `mediaSet + images` from `usePublicMediaSet()`.

- [ ] **Step 4: Run the page tests**

Run: `cd apps/web && npm test -- src/app/routes/public/projects/ProjectsPage.test.tsx src/app/routes/public/project-detail/ProjectDetailPage.test.tsx src/app/routes/public/gallery-view/GalleryViewPage.test.tsx src/app/routes/public/spin-view/SpinViewPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/routes/public/projects/ProjectsPage.tsx apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx apps/web/src/app/routes/public/gallery-view/GalleryViewPage.tsx apps/web/src/app/routes/public/spin-view/SpinViewPage.tsx
git commit -m "feat: migrate public project and media pages to backend api"
```

## Task 5: Migrate map data and remove the local public reader path

**Files:**
- Create: `apps/web/src/features/map/api/fetchMapRelationshipData.ts`
- Modify: `apps/web/src/features/map/api/useMapRelationshipData.ts`
- Modify: `apps/web/src/app/routes/public/map/MapPage.tsx`
- Modify: `apps/web/src/services/storage/publicDataReader.ts`

- [ ] **Step 1: Write the failing map hook test**

Add `apps/web/src/features/map/api/useMapRelationshipData.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { fetchMapRelationshipData } from './fetchMapRelationshipData';

describe('fetchMapRelationshipData', () => {
  it('requests the public map relationship endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue({ nodes: [], edges: [], mediaClusters: [], projectGroups: [] });

    await fetchMapRelationshipData(fetcher);

    expect(fetcher).toHaveBeenCalledWith('/api/public/map-relationship');
  });
});
```

- [ ] **Step 2: Run the map test and confirm the fetch helper is missing**

Run: `cd apps/web && npm test -- src/features/map/api/useMapRelationshipData.test.ts`

Expected: FAIL because the fetch helper does not exist yet.

- [ ] **Step 3: Add the fetch helper and rewire the map hook**

Create `apps/web/src/features/map/api/fetchMapRelationshipData.ts`:

```ts
import { httpJson } from '@/services/api/httpClient';

export async function fetchMapRelationshipData(
  fetcher: (url: string) => Promise<unknown> = (url) => httpJson(url),
) {
  return fetcher('/api/public/map-relationship');
}
```

Update `apps/web/src/features/map/api/useMapRelationshipData.ts`:

```ts
import { useEffect, useMemo, useState } from 'react';
import { buildMapRelationshipViewModel } from '@/features/map/model/mapViewModel';
import { fetchMapRelationshipData } from './fetchMapRelationshipData';

export function useMapRelationshipData() {
  const [source, setSource] = useState({ projects: [], locations: [], mediaSets: [], mediaImages: [], routes: [] });

  useEffect(() => {
    fetchMapRelationshipData().then((next) => {
      setSource(next as typeof source);
    });
  }, []);

  return useMemo(() => buildMapRelationshipViewModel(source), [source]);
}
```

Delete the implementation inside `apps/web/src/services/storage/publicDataReader.ts` once no imports remain.

- [ ] **Step 4: Run the map tests and the full frontend test suite**

Run: `cd apps/web && npm test -- src/features/map/api/useMapRelationshipData.test.ts src/app/routes/public/map/MapPage.test.ts`

Expected: PASS

Run: `cd apps/web && npm test`

Expected: PASS or only fail on known pre-existing unrelated test debt.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/map/api/fetchMapRelationshipData.ts apps/web/src/features/map/api/useMapRelationshipData.ts apps/web/src/app/routes/public/map/MapPage.tsx apps/web/src/services/storage/publicDataReader.ts
git commit -m "feat: migrate public map flow to backend api"
```

## Verification Checklist

- public list/detail/media/map endpoints return only published content
- `GET /api/uploads/:fileId` does not expose unpublished files
- `ProjectsPage`, `ProjectDetailPage`, `GalleryViewPage`, `SpinViewPage`, and `MapPage` no longer import `usePublicData`
- `buildMapRelationshipViewModel` still receives the same logical source shape
- `publicDataReader` is either deleted or reduced to an inert compatibility shim with zero callers

## Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-09-trace-scope-backend-phase-3-public-api-and-frontend-migration.md`.

Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh worker per task and review between tasks
2. Inline Execution - execute tasks in this session using `executing-plans`
