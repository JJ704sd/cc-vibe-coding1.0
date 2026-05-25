# Trace Scope Backend Modular Monolith Design

## Goal

Design the first real backend for Trace Scope Platform so the project can move from a frontend-only prototype into a deployable system that supports:

- single-machine, non-container deployment,
- MySQL as the primary database,
- local-disk file storage for uploads,
- future public multi-user access,
- later service extraction without rewriting the domain model.

The backend must preserve the existing core domain chain:

`Project -> Location -> MediaSet / Route`

and must keep `MediaImage` attached to `MediaSet` rather than introducing new top-level entities.

---

## Current State Review

### Frontend Structure

The current repository contains a single frontend app at [`apps/web`](D:\VS vibe coding files\trace-scope-platform\apps\web).

Routing is already split between public pages and admin pages in [`apps/web/src/app/router.tsx`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\app\router.tsx). This is a good architectural starting point because the eventual backend can mirror the same separation between public read APIs and admin write APIs.

### Data and Auth Reality

The current "backend" behavior is still local prototype infrastructure:

- [`apps/web/src/services/storage/adminDataStore.ts`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\services\storage\adminDataStore.ts) persists admin edits to `localStorage`
- [`apps/web/src/services/storage/publicDataReader.ts`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\services\storage\publicDataReader.ts) derives public-facing data from that local store
- [`apps/web/src/services/auth/authContext.tsx`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\services\auth\authContext.tsx) uses hard-coded credentials and session storage

This means the current admin pages are structural shells over browser-local state, not a real multi-user system.

### Domain Stability

The domain model in [`apps/web/src/types/domain.ts`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\types\domain.ts) is stable enough to drive backend design:

- `Project`
- `Location`
- `MediaSet`
- `MediaImage`
- `RouteEntity`
- `AdminUser`

The backend should adopt these entities rather than inventing a parallel vocabulary.

### Frontend Verification Caveat

The frontend is structurally usable, but it is not in a clean green state:

- `npm test` currently fails in a few gallery and projection tests
- `npm run build` currently fails due to a TypeScript issue in a test file

This is important operational context, but it does not block backend architecture design. It does mean backend rollout should be staged so the frontend can migrate from mock/local storage to API-backed data incrementally rather than through a single large cutover.

---

## Constraints Confirmed With User

- Deployment model: single machine, no containers
- Database: existing MySQL environment
- Upload storage: local disk first
- Backend style: modular monolith
- Backend framework: Fastify
- Backend language/runtime: Node.js + TypeScript
- Long-term target: support future public multi-user access

These constraints define the shape of the design. This is not a "cloud-native first" architecture and should not pretend to be one.

---

## Design Decision

Build one backend app at `apps/api` as a modular monolith using Fastify and TypeScript.

The system will deploy as a single Node.js process behind Caddy or Nginx. Internally, it will be organized into modules with explicit boundaries so later extraction is possible, but there will be no microservice split in the first version.

This gives the project:

- low deployment complexity now,
- clear module seams for future growth,
- no need for containers,
- no lock-in to a browser-local data model,
- no forced rewrite when public traffic and multiple editors arrive later.

---

## Target Runtime Topology

First-version deployment topology:

```text
Browser
  -> HTTPS reverse proxy (Caddy or Nginx)
    -> static frontend files
    -> /api/* -> Fastify backend
      -> MySQL
      -> local upload directory on disk
```

Recommended production shape on one Linux machine:

- frontend static build served by Caddy or Nginx
- backend Fastify process managed by `systemd`
- MySQL installed directly on the host
- upload root stored outside the frontend build output
- TLS terminated at the reverse proxy

MySQL should not be exposed directly to the public internet.

---

## Repository and Directory Design

Recommended repository evolution:

```text
apps/
  web/
  api/
    src/
      app/
      modules/
        auth/
        projects/
        locations/
        media-sets/
        media-images/
        routes/
        uploads/
        public/
      infrastructure/
        db/
        storage/
        http/
        security/
      jobs/
packages/
  shared/
```

### `apps/api/src/app`

Responsibilities:

- server bootstrap
- environment loading
- Fastify plugin registration
- module registration order
- lifecycle hooks

It should not contain business logic.

### `apps/api/src/modules/*`

Each domain-facing module owns one coherent business area.

Every module should follow the same internal structure:

```text
routes.ts
service.ts
repository.ts
schemas.ts
types.ts
```

Rules:

- `routes.ts` receives HTTP requests and performs request/response schema wiring
- `service.ts` owns business rules
- `repository.ts` owns MySQL access only
- `schemas.ts` defines validation and serialization contracts
- `types.ts` contains module-local types only

No module should reach directly into another module's database tables without going through a service or clearly defined repository dependency.

### `apps/api/src/infrastructure`

Responsibilities:

- MySQL connection and transaction helpers
- file storage implementation for local disk
- password hashing
- session cookie helpers
- HTTP error mapping and shared response helpers

This layer exists to keep framework and environment concerns out of the domain modules.

### `packages/shared`

This package is recommended, not mandatory on day one.

Purpose:

- shared DTO shapes between frontend and backend
- common domain enums such as publish status and media set type
- response contracts consumed by both `apps/web` and `apps/api`

The backend should not depend directly on frontend source files under `apps/web/src`.

---

## Module Boundaries

### `auth`

Responsibilities:

- admin login
- session creation and validation
- logout
- role checks

Out of scope for v1:

- OAuth
- password reset email flow
- SSO

### `projects`

Responsibilities:

- project CRUD
- publish status changes
- project list and detail for admin
- project-level validation before publish

### `locations`

Responsibilities:

- location CRUD
- project ownership enforcement
- geographic metadata validation
- visit order handling where applicable

### `media-sets`

Responsibilities:

- media set CRUD
- relation to project and optional location
- type distinction between `spin360` and `gallery`
- featured flags and descriptive metadata

### `media-images`

Responsibilities:

- media image metadata CRUD
- attachment to media sets
- image ordering
- optional coordinate metadata
- caption and alt text rules

### `routes`

Responsibilities:

- route CRUD
- route metadata
- route-to-location ordering via association table

### `uploads`

Responsibilities:

- multipart upload intake
- disk path generation
- upload metadata persistence
- controlled file read access
- future thumbnail generation seam

This module manages physical files, not business meaning.

### `public`

Responsibilities:

- published project list
- published project detail
- map relationship data for public pages
- media-set detail read APIs for public viewers

This module is read-only. It should aggregate from other repositories/services and never contain admin write behavior.

---

## Database Design

### Core Tables

The first backend version should include these tables:

- `admin_user`
- `admin_session`
- `project`
- `project_tag`
- `location`
- `media_set`
- `media_image`
- `route`
- `route_location`
- `upload_file`

### `admin_user`

Suggested fields:

- `id`
- `username`
- `password_hash`
- `role`
- `is_active`
- `created_at`
- `updated_at`

Initial role model can start with `admin`, but the table must keep a `role` field so `editor` can be added later without schema redesign.

### `admin_session`

Suggested fields:

- `id`
- `user_id`
- `session_token_hash`
- `expires_at`
- `created_at`
- `last_seen_at`
- `ip_address`
- `user_agent`

Store a hash of the session token, not the raw token value.

### `project`

Suggested fields:

- `id`
- `title`
- `slug`
- `summary`
- `description`
- `cover_upload_file_id`
- `status`
- `created_at`
- `updated_at`

Project tags should use a normalized table in v1 rather than a serialized field so admin editing, filtering, and later public querying stay straightforward.

### `project_tag`

Suggested fields:

- `project_id`
- `tag`

Use one row per tag value. Keep the table simple unless tag metadata becomes a real domain concern later.

### `location`

Suggested fields:

- `id`
- `project_id`
- `name`
- `slug`
- `description`
- `latitude`
- `longitude`
- `address_text`
- `visit_order`
- `created_at`
- `updated_at`

Latitude and longitude should use ordinary numeric columns, not vendor-specific GIS types in v1.

### `media_set`

Suggested fields:

- `id`
- `project_id`
- `location_id` nullable
- `type`
- `title`
- `description`
- `cover_upload_file_id`
- `is_featured`
- `created_at`
- `updated_at`

### `media_image`

Suggested fields:

- `id`
- `media_set_id`
- `upload_file_id`
- `alt_text`
- `caption`
- `sort_order`
- `latitude` nullable
- `longitude` nullable
- `created_at`
- `updated_at`

This table represents the business image record. It should not be treated as the storage table.

### `route`

Suggested fields:

- `id`
- `project_id`
- `name`
- `description`
- `line_style`
- `color`
- `is_featured`
- `created_at`
- `updated_at`

### `route_location`

Suggested fields:

- `route_id`
- `location_id`
- `sort_order`

This is the correct place to keep route ordering. Do not hide sequence in JSON if route relationships are core application data.

### `upload_file`

Suggested fields:

- `id`
- `storage_key`
- `original_filename`
- `mime_type`
- `byte_size`
- `sha256_hash`
- `created_at`

Optional later additions:

- `image_width`
- `image_height`
- `derivative_group_id`

The purpose of `upload_file` is to track physical file metadata independent of business attachments.

---

## Identifier and Timestamp Rules

Recommended conventions:

- IDs should be string-based, not auto-increment integers
- timestamps should be explicit `created_at` and `updated_at`
- ordering should always use an explicit `sort_order` integer
- status fields should remain string enums such as `draft` and `published`

String IDs make future extraction and migration easier, especially if the system later introduces background jobs, import/export, or distributed writes.

---

## File Storage Rules

### Storage Root

Files should be stored under a configurable root such as:

```text
/var/lib/trace-scope/uploads
```

The exact path is environment-dependent and must come from configuration.

### Storage Strategy

Rules:

- store files outside the frontend static build output
- store relative storage keys in the database, not absolute disk paths
- rename files on write so user filenames do not determine disk layout
- preserve original filenames only as metadata
- shard directories by date and hash prefix to avoid huge flat folders

Example storage key:

```text
original/2026/04/09/ab/cd/<generated-id>.jpg
```

### Public Access Strategy

Do not expose the upload root as a raw public directory in v1.

Instead, files should be read through controlled backend endpoints such as:

```text
/api/uploads/:fileId
```

or a controlled public route that resolves a storage key internally.

This keeps future migration to object storage or signed delivery URLs straightforward.

### Storage Abstraction

Define a storage interface in infrastructure:

```ts
interface FileStorage {
  save(input: SaveFileInput): Promise<StoredFile>;
  read(fileId: string): Promise<StoredFileReadResult | null>;
  delete(fileId: string): Promise<void>;
}
```

The first implementation is local disk. A future object-storage implementation should be swappable without rewriting domain services.

---

## API Design

The backend should expose two API families.

### Public API

Read-only endpoints consumed by the public site:

- `GET /api/public/projects`
- `GET /api/public/projects/:slug`
- `GET /api/public/map`
- `GET /api/public/media-sets/:id`
- `GET /api/public/media-sets/:id/images`

Rules:

- only published data is returned
- unpublished records are invisible to anonymous callers
- no admin-only metadata leaks into public responses

### Admin API

Authenticated endpoints consumed by the admin UI:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `GET /api/admin/projects`
- `POST /api/admin/projects`
- `PATCH /api/admin/projects/:id`
- corresponding CRUD endpoints for locations, media sets, media images, routes
- `POST /api/admin/uploads`
- `POST /api/admin/media-images/reorder`

Rules:

- all write operations require a valid admin session
- input validation happens before business logic
- route handlers remain thin

---

## Authentication and Authorization

### Authentication Mode

Use server-side session authentication with secure cookies.

This is the correct first choice because:

- deployment is single-machine
- the admin UI is first-party
- session revocation and logout are simple
- the system does not need third-party API tokens yet

Do not start with JWT for the admin panel.

### Cookie and Session Rules

Recommended session behavior:

- `httpOnly` cookies
- `Secure` enabled in HTTPS environments
- `SameSite=Lax`
- server-side session validation against `admin_session`
- logout invalidates the stored session

### Authorization Model

V1 can start with one role: `admin`.

But authorization checks should still be expressed in services or reusable guards as:

- "is authenticated"
- "has required role"

not as ad hoc checks sprinkled across route handlers.

This keeps the path open for `editor` or read-only admin roles later.

---

## Validation and Error Handling

### Validation

Use Fastify request schemas for:

- body validation
- query validation
- params validation
- response shaping where practical

Schema validation must run before service execution.

### Error Model

Adopt a unified error response shape:

```json
{
  "code": "PROJECT_NOT_FOUND",
  "message": "Project does not exist",
  "details": null
}
```

Rules:

- never leak raw SQL errors to the client
- never leak absolute disk paths
- map known business errors to explicit HTTP status codes
- unknown errors go through centralized logging and a generic 500 response

---

## Transactions and Consistency Rules

The backend must use transactions for multi-step writes where partial success would corrupt meaning.

Important cases:

- create media image record after upload metadata insert
- reorder images in a media set
- publish a project after validating required linked records
- update route ordering in `route_location`

Business invariants must live in the service layer, not in the route handlers.

---

## Deployment and Configuration

### Required Configuration

The backend should load configuration from environment variables such as:

- `PORT`
- `APP_BASE_URL`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `UPLOAD_ROOT`
- `SESSION_SECRET`
- `COOKIE_SECURE`
- `ADMIN_BOOTSTRAP_USERNAME`
- `ADMIN_BOOTSTRAP_PASSWORD`

Hard-coded credentials like the current frontend prototype must not survive into the backend system.

### Process Management

Recommended runtime management:

- run Fastify with Node.js under `systemd`
- use Caddy or Nginx as reverse proxy
- keep MySQL local or private-network only
- back up both MySQL and upload files on a schedule

### Logging

Minimum logs for v1:

- access logs
- auth success/failure logs
- upload failure logs
- important write-operation audit logs

System-level log collection can remain local through `journald` in the first deployment stage.

---

## Testing Strategy

### Unit Tests

Cover:

- service-layer business rules
- publish validation
- storage key generation
- image reorder logic
- session creation and expiry helpers

### Integration Tests

Cover:

- repository behavior against MySQL
- upload lifecycle from metadata to disk persistence
- login and session validation
- published-vs-draft filtering in public queries

### API Tests

Cover:

- public read endpoints
- admin authentication boundaries
- CRUD happy paths
- validation failures
- standardized error responses

The backend test plan should focus first on business correctness and data integrity, not on broad end-to-end UI automation.

---

## Migration Strategy From Current Frontend

The frontend should migrate in stages rather than through a single cutover.

Recommended sequence:

1. add `apps/api` and shared contracts
2. implement auth and session endpoints
3. implement admin CRUD APIs
4. implement upload APIs and disk storage
5. implement public read APIs
6. replace frontend local storage writes with API calls
7. replace frontend public data readers with API-backed queries
8. remove browser-local auth and storage scaffolding

This order reduces risk because the frontend can switch one capability at a time.

---

## Risks

### Risk 1: Thin deployment, thick coupling

A single-process backend can still become hard to evolve if modules reach across each other freely. Strict service and repository boundaries are mandatory.

### Risk 2: File storage leakage

If raw disk paths or public static directories become part of the client contract, later migration to object storage becomes painful. The client must depend on backend-controlled file URLs.

### Risk 3: Public/admin API mixing

If public and admin response shapes or permission checks are mixed in the same route layer, security regressions become more likely. Keep them explicitly separate.

### Risk 4: Browser-prototype assumptions surviving too long

The current frontend relies on local storage and hard-coded auth. If the migration drags on, the team may accidentally maintain both truth sources. The backend must become the single source of truth as soon as APIs are ready.

### Risk 5: Premature service splitting

Trying to split uploads, jobs, or public APIs into separate processes too early would add operational weight without current payoff. Keep the first release as one process with clear seams.

---

## Non-Goals

This design intentionally does not include:

- container-based deployment
- Kubernetes or distributed orchestration
- object storage as the first file backend
- advanced GIS infrastructure
- realtime collaboration
- complex workflow engines
- third-party identity providers

These may come later, but they are not required to solve the current problem.

---

## Success Criteria

This design is successful when:

- the repository contains a real backend at `apps/api`
- deployment on one machine is straightforward
- MySQL becomes the system of record
- uploaded files live on local disk through a clean abstraction
- public and admin APIs are clearly separated
- admin auth is server-side and no longer browser-local
- the frontend can migrate away from `localStorage` without a rewrite
- future extraction of uploads, jobs, or public read APIs remains possible because boundaries were preserved from the start
