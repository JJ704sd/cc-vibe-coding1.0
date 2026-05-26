# Trace Scope Platform 功能介绍报告 - 2026-05-26

## 读者定位

这份报告写给后续开发者、产品协作者，以及上下文能力较弱的模型。阅读者不需要先理解整个代码库，只要按本文的层次阅读，就能知道项目现在能做什么、代码在哪里、哪些能力已经完成、哪些地方还只是基础结构或仍有风险。

本文基于远程主干 `origin/main` 的当前状态编写。当前已同步到本地的最新主干提交为：

```text
8151ae25 Merge pull request #7 from JJ704sd/codex/admin-api-auth
```

该提交已包含后台 API 服务端 admin session 鉴权改动。

## 一句话说明

Trace Scope Platform 是一个“空间叙事网站平台”：用项目作为顶层内容单元，把地点、路线、地图关系、图库图片、360 序列图片组织到同一个前台体验和后台管理系统里。

## 当前总体状态

项目已经从早期前端原型推进到前后端分离结构：

- `apps/web` 是 React/Vite/TypeScript 前端。
- `apps/api` 是 Fastify/TypeScript/MySQL 后端。
- 前台已经有首页画廊、项目列表、项目详情、地图关系页、图库查看页、360 查看页。
- 后台已经有登录、项目管理、地点管理、媒体管理、路线管理的页面入口和 API client。
- 后端已经有 auth、projects、locations、media-sets、media-images、routes、uploads、public、system 模块。
- MySQL 迁移、上传文件表、本地文件存储、公开 API、健康检查、部署脚本和测试脚本都已存在。
- 后台 CRUD 和上传接口已经加上服务端 admin session 鉴权。
- 上传文件公开读取已经收敛到 `/api/public/uploads/:fileId`，不再通过 `/uploads/*` 直接暴露存储目录。

这不是一个完全交付状态的产品。它更准确的状态是：核心结构、主要页面、基础数据链路、安全底座的一部分已经完成，但生产配置传递、上传目录语义、封面 URL 语义、内容发布闭环还需要继续收口。

## 技术栈

| 层级 | 使用技术 | 当前用途 |
| --- | --- | --- |
| Web 前端 | React 19, Vite, TypeScript, React Router | 前台页面、后台页面、路由懒加载 |
| 可视化 | Three.js, MapLibre GL, Framer Motion | 画廊首页 3D 场景、地图关系页、动画 |
| API 后端 | Node.js, Fastify, TypeScript | HTTP API、认证、CRUD、上传、公开数据 |
| 数据库 | MySQL | 管理用户、会话、项目、地点、媒体、路线、上传文件 |
| 文件存储 | Fastify multipart, 本地文件系统 | 后台上传文件、公开文件读取 |
| 测试 | Vitest, Testing Library, jsdom | 前后端单元和组件测试 |
| 运维 | PM2, Caddy, PowerShell scripts | 单节点部署、备份、恢复、健康检查 |

## 目录结构

```text
trace-scope-platform/
|-- apps/
|   |-- api/                 # Fastify 后端
|   `-- web/                 # React + Vite 前端
|-- deploy/
|   `-- caddy/               # Caddy 反向代理配置
|-- docs/
|   |-- operations/          # 部署、备份、恢复文档
|   |-- plans/               # 阶段规划
|   |-- specs/               # 设计规格
|   `-- superpowers/         # 更细的设计和执行计划
|-- scripts/
|   `-- ops/                 # 运维脚本
|-- ecosystem.config.cjs     # PM2 配置
`-- README.md
```

## 核心业务概念

### Project

`Project` 是顶层叙事单元。可以理解为一个专题、一次旅行、一个展览、一个空间故事。项目下面可以挂地点、路线、媒体组。

重要字段：

- `title`：项目标题。
- `slug`：公开访问用的短标识。
- `summary`：摘要。
- `description`：详情文本。
- `cover_upload_file_id`：封面文件 id。
- `status`：`draft` 或 `published`。

### Location

`Location` 是一个项目中的地理点位。它必须属于某个项目。

重要字段：

- `project_id`：所属项目。
- `name`：地点名称。
- `latitude` / `longitude`：经纬度。
- `address_text`：地址文本。
- `visit_order`：访问顺序，可为空。

### MediaSet

`MediaSet` 是媒体组。它必须属于某个项目，可以选择关联某个地点。

当前支持两种类型：

- `spin360`：360 序列图片。
- `gallery`：普通图集。

重要字段：

- `project_id`：所属项目。
- `location_id`：可选地点。
- `type`：`spin360` 或 `gallery`。
- `cover_upload_file_id`：媒体组封面文件 id。
- `is_featured`：是否重点展示。

### MediaImage

`MediaImage` 是媒体组里的单张图片。它只能挂到 `MediaSet` 下，不能直接挂到项目或页面。

重要字段：

- `media_set_id`：所属媒体组。
- `upload_file_id`：对应上传文件。
- `alt_text`：图片替代文本。
- `caption`：说明文字。
- `sort_order`：排序。
- `latitude` / `longitude`：可选图片点位，用于画廊首页投影到地图。

### Route

`Route` 是一个项目里的路径或行程线。它必须属于某个项目，并通过 `route_location` 关联一组地点。

重要字段：

- `project_id`：所属项目。
- `line_style`：`solid` 或 `dashed`。
- `color`：路线颜色。
- `is_featured`：是否重点展示。

### UploadFile

`UploadFile` 记录后台上传的文件元数据。

重要字段：

- `storage_key`：文件在本地存储中的 key。
- `original_filename`：原始文件名。
- `mime_type`：文件类型。
- `byte_size`：文件大小。
- `sha256_hash`：文件 hash。

## 核心数据关系

最重要的约束链路是：

```text
Project
|-- Location
|-- MediaSet
|   `-- MediaImage
`-- Route
    `-- route_location -> Location
```

弱模型需要特别记住：

- `Project` 是顶层。
- `Location`、`MediaSet`、`Route` 都属于 `Project`。
- `MediaImage` 只属于 `MediaSet`。
- `Route` 不直接存一串坐标，而是通过 `route_location` 串联已有地点。
- 上传文件本身不是公开内容；只有被已发布内容引用，才应该能通过受控公开接口读取。

## 前台功能

### `/`

首页当前是 Gallery 首页，不是普通营销首页。

它的目标体验是：

- 进入页面先看到沉浸式画廊。
- 地图在下方作为空间基底。
- 图片像星点或悬浮卡片一样分布在地图上方。
- 有经纬度的图片会投影到中国地图范围。
- 没有经纬度的图片会走 fallback 排列。
- 点击图片卡片可以打开预览。

主要代码：

- `apps/web/src/app/routes/gallery/GalleryHome.tsx`
- `apps/web/src/components/gallery/GalleryExperience.tsx`
- `apps/web/src/features/gallery/useCurvedMapProjection.ts`
- `apps/web/src/components/gallery/LoadingScreen.tsx`

### `/projects`

项目列表页，展示公开项目卡片。

数据来源：

```text
GET /api/public/projects
```

主要代码：

- `apps/web/src/app/routes/public/projects/ProjectsPage.tsx`
- `apps/web/src/features/projects/api/usePublicProjects.ts`
- `apps/web/src/components/project/ProjectCard.tsx`

当前注意点：

- 公开项目封面字段仍叫 `coverImage`。
- 后端当前返回的是 `cover_upload_file_id`，不是完整图片 URL。
- 这会导致真实上传封面接入后可能出现 broken image。

### `/projects/:projectId`

项目详情页，展示单个已发布项目的详情、地点、媒体组和路线。

数据来源：

```text
GET /api/public/projects/:idOrSlug
```

主要代码：

- `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx`
- `apps/web/src/features/projects/api/usePublicProjectDetail.ts`
- `apps/web/src/components/project/MediaSetCard.tsx`
- `apps/web/src/components/project/LocationDetailPanel.tsx`

### `/map`

地图关系页，用于把项目、地点、路线和媒体组关系可视化。

数据来源：

```text
GET /api/public/map-relationship
```

主要代码：

- `apps/web/src/app/routes/public/map/MapPage.tsx`
- `apps/web/src/features/map/api/useMapRelationshipData.ts`
- `apps/web/src/features/map/model/mapViewModel.ts`
- `apps/web/src/components/map/MapBase3DView.tsx`
- `apps/web/src/components/map/MapProjectionOverlay.tsx`
- `apps/web/src/components/map/StarRelationshipLayer.tsx`
- `apps/web/src/components/map/MediaClusterLayer.tsx`
- `apps/web/src/components/map/MapRelationshipPanel.tsx`

当前能力：

- 能从公开 API 获取项目、地点、媒体、路线关系。
- 能把关系整理成前端 map view model。
- 能用 MapLibre / Three.js 相关组件展示空间关系。

### `/spin/:mediaSetId`

360 序列查看页。

数据来源：

```text
GET /api/public/media-sets/:mediaSetId
```

主要代码：

- `apps/web/src/app/routes/public/spin-view/SpinViewPage.tsx`
- `apps/web/src/components/media/SpinViewer.tsx`
- `apps/web/src/features/media/api/usePublicMediaSet.ts`

当前能力：

- 按 `sortOrder` 排列图片。
- 用户可以切换前后帧。
- 没有图片时显示空状态。

### `/gallery/:mediaSetId`

普通图库查看页。

数据来源：

```text
GET /api/public/media-sets/:mediaSetId
```

主要代码：

- `apps/web/src/app/routes/public/gallery-view/GalleryViewPage.tsx`
- `apps/web/src/components/media/GalleryViewer.tsx`
- `apps/web/src/features/media/api/usePublicMediaSet.ts`

当前能力：

- 按顺序展示媒体组图片。
- 支持选择当前图片。
- 没有图片时显示空状态。

## 后台功能

后台入口以 `/admin` 开头。浏览器页面由 `RequireAuth` 保护，API 层也已经由 `createRequireAdminSession` 做服务端保护。

### `/admin/login`

管理员登录页。

数据流：

```text
POST /api/admin/login
```

登录成功后，后端写入 httpOnly cookie：

```text
trace_scope_session
```

主要代码：

- `apps/web/src/app/routes/admin/login/AdminLoginPage.tsx`
- `apps/web/src/services/auth/authContext.tsx`
- `apps/api/src/modules/auth/routes.ts`
- `apps/api/src/modules/auth/service.ts`

### `/admin`

后台仪表盘入口。

主要代码：

- `apps/web/src/app/routes/admin/dashboard/AdminDashboardPage.tsx`

当前更偏结构入口，用于进入项目、地点、媒体、路线等管理页。

### `/admin/projects`

项目管理页。

对应 API：

```text
GET    /api/projects
GET    /api/projects/:id
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id
```

主要代码：

- `apps/web/src/app/routes/admin/projects/AdminProjectsPage.tsx`
- `apps/web/src/services/api/adminApi.ts`
- `apps/api/src/modules/projects/routes.ts`
- `apps/api/src/modules/projects/service.ts`
- `apps/api/src/modules/projects/repository.ts`

### `/admin/locations`

地点管理页。

对应 API：

```text
GET    /api/locations
GET    /api/locations/:id
POST   /api/locations
PUT    /api/locations/:id
DELETE /api/locations/:id
```

主要代码：

- `apps/web/src/app/routes/admin/locations/AdminLocationsPage.tsx`
- `apps/api/src/modules/locations/routes.ts`
- `apps/api/src/modules/locations/service.ts`
- `apps/api/src/modules/locations/repository.ts`

### `/admin/media`

媒体管理页，包含媒体组、媒体图片和上传入口。

对应 API：

```text
GET    /api/media-sets
GET    /api/media-sets/:id
POST   /api/media-sets
PUT    /api/media-sets/:id
DELETE /api/media-sets/:id

GET    /api/media-images
GET    /api/media-images/:id
POST   /api/media-images
PUT    /api/media-images/:id
DELETE /api/media-images/:id

GET    /api/uploads
GET    /api/uploads/:id
POST   /api/uploads
DELETE /api/uploads/:id
```

主要代码：

- `apps/web/src/app/routes/admin/media/AdminMediaPage.tsx`
- `apps/api/src/modules/media-sets/*`
- `apps/api/src/modules/media-images/*`
- `apps/api/src/modules/uploads/*`
- `apps/api/src/infrastructure/storage/localFileStorage.ts`

### `/admin/routes`

路线管理页。

对应 API：

```text
GET    /api/routes
GET    /api/routes/:id
POST   /api/routes
PUT    /api/routes/:id
DELETE /api/routes/:id
```

主要代码：

- `apps/web/src/app/routes/admin/routes/AdminRoutesPage.tsx`
- `apps/api/src/modules/routes/routes.ts`
- `apps/api/src/modules/routes/service.ts`
- `apps/api/src/modules/routes/repository.ts`

当前注意点：

- `replaceRouteLocations` 仍是先删旧关联再插入新关联。
- 这一步后续应加事务，避免中途失败导致路线地点被清空或半写入。

## 后端 API 分类

### 公开 API

公开 API 不需要管理员登录，只返回已发布内容或公开健康状态。

| Endpoint | 用途 |
| --- | --- |
| `GET /health` | 基础健康检查 |
| `GET /health/live` | 运行状态检查 |
| `GET /health/ready` | 数据库和存储就绪检查 |
| `GET /api/public/projects` | 已发布项目列表 |
| `GET /api/public/projects/:idOrSlug` | 已发布项目详情 |
| `GET /api/public/media-sets/:mediaSetId` | 已发布媒体组和图片 |
| `GET /api/public/map-relationship` | 地图关系数据 |
| `GET /api/public/uploads/:fileId` | 受控公开文件读取 |

### 后台 API

后台 API 需要 `trace_scope_session` cookie。没有有效 session 时返回：

```json
{ "error": "Admin session required" }
```

当前被保护的后台 API 包括：

- `/api/projects`
- `/api/locations`
- `/api/media-sets`
- `/api/media-images`
- `/api/routes`
- `/api/uploads`

服务端保护代码：

- `apps/api/src/modules/auth/requireAdminSession.ts`
- `apps/api/src/app/buildServer.ts`

### 认证 API

| Endpoint | 用途 |
| --- | --- |
| `POST /api/admin/login` | 登录并写入 session cookie |
| `GET /api/admin/session` | 查询当前登录状态 |
| `POST /api/admin/logout` | 退出并清除 session cookie |

`GET /api/admin/session` 不应被后台 API 鉴权拦住，因为前端需要用它判断当前是否已登录。

## 文件上传和公开访问

后台上传文件时，后端会：

1. 接收 multipart 文件。
2. 写入本地存储目录。
3. 在 `upload_file` 表记录文件元数据。
4. 返回 file id、storage key、mime type、大小、hash、url 等信息。

当前已经有受控公开读取接口：

```text
GET /api/public/uploads/:fileId
```

它会调用：

```text
PublicService.isFileReachableFromPublishedContent(fileId)
```

只有以下文件应该被公开读取：

- 已发布项目的封面文件。
- 已发布项目下媒体组的封面文件。
- 已发布项目下媒体组里的媒体图片文件。

当前实现状态：

```text
/uploads/*
```

后端已经移除 `fastifyStatic` 对该路径的直接挂载。访问存储目录里的文件不能再绕过 `PublicService.isFileReachableFromPublishedContent`。

## 安全状态

### 已完成

- 管理员登录会写入 httpOnly cookie。
- session token 存储使用 hash。
- 后台 CRUD 和上传 API 已经添加服务端 admin session 鉴权。
- 未登录请求后台 API 会返回 `401`。
- 前端后台 API client 使用 `credentials: include`，会携带 cookie。
- `/uploads/*` 静态公开路径已经关闭，公开文件读取统一走 `/api/public/uploads/:fileId`。
- Fastify 已接入 helmet。
- `buildServer` 支持 CORS、rate limit、body limit、trust proxy、log level 等参数。

### 仍需处理

- `main.ts` 目前没有把所有生产配置完整传入 `buildServer`。
- `STORAGE_DIR` 和 `UPLOAD_ROOT` 两套上传目录语义仍需统一。
- 公开项目封面字段仍返回 file id，不是可渲染 URL。
- route location 替换还没有事务保护。

## 部署和运维能力

当前已经存在单节点部署材料：

- PM2 配置：`ecosystem.config.cjs`
- Caddy 配置：`deploy/caddy/Caddyfile`
- 部署文档：`docs/operations/single-node-deployment.md`
- 备份恢复文档：`docs/operations/backup-and-recovery.md`
- 运维脚本目录：`scripts/ops/`

运维脚本包括：

- `backup-mysql.ps1`
- `restore-mysql.ps1`
- `backup-uploads.ps1`
- `restore-uploads.ps1`
- `build-release.ps1`
- `check-api-health.ps1`

这些材料说明项目已经具备部署方向，但正式部署前仍要先关闭生产配置传递、上传目录语义和内容发布链路问题。

## 当前测试状态

最近一次验证过的命令：

```powershell
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\api" test
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\api" run build
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\web" test
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\web" run build
```

在 `/uploads/*` 公开访问收敛分支上，验证结果是：

- API tests：6 个测试文件通过，37 个测试通过。
- API build：通过。
- Web tests：35 个测试文件通过，110 个测试通过。
- Web build：通过。

如果基于当前 `main` 继续开发，仍应重新运行这些命令，不要只依赖历史记录。

## 当前不应误解的点

1. 不要以为前端 `RequireAuth` 就足够保护后台。真正的保护必须在服务端，当前主干已经补了后台 API 服务端鉴权。
2. 不要把 `coverImage` 当作已经稳定的图片 URL 语义。公开项目和媒体组封面仍可能是 file id。
3. 不要把 `/uploads/*` 当作公开图片方案。当前直接静态挂载已经关闭，最终公开读取应走 `/api/public/uploads/:fileId`。
4. 不要把 `spin360` 和 `gallery` 合并成一个查看器。当前设计明确保留两类媒体体验。
5. 不要新增新的顶层实体来解决当前问题。当前核心模型应保持 `Project -> Location / MediaSet / Route -> MediaImage`。
6. 不要只因为测试通过就认为项目可以上线。上线前还必须处理生产配置、上传目录语义和内容发布链路。

## 推荐下一步

按风险优先顺序继续：

1. 修正 `main.ts` 到 `buildServer` 的生产配置传递。
2. 统一 `STORAGE_DIR` 与 `UPLOAD_ROOT`，同步 API、env 示例、备份脚本和运维文档。
3. 修正公开项目和媒体组封面 URL 语义。
4. 给路线地点替换加事务。
5. 再继续打磨后台发布流程和前台空间叙事体验。

## 给低上下文模型的工作入口

如果后续模型要继续开发，推荐先读这些文件：

1. `docs/2026-05-26-current-feature-introduction-report.md`
2. `README.md`
3. `apps/api/src/app/buildServer.ts`
4. `apps/api/src/modules/auth/requireAdminSession.ts`
5. `apps/api/src/modules/public/service.ts`
6. `apps/web/src/app/router.tsx`
7. `apps/web/src/services/api/adminApi.ts`
8. `docs/plans/2026-05-24-next-stage-design-roadmap.md`

继续实现时，建议从“生产配置完整传递”开始，而不是继续扩展视觉功能。
