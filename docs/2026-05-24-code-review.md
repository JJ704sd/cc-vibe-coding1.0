# Trace Scope Platform 代码 Review - 2026-05-24

## Review 范围

本 review 基于当前 `codex/D` 分支工作区状态，覆盖近期的画廊地图首页改版、README 更新、Web API client 恢复，以及 Vite chunk 拆包优化。

本次重点查看：

- Web 画廊首页和地图交互。
- Web 构建拆包配置。
- README 和项目交接信息。
- 当前仍影响生产可用性的后端/API 风险。

这是一份项目现状 review，不代表整个产品已经完成交付。

## 2026-05-26 状态更新

本文件原始 review 写于 `codex/D` 阶段。当前 `main` 已同步到：

```text
b262f8ab Merge pull request #8 from JJ704sd/codex/close-public-uploads
```

原始 review 中两个 Critical 风险已经处理：

- 后台 CRUD 和上传 API 已在服务端增加 admin session 鉴权。
- `/uploads/*` 直接静态公开访问已经关闭，公开文件读取统一走 `/api/public/uploads/:fileId`。

## 2026-06-06 状态更新

当前 `main` 同步到：

```text
36b81293 feat(public-loading): surface loading, error, and empty states on map and projects
```

5-24 计划 `docs/plans/2026-05-24-next-stage-design-roadmap.md` 推荐的 10 项任务（阶段一/二/三）全部完成：

1. 后台写接口鉴权（PR #7）
2. 上传公开访问收敛（PR #8）
3. 生产配置从环境变量到 `buildServer` 的完整传递（commit `ed394f75`）
4. `STORAGE_DIR` / `UPLOAD_ROOT` 上传目录语义统一，`STORAGE_DIR` 优先 + `UPLOAD_ROOT` 兼容回退（commit `1ded5e8d`）
5. 公开项目/媒体封面 URL 语义修正，统一返回 `/api/public/uploads/{fileId}` 风格的可渲染 URL（commit `1d22a52d`）
6. 路线地点替换加事务保护（commit `1ca4f9c6`）
7. 后台发布流程：项目/媒体/路线的就绪度徽标与未完整提示（commit `ba1e6206`）
8. 画廊首页细节：图片失败占位纹理 + 指针 hover 视觉反馈（commit `cfff03b8`）
9. 公开页面互跳导航：面包屑 + 项目/媒体组跳转链接（commit `1c1c0695`）
10. 加载/空/失败状态：`useMapRelationshipData` 暴露 error + `ProjectsPage` 三态卡片 + `MapPage` 错误横幅（commit `36b81293`）

下面"主要问题"段落后半部分的 High/Medium 风险也都已经按"当前状态"行所述处理。

## 主要问题（原始发现 + 当前状态）

### Resolved Critical：后台写接口曾缺少服务端鉴权保护

证据：

- `apps/api/src/app/buildServer.ts` 注册了 `/api/projects`、`/api/locations`、`/api/media-sets`、`/api/media-images`、`/api/routes`、`/api/uploads` 等具备写能力的模块。
- 前端 `RequireAuth` 只保护浏览器内的后台路由访问，不能保护直接 HTTP 请求。

影响：

- 只要客户端能访问 API，就可能绕过前端路由，直接创建、修改、删除或上传数据。
- 这是正式部署前优先级最高的阻断项。

建议：

- 给所有后台写接口增加共享的 `requireAdminSession` preHandler，或统一迁移到 `/api/admin/*`。
- 补充未登录返回 `401`、登录后允许访问的接口测试。

当前状态：

- 已解决。`apps/api/src/modules/auth/requireAdminSession.ts` 提供共享 admin session 校验。
- `apps/api/src/app/buildServer.ts` 已将后台 CRUD 和上传模块注册到 admin session `preHandler` 后。
- 已补充未登录访问返回 `401`、有效 session 可访问、`/api/admin/session` 保持公开查询的 API 测试。

### Resolved Critical：`/uploads/*` 静态访问曾可能绕过发布内容检查

证据：

- 后端已经有受控的公开文件访问路径 `/api/public/uploads/:fileId`。
- 如果同时存在直接公开的 `/uploads/*` 静态挂载，就可能绕过“文件必须属于已发布内容”的检查。

影响：

- 草稿、孤立文件、后台临时上传文件，只要 storage key 泄露就可能被外部访问。
- 这会削弱当前公开内容访问控制模型。

建议：

- 移除或限制公开 `/uploads/*` 静态挂载。
- 公开文件统一通过 `/api/public/uploads/:fileId` 输出。
- 后台预览文件如果需要单独入口，应走带 admin session 的接口。

当前状态：

- 已解决。`apps/api/src/app/buildServer.ts` 已移除 `/uploads/*` 静态目录挂载。
- `@fastify/static` 已从 API 依赖中移除。
- 已补充测试确认 storage 目录中的文件不能再通过 `/uploads/<file>` 直接访问。
- 公开文件读取继续由 `/api/public/uploads/:fileId` 和发布内容可达性检查控制。

### High：生产配置需要端到端验证

证据：

- 配置中包含 CORS origins、rate limit、body limit、trust proxy、log level、secure cookie 等生产相关字段。
- 这些字段需要验证是否确实从 `main.ts` 传入并作用于 `buildServer`。

影响：

- 环境变量看似配置了，但真实启动路径中可能没有生效。
- Caddy/反向代理部署场景下，真实客户端 IP、secure cookie、CORS 和限流行为可能与文档不一致。

建议：

- 增加集成测试或启动路径断言，覆盖 CORS、rate limit、logger、body limit、trust proxy、secure cookie 等配置。

当前状态：

- 已解决。`apps/api/src/main.ts` 现将 `corsOrigins`、`trustProxy`、`logLevel`、`bodyLimitBytes`、`rateLimitMax`、`rateLimitWindowMs` 全部传入 `buildServer`（commit `ed394f75`）。
- `apps/api/src/app/buildServer.test.ts` 补充了 `logLevel` / `trustProxy` / `bodyLimitBytes` 三个端到端断言；CORS / rate limit 此前已有测试。

### High：上传目录配置命名需要统一

证据：

- 代码和运维材料中存在 storage/upload-root 两套命名。
- 备份和恢复脚本必须指向运行时真实使用的上传目录。

影响：

- API 可能写入一个目录，而备份脚本读取另一个目录。
- 恢复时可能遗漏真实上传文件。

建议：

- 保留一个统一的环境变量名，优先使用部署文档和运维脚本已有的命名。
- 删除重复字段或在配置层集中映射，并补测试验证解析结果。

当前状态：

- 已解决。`STORAGE_DIR` 是 API 运行时唯一路径来源；`UPLOAD_ROOT` 作为兼容回退保留，老部署不会突然失效（commit `1ded5e8d`）。
- `scripts/ops/backup-uploads.ps1` / `restore-uploads.ps1`、`apps/api/.env.example`、`docs/operations/single-node-deployment.md` 已同步。
- `apps/api/src/app/config.test.ts` 覆盖 `STORAGE_DIR > UPLOAD_ROOT > 默认` 三档优先级。

### Medium：公开项目封面字段应返回 URL，而不是裸 file id

证据：

- 前端项目卡片会把封面字段当作可直接渲染的图片地址。
- 媒体图片的公开映射已经使用 `/api/public/uploads/:fileId` 风格的可访问 URL。

影响：

- 接入真实上传后，如果项目封面返回的是裸 file id，前端 `<img>` 可能请求错误路径并显示 broken image。

建议：

- 公开 API 返回 `coverImageUrl`。
- 或明确拆分为 `coverFileId` 和 `coverImageUrl`，并同步更新前端类型和测试。

当前状态：

- 已解决。`apps/api/src/modules/public/service.ts` 新增 `toCoverImageUrl(fileId)` helper，公开 API 的 `coverImage` 字段统一返回 `/api/public/uploads/{fileId}` 风格的相对 URL（commit `1d22a52d`）。字段名保留 `coverImage` 减少前端类型破坏。
- `apps/api/src/modules/public/service.test.ts` 覆盖四个公开接口（listProjects、getProjectDetail、getMediaSet、getMapRelationship）的封面 URL 行为。

### Medium：路线地点替换应使用事务

证据：

- 路线地点更新逻辑是先删除旧关联，再插入新关联。

影响：

- 如果中途插入失败，路线可能被清空地点或只写入一部分地点。

建议：

- 使用单个数据库事务包住删除和插入流程。

当前状态：

- 已解决。`apps/api/src/modules/routes/repository.ts` 的 `replaceRouteLocations` 改用单连接事务：`getConnection()` + `beginTransaction` + DELETE/INSERT 循环 + `commit`，任一失败 `rollback` 后重抛（commit `1ca4f9c6`）。
- `apps/api/src/modules/routes/repository.test.ts` 用 mock pool 覆盖成功 / INSERT 失败 / DELETE 失败 三种 commit/rollback 契约。

## 本次变更 Review

### 画廊地图首页

当前画廊首页已经按用户选择的“地台式平铺地图”方向调整：

- 默认状态下，地图面板更像低角度地台。
- 媒体图片以发光星点的形式分布在地图上方。
- 点击进入地图聚焦后，地图状态会旋转/收拢，星点向中国地图区域归位。
- 星点按钮保留无障碍标签，例如 `打开地图媒体：...`，并复用现有媒体选择回调。

相关文件：

- `apps/web/src/components/gallery/GalleryExperience.tsx`
- `apps/web/src/components/gallery/GalleryExperience.test.tsx`
- `apps/web/src/features/gallery/useCurvedMapProjection.ts`

### Vite chunk 优化

Web 构建已经增加手动 vendor 拆包：

- `vendor-react`
- `vendor-three`
- `vendor-maplibre`
- `vendor`

优化效果：

- `GalleryHome` chunk 从约 560 KB 降到约 42 KB。
- 入口 `index` chunk 从约 293 KB 降到约 8.6 KB。
- `maplibre-gl` 仍是较大的单库 chunk，但已经被隔离，只在需要地图能力时加载。
- 当前构建不再出现 Vite chunk size warning。

相关文件：

- `apps/web/vite.config.ts`

### 文档和 API client

- `README.md` 已按当前前后端结构、验证结果和后续风险重新整理。
- `apps/web/src/services/api/adminApi.ts` 和 `apps/web/src/services/api/httpClient.ts` 已恢复，因为当前 Web 构建会引用它们。

## 验证记录

最近一次全量验证（2026-06-06）执行过：

```powershell
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\api" test
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\api" run build
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\web" test
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\web" run build
```

结果：

- API tests：8 个测试文件通过，52 个测试通过。
- API build：通过。
- Web tests：37 个测试文件通过，131 个测试通过。
- Web build：通过。
- Vite chunk size warning：手动拆包后未再出现（`vendor-maplibre` 仍最大 chunk，约 1.05 MB，但已被隔离只在地图能力加载时引入）。

## 当前主干说明

当前主干：

- `main`

最近主干提交：

- `36b81293 feat(public-loading): surface loading, error, and empty states on map and projects`
- `1c1c0695 feat(public-nav): cross-link project, media viewer, and map pages`
- `cfff03b8 feat(gallery): texture placeholder and pointer hover feedback on map cards`
- `ba1e6206 feat(admin): surface publish readiness in project, media, and route lists`
- `1d22a52d fix(api): return renderable cover image URLs from public endpoints`
- `1ca4f9c6 fix(api): wrap route location replace in a transaction`
- `1ded5e8d refactor(api): unify STORAGE_DIR with legacy UPLOAD_ROOT alias`
- `ed394f75 fix(api): forward production config from main.ts to buildServer`

远程：

- `origin https://github.com/JJ704sd/cc-vibe-coding1.0.git`

原始 review 对应的 `codex/D` 工作区说明已经不再代表当前状态。后续应以 `main` 和最新功能报告为准：

- `docs/2026-05-26-current-feature-introduction-report.md`
- `docs/plans/2026-05-24-next-stage-design-roadmap.md`
- `CLAUDE.md`（已修正过时分支描述）

## 建议下一步

5-24 计划 1-10 项已全部交付完成。下一步推荐：

1. 同步 `apps/api/.env.production.example` 把 `UPLOAD_ROOT` 换成 `STORAGE_DIR`，跟实际 `config.ts` 行为对齐。
2. 给移动端布局做一次专项检查（5-24 阶段三验收里提到"移动端不出现文字和控件重叠"，本轮 3-1/3-2/3-3 未专门处理）。
3. 加 E2E 测试（Playwright）覆盖公开页 + 后台流程，防止未来回归。
4. 配 GitHub Actions CI，让 PR 自动跑 API + Web 测试和 build。
5. 性能优化：`vendor-maplibre` 1.05 MB 仍是最大 chunk，可在地图页用 dynamic import 延迟加载。
