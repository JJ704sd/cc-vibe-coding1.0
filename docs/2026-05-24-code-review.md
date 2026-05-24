# Trace Scope Platform Code Review - 2026-05-24

## Findings

### Critical: 后台 CRUD 和上传接口没有服务端鉴权

- 证据：
  - `apps/api/src/app/buildServer.ts:131` 注册 `/api/projects`
  - `apps/api/src/app/buildServer.ts:135` 注册 `/api/locations`
  - `apps/api/src/app/buildServer.ts:139` 注册 `/api/media-sets`
  - `apps/api/src/app/buildServer.ts:143` 注册 `/api/media-images`
  - `apps/api/src/app/buildServer.ts:147` 注册 `/api/routes`
  - `apps/api/src/app/buildServer.ts:154` 注册 `/api/uploads`
  - `apps/api/src/app/buildServer.ts:161-168` 只注册了 login/session/logout，没有把鉴权 preHandler 套到上述写接口上。
- 影响：
  - 任何能访问 API 的客户端都可以直接 `POST/PUT/DELETE /api/projects`、`/api/media-sets`、`/api/uploads` 等接口。
  - 前端 `RequireAuth` 只是浏览器内的路由保护，不能替代服务端权限校验。
  - 当前后台登录成功与否不会决定这些 CRUD API 的访问权限。
- 建议：
  - 把后台管理接口统一迁移到 `/api/admin/*`，或在现有 `/api/projects` 等接口上增加共享 `requireAdminSession` preHandler。
  - 对每个写接口补测试：未登录返回 `401`，登录后允许访问。
  - 前端 `adminApi.ts` 保持 `credentials: 'include'`，但不要依赖 `sessionStorage` 作为权限来源。

### Critical: `/uploads/*` 静态服务绕过了已发布内容可达性检查

- 证据：
  - `apps/api/src/app/buildServer.ts:114-118` 直接把整个上传目录挂到 `/uploads/`。
  - `apps/api/src/modules/public/routes.ts:27-42` 虽然提供了受控的 `/api/public/uploads/:fileId`，但这个检查无法限制 `/uploads/original/...` 的直连访问。
  - `apps/api/src/infrastructure/storage/localFileStorage.ts:59` 保存文件时返回的是 `publicBaseUrl + storageKey`，容易把真实 storage key 暴露出去。
- 影响：
  - 草稿项目、未引用图片、后台临时上传文件，只要拿到 storage key 就能通过 `/uploads/*` 访问。
  - 结合未鉴权的 `/api/uploads`，外部用户可以上传文件并拿到直连 URL。
  - 这削弱了 `isFileReachableFromPublishedContent` 的发布态访问控制设计。
- 建议：
  - 取消公开的 `/uploads/*` 静态挂载，统一通过 `/api/public/uploads/:fileId` 输出已发布内容文件。
  - 后台预览文件单独走需要 admin session 的接口。
  - 上传响应不要返回 storage key 直连 URL；返回 `fileId`，由前端按上下文选择公开或后台预览接口。

### High: 生产运行配置定义了但没有传进 `buildServer`

- 证据：
  - `apps/api/src/app/config.ts:51-79` 定义了 `corsOrigins`、`trustProxy`、`logLevel`、`bodyLimitBytes`、`rateLimitMax`、`rateLimitWindowMs` 等配置。
  - `apps/api/src/app/buildServer.ts:65-84` 只有在 `input` 里传入这些字段时才会启用。
  - `apps/api/src/main.ts:36-40` 启动时只传了 `authService`、`cookieSecure`、`systemHealthService`。
- 影响：
  - `CORS_ORIGINS`、`RATE_LIMIT_*`、`BODY_LIMIT_BYTES`、`TRUST_PROXY`、`LOG_LEVEL` 这些环境变量在真实启动路径中不会生效。
  - 登录和上传接口少了限流保护，生产日志也被默认关闭。
  - Caddy/反向代理场景下真实客户端 IP、secure cookie 判定等行为可能与部署文档不一致。
- 建议：
  - 在 `main.ts` 调用 `buildServer` 时显式传入这些配置。
  - 给 `main` 或 `buildServer` 增加集成测试，断言配置会启用 CORS、rate limit 和 logger。

### High: 上传目录配置使用了两个名字，运维备份目标可能和实际存储目录不一致

- 证据：
  - `apps/api/src/app/config.ts:67` 实际文件服务使用 `STORAGE_DIR`，默认 `./storage`。
  - `apps/api/src/app/config.ts:73` 同时还读取 `UPLOAD_ROOT`，但 `buildServer.ts:94-115` 和 `main.ts:21-32` 都使用 `config.storageDir`。
  - `apps/api/.env.production.example` 和 `scripts/ops/backup-uploads.ps1:3-7` 使用的是 `UPLOAD_ROOT`。
- 影响：
  - 生产环境按文档配置 `UPLOAD_ROOT` 后，API 仍可能把文件写到 `apps/api/storage`。
  - 备份脚本备份的是 `UPLOAD_ROOT`，实际上传文件却可能不在里面，恢复流程也会恢复错目录。
- 建议：
  - 统一保留一个配置名。若文档和脚本已经使用 `UPLOAD_ROOT`，建议让 `storageDir` 直接来源于 `UPLOAD_ROOT`。
  - 删除未使用的重复字段，补一条配置测试断言上传目录解析结果。

### Medium: 上传大小限制同时存在配置值和硬编码值

- 证据：
  - `apps/api/src/app/buildServer.ts:110` multipart 使用 `config.maxUploadBytes`。
  - `apps/api/src/modules/uploads/service.ts:8` 又硬编码 `MAX_BYTES = 10 * 1024 * 1024`。
  - `apps/api/src/modules/uploads/service.ts:45-46` 服务层继续按硬编码值拒绝文件。
- 影响：
  - 当 `MAX_UPLOAD_BYTES` 配成大于 10 MB 时，Fastify 已放行，但服务层仍会拒绝。
  - 当未来调整配置时，测试和运维预期容易出现分叉。
- 建议：
  - 将 `maxUploadBytes` 注入 `UploadService`，或只保留 multipart 限制并统一错误处理。
  - 补测试覆盖 `MAX_UPLOAD_BYTES` 非 10 MB 的情况。

### Medium: 公开项目封面返回 file id，但前端按图片 URL 使用

- 证据：
  - `apps/api/src/modules/public/service.ts:70` 项目列表返回 `coverImage: p.cover_upload_file_id`。
  - `apps/api/src/modules/public/service.ts:152` 项目详情返回 `coverImage: project.cover_upload_file_id`。
  - `apps/web/src/components/project/ProjectCard.tsx:13` 直接把 `project.coverImage` 放进 `<img src={...}>`。
- 影响：
  - 后端接入真实上传后，公开项目卡片封面会请求类似 `/projects/<uuid>` 上下文下的相对路径或裸 UUID，图片会 broken。
  - `getMediaSet` 已经把图片 URL 映射到 `/api/public/uploads/:fileId`，封面字段应该保持同样语义。
- 建议：
  - 公共 API 的 `coverImage` 字段返回 `/api/public/uploads/<fileId>`，或明确拆成 `coverFileId` 与 `coverImageUrl`。
  - 更新 `PublicProjectCard` 类型和相关测试。

### Low: 路线地点替换不是事务操作

- 证据：
  - `apps/api/src/modules/routes/repository.ts:102-110` 先删除 `route_location`，再逐条插入新地点。
- 影响：
  - 如果中途插入失败，原路线地点会被清空或部分写入。
- 建议：
  - 复用 `runInTransaction`，把删除和插入包进同一个事务。

## Positive Notes

- 前后端已有较多 Vitest 覆盖，当前基础回归反馈速度不错。
- 后端模块边界基本清晰，`routes/service/repository/types` 的分层便于补鉴权和事务。
- 公共文件访问已经有“发布内容可达性”的服务层设计，只是目前被 `/uploads/*` 静态挂载绕开。
- Web 构建做了路由级拆包，除 `maplibre-gl` 和 gallery 相关 chunk 外，大部分页面 chunk 体积可控。

## Verification

本次 review 执行过以下命令：

```powershell
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\web' test
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\api' test
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\web' run build
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\api' run build
```

结果：

- Web tests: 34 files passed, 108 tests passed.
- API tests: 6 files passed, 11 tests passed.
- Web build: passed, but Vite warned that `maplibre-gl` and `GalleryHome` chunks are larger than 600 kB.
- API build: passed.

## Current Worktree Notes

Review 时当前分支为 `codex/D`，最新提交为 `0b74b05 chore: sync api clients and dependency locks`。

review 前已有未跟踪文件：

- `CLAUDE.md`
- `apps/web/check_build.sh`
- `docs/superpowers/plans/2026-04-07-gallery-reference-homepage.md`
- `docs/superpowers/plans/2026-04-08-curved-geo-gallery.md`
- `docs/superpowers/plans/2026-04-08-map-true-projection-overlay.md`
- `docs/superpowers/specs/2026-04-08-curved-geo-gallery-design.md`

本 review 未清理或回滚这些文件。
