# Trace Scope Backend Recovery and Phase 3 Delegation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the verified repository state with the backend roadmap, finish the missing backend foundation and admin CRUD work in the main workspace, then hand Phase 3 to a weaker model as fixed-scope micro-tasks.

**Architecture:** Treat the existing Phase 1 side branch as a partial bootstrap, not as a completed backend. Recover only the tracked `apps/api` baseline into the current line of work, finish Phase 1 and Phase 2 in the main workspace, and only then start Phase 3. Split Phase 3 by endpoint and page so the assignee never has to make architecture decisions.

**Tech Stack:** Node.js, TypeScript, Fastify, MySQL, Vitest, React

---

## Verified Current State

These facts were checked from the repository and must be treated as the source of truth:

- Current branch: `codex-refine-gallery-loader`
- Current workspace does **not** contain `apps/api`
- Branch `codex/backend-phase-1-foundation-auth` contains one extra committed backend bootstrap commit: `c9720d9 feat: bootstrap trace scope api`
- That Phase 1 branch also has uncommitted scratch output:
  - `apps/api/node_modules/`
  - `apps/api/dist/`
  - `apps/api/vitest.config.js`
  - `apps/api/src/infrastructure/db/runInTransaction.test.ts`
- Branch `codex/phase2-content-crud-and-uploads` points to the same commit as the current branch and does **not** contain `apps/api`
- Public frontend pages still read from browser-local state:
  - `apps/web/src/services/storage/usePublicData.ts`
  - `apps/web/src/services/storage/publicDataReader.ts`
  - `apps/web/src/app/routes/public/projects/ProjectsPage.tsx`
  - `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx`
  - `apps/web/src/app/routes/public/gallery-view/GalleryViewPage.tsx`
  - `apps/web/src/app/routes/public/spin-view/SpinViewPage.tsx`
  - `apps/web/src/features/map/api/useMapRelationshipData.ts`
- `apps/web/src/services/api/httpClient.ts` does not exist yet in the current workspace

## Planning Rules

1. Do not start Phase 3 until `apps/api` exists in the current branch and Phase 2 verification passes.
2. Do not reuse build output or `node_modules` from the old Phase 1 worktree.
3. Do not hand the full backend roadmap to a weaker model at once.
4. Give the weaker model only one bounded micro-task at a time, with fixed file ownership and exact verification commands.
5. Keep the public page presentation layer intact during Phase 3. Only replace data sources.

---

## Task 1: Recover the usable Phase 1 baseline into the main line

**Files:**
- Recover from `codex/backend-phase-1-foundation-auth`:
  - `apps/api/.env.example`
  - `apps/api/package.json`
  - `apps/api/package-lock.json`
  - `apps/api/tsconfig.json`
  - `apps/api/vitest.config.ts`
  - `apps/api/src/main.ts`
  - `apps/api/src/app/buildServer.ts`
  - `apps/api/src/app/buildServer.test.ts`
  - `apps/api/src/app/config.ts`
  - `apps/api/src/app/errors.ts`
- Do **not** recover:
  - `apps/api/node_modules/`
  - `apps/api/dist/`
  - `apps/api/vitest.config.js`
  - `apps/api/src/infrastructure/db/runInTransaction.test.ts`

- [ ] **Step 1: Create a fresh integration branch from the current branch**

Run:

```bash
git switch -c codex/backend-recovery
```

Expected: new branch created from `codex-refine-gallery-loader`.

- [ ] **Step 2: Recover only the tracked bootstrap files from the Phase 1 branch**

Run:

```bash
git checkout codex/backend-phase-1-foundation-auth -- "VS vibe coding files/trace-scope-platform/apps/api/.env.example" "VS vibe coding files/trace-scope-platform/apps/api/package.json" "VS vibe coding files/trace-scope-platform/apps/api/package-lock.json" "VS vibe coding files/trace-scope-platform/apps/api/tsconfig.json" "VS vibe coding files/trace-scope-platform/apps/api/vitest.config.ts" "VS vibe coding files/trace-scope-platform/apps/api/src/main.ts" "VS vibe coding files/trace-scope-platform/apps/api/src/app/buildServer.ts" "VS vibe coding files/trace-scope-platform/apps/api/src/app/buildServer.test.ts" "VS vibe coding files/trace-scope-platform/apps/api/src/app/config.ts" "VS vibe coding files/trace-scope-platform/apps/api/src/app/errors.ts"
```

Expected: `apps/api` now exists in the current workspace without copied build artifacts.

- [ ] **Step 3: Verify the recovered bootstrap still works**

Run:

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/app/buildServer.test.ts
```

Expected: PASS with `GET /health`.

- [ ] **Step 4: Commit the recovered baseline**

Run:

```bash
git add apps/api
git commit -m "feat: restore api bootstrap baseline"
```

---

## Task 2: Finish the missing Phase 1 foundation and auth work

**Files:**
- Create:
  - `apps/api/src/infrastructure/db/pool.ts`
  - `apps/api/src/infrastructure/db/runInTransaction.ts`
  - `apps/api/src/infrastructure/db/migrate.ts`
  - `apps/api/src/infrastructure/db/sql/001_initial_schema.sql`
  - `apps/api/src/infrastructure/security/password.ts`
  - `apps/api/src/infrastructure/security/password.test.ts`
  - `apps/api/src/infrastructure/security/sessionToken.ts`
  - `apps/api/src/modules/auth/repository.ts`
  - `apps/api/src/modules/auth/service.ts`
  - `apps/api/src/modules/auth/routes.ts`
  - `apps/api/src/modules/auth/routes.test.ts`
  - `apps/api/src/modules/auth/bootstrapAdmin.ts`
  - `apps/api/README.md`
- Modify:
  - `apps/api/src/app/buildServer.ts`
  - `apps/api/src/app/config.ts`
  - `apps/api/package.json`

- [ ] **Step 1: Complete DB infrastructure before auth**

Exit criteria:

- config exposes MySQL and session settings
- migration runner exists
- initial schema exists
- transaction helper is implemented and tested

Verification:

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/infrastructure/db/runInTransaction.test.ts
```

- [ ] **Step 2: Add password hashing and session token helpers**

Exit criteria:

- password hash/verify helpers exist
- session token generation exists
- helper tests pass

Verification:

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/infrastructure/security/password.test.ts
```

- [ ] **Step 3: Add auth repository, service, and routes**

Exit criteria:

- login route
- logout route
- session introspection route
- bootstrap admin creation path
- Fastify server registers auth routes and cookie support

Verification:

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/modules/auth/routes.test.ts src/app/buildServer.test.ts
```

- [ ] **Step 4: Run the full Phase 1 API test suite**

Run:

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit completed Phase 1**

Run:

```bash
git add apps/api
git commit -m "feat: complete backend foundation and auth"
```

---

## Task 3: Implement Phase 2 from scratch in the recovered backend

**Files:**
- Create backend:
  - `apps/api/src/infrastructure/db/sql/002_content_and_uploads.sql`
  - `apps/api/src/infrastructure/storage/localFileStorage.ts`
  - `apps/api/src/infrastructure/storage/localFileStorage.test.ts`
  - `apps/api/src/modules/uploads/{types,schemas,repository,service,service.test,routes,routes.test}.ts`
  - `apps/api/src/modules/projects/{schemas,repository,service,service.test,routes}.ts`
  - `apps/api/src/modules/locations/{schemas,repository,service,service.test,routes}.ts`
  - `apps/api/src/modules/routes/{schemas,repository,service,service.test,routes}.ts`
  - `apps/api/src/modules/media-sets/{schemas,repository,service,service.test,routes}.ts`
  - `apps/api/src/modules/media-images/{schemas,repository,service,service.test,routes}.ts`
- Create frontend:
  - `apps/web/src/services/api/httpClient.ts`
  - `apps/web/src/features/projects/api/useAdminProjects.ts`
  - `apps/web/src/features/locations/api/useAdminLocations.ts`
  - `apps/web/src/features/routes/api/useAdminRoutes.ts`
  - `apps/web/src/features/media/api/useAdminMedia.ts`
  - `apps/web/src/features/media/api/uploadFile.ts`
- Modify:
  - `apps/api/package.json`
  - `apps/api/src/app/config.ts`
  - `apps/api/src/app/buildServer.ts`
  - `apps/web/src/services/auth/authContext.tsx`
  - `apps/web/src/services/storage/useAdminData.ts`
  - `apps/web/src/app/routes/admin/projects/AdminProjectsPage.tsx`
  - `apps/web/src/app/routes/admin/locations/AdminLocationsPage.tsx`
  - `apps/web/src/app/routes/admin/routes/AdminRoutesPage.tsx`
  - `apps/web/src/app/routes/admin/media/AdminMediaPage.tsx`

- [ ] **Step 1: Add the content schema migration and local file storage**

Verification:

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/infrastructure/storage/localFileStorage.test.ts
```

- [ ] **Step 2: Implement uploads intake and metadata persistence**

Verification:

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/modules/uploads/service.test.ts src/modules/uploads/routes.test.ts
```

- [ ] **Step 3: Add CRUD modules for projects and locations**

Verification:

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/modules/projects/service.test.ts src/modules/locations/service.test.ts
```

- [ ] **Step 4: Add CRUD modules for routes, media sets, and media images**

Verification:

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/modules/routes/service.test.ts src/modules/media-sets/service.test.ts src/modules/media-images/service.test.ts
```

- [ ] **Step 5: Migrate admin frontend pages off local write paths**

Verification:

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\web"
npm test
```

Expected: admin pages no longer treat browser-local storage as source of truth.

- [ ] **Step 6: Commit completed Phase 2**

Run:

```bash
git add apps/api apps/web
git commit -m "feat: add admin content crud and uploads"
```

---

## Task 4: Enforce the gate before starting Phase 3

Phase 3 may start only when all of the following are true:

- [ ] `apps/api` exists in the current branch
- [ ] Phase 1 API tests pass in the current branch
- [ ] Phase 2 API tests pass in the current branch
- [ ] admin pages fetch/write through backend APIs
- [ ] public pages still render through the existing presentation layer
- [ ] `usePublicData` still exists only as the old public data source, not as a mixed admin/public path

If any item fails, stop and finish Phase 1 or Phase 2 first.

---

## Task 5: Delegate Phase 3 to a weaker model as micro-tasks

The weaker model must not receive "implement Phase 3" as a single request.

It should receive the following micro-tasks one by one.

### Phase 3-A: Public project list endpoint only

**Files:**
- Create:
  - `apps/api/src/modules/public/types.ts`
  - `apps/api/src/modules/public/repository.ts`
  - `apps/api/src/modules/public/service.ts`
  - `apps/api/src/modules/public/service.test.ts`
  - `apps/api/src/modules/public/routes.ts`
  - `apps/api/src/modules/public/routes.test.ts`
- Modify:
  - `apps/api/src/app/buildServer.ts`

**Scope:**
- Only `GET /api/public/projects`
- Only published projects
- No frontend changes

**Verification:**

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/modules/public/service.test.ts src/modules/public/routes.test.ts
```

**Commit:**

```bash
git commit -m "feat: add public projects endpoint"
```

### Phase 3-B: Public project detail endpoint only

**Files:**
- Modify:
  - `apps/api/src/modules/public/types.ts`
  - `apps/api/src/modules/public/repository.ts`
  - `apps/api/src/modules/public/service.ts`
  - `apps/api/src/modules/public/service.test.ts`
  - `apps/api/src/modules/public/routes.ts`
  - `apps/api/src/modules/public/routes.test.ts`

**Scope:**
- Only `GET /api/public/projects/:projectIdOrSlug`
- Return `404` for unpublished or missing project
- No frontend changes

**Verification:**

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/modules/public/service.test.ts src/modules/public/routes.test.ts
```

**Commit:**

```bash
git commit -m "feat: add public project detail endpoint"
```

### Phase 3-C: Public media-set endpoint only

**Files:**
- Modify:
  - `apps/api/src/modules/public/types.ts`
  - `apps/api/src/modules/public/repository.ts`
  - `apps/api/src/modules/public/service.ts`
  - `apps/api/src/modules/public/service.test.ts`
  - `apps/api/src/modules/public/routes.ts`
  - `apps/api/src/modules/public/routes.test.ts`

**Scope:**
- Only `GET /api/public/media-sets/:mediaSetId`
- Must include only data reachable from published projects
- No frontend changes

**Verification:**

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/modules/public/service.test.ts src/modules/public/routes.test.ts
```

**Commit:**

```bash
git commit -m "feat: add public media set endpoint"
```

### Phase 3-D: Public map relationship endpoint only

**Files:**
- Modify:
  - `apps/api/src/modules/public/types.ts`
  - `apps/api/src/modules/public/repository.ts`
  - `apps/api/src/modules/public/service.ts`
  - `apps/api/src/modules/public/service.test.ts`
  - `apps/api/src/modules/public/routes.ts`
  - `apps/api/src/modules/public/routes.test.ts`

**Scope:**
- Only `GET /api/public/map-relationship`
- Preserve the existing logical source shape expected by `buildMapRelationshipViewModel`
- No frontend changes

**Verification:**

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/modules/public/service.test.ts src/modules/public/routes.test.ts
```

**Commit:**

```bash
git commit -m "feat: add public map relationship endpoint"
```

### Phase 3-E: Safe public file reads only

**Files:**
- Modify:
  - `apps/api/src/modules/uploads/repository.ts`
  - `apps/api/src/modules/uploads/routes.ts`
- Create:
  - `apps/api/src/modules/uploads/routes.public.test.ts`

**Scope:**
- Only `GET /api/uploads/:fileId`
- Must reject files not reachable from published content
- No frontend changes

**Verification:**

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test -- src/modules/uploads/routes.public.test.ts
```

**Commit:**

```bash
git commit -m "feat: add safe public upload reads"
```

### Phase 3-F: Add frontend public fetch helpers and hooks only

**Files:**
- Create:
  - `apps/web/src/services/api/httpClient.ts`
  - `apps/web/src/features/projects/api/usePublicProjects.ts`
  - `apps/web/src/features/projects/api/usePublicProjectDetail.ts`
  - `apps/web/src/features/media/api/usePublicMediaSet.ts`
  - `apps/web/src/features/map/api/fetchMapRelationshipData.ts`
- Modify:
  - `apps/web/src/features/map/api/useMapRelationshipData.ts`
  - `apps/web/src/services/storage/usePublicData.ts`
  - `apps/web/src/services/storage/publicDataReader.ts`

**Scope:**
- Add fetch helpers only
- Do not migrate page components yet
- Convert `usePublicData` and `publicDataReader` into clear deprecation shims

**Verification:**

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\web"
npm test -- src/features/projects/api/usePublicProjects.test.tsx src/features/map/api/useMapRelationshipData.test.ts
```

**Commit:**

```bash
git commit -m "feat: add public frontend api hooks"
```

### Phase 3-G: Migrate projects page only

**Files:**
- Modify:
  - `apps/web/src/app/routes/public/projects/ProjectsPage.tsx`
- Create or update:
  - `apps/web/src/app/routes/public/projects/ProjectsPage.test.tsx`

**Scope:**
- Replace `usePublicData()` with `usePublicProjects()`
- Keep rendering structure and styles intact

**Verification:**

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\web"
npm test -- src/app/routes/public/projects/ProjectsPage.test.tsx
```

**Commit:**

```bash
git commit -m "feat: migrate public projects page to api"
```

### Phase 3-H: Migrate project detail page only

**Files:**
- Modify:
  - `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx`
- Create or update:
  - `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.test.tsx`

**Scope:**
- Replace state filtering from `reader.getState()` with one aggregated detail payload
- Keep existing layout components

**Verification:**

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\web"
npm test -- src/app/routes/public/project-detail/ProjectDetailPage.test.tsx
```

**Commit:**

```bash
git commit -m "feat: migrate project detail page to api"
```

### Phase 3-I: Migrate gallery and spin pages only

**Files:**
- Modify:
  - `apps/web/src/app/routes/public/gallery-view/GalleryViewPage.tsx`
  - `apps/web/src/app/routes/public/spin-view/SpinViewPage.tsx`
- Create or update:
  - `apps/web/src/app/routes/public/gallery-view/GalleryViewPage.test.tsx`
  - `apps/web/src/app/routes/public/spin-view/SpinViewPage.test.tsx`

**Scope:**
- Read `mediaSet + images` through `usePublicMediaSet()`
- Keep the viewer components unchanged

**Verification:**

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\web"
npm test -- src/app/routes/public/gallery-view/GalleryViewPage.test.tsx src/app/routes/public/spin-view/SpinViewPage.test.tsx
```

**Commit:**

```bash
git commit -m "feat: migrate public media pages to api"
```

### Phase 3-J: Migrate map page and remove remaining old public data callers

**Files:**
- Modify:
  - `apps/web/src/app/routes/public/map/MapPage.tsx`
  - `apps/web/src/features/map/api/useMapRelationshipData.ts`
  - `apps/web/src/services/storage/usePublicData.ts`
  - `apps/web/src/services/storage/publicDataReader.ts`
- Create or update:
  - `apps/web/src/app/routes/public/map/MapPage.test.tsx`
  - `apps/web/src/features/map/api/useMapRelationshipData.test.ts`

**Scope:**
- Fetch map relationship data from backend
- Remove any remaining runtime dependency on `createPublicDataReader`
- Keep `buildMapRelationshipViewModel` input shape stable

**Verification:**

```bash
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\web"
npm test -- src/features/map/api/useMapRelationshipData.test.ts src/app/routes/public/map/MapPage.test.ts
npm test
```

**Commit:**

```bash
git commit -m "feat: migrate public map flow to api"
```

---

## Weak-Model Guardrails for Phase 3

Use these rules in every Phase 3 assignment:

1. Do not rename route paths.
2. Do not redesign DTOs once the first endpoint contract is chosen.
3. Do not change public page styling unless a test blocks migration.
4. Do not introduce global state libraries.
5. Do not combine two Phase 3 micro-tasks into one prompt.
6. Run only the listed tests first, then broader tests.
7. Stop immediately if the task requires missing Phase 1 or Phase 2 behavior.

---

## Recommended Execution Order

1. Recover bootstrap from Phase 1 side branch
2. Finish missing Phase 1 work
3. Implement Phase 2 from scratch in the recovered backend
4. Verify current branch truly satisfies the Phase 3 gate
5. Hand Phase 3-A through Phase 3-J to the weaker model one at a time

---

## Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-09-trace-scope-backend-recovery-and-phase-3-delegation.md`.

Two execution options:

1. Subagent-Driven (recommended) - dispatch one worker per task or per Phase 3 micro-task, review after each commit
2. Inline Execution - execute the recovery and Phase 1/2 work in this session, then hand Phase 3 off task-by-task
