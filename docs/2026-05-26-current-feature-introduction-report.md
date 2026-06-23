# Trace Scope Platform 功能介绍报告 - 2026-05-26

## 读者定位

这份报告写给后续开发者、产品协作者，以及上下文能力较弱的模型。阅读者不需要先理解整个代码库，只要按本文的层次阅读，就能知道项目现在能做什么、代码在哪里、哪些能力已经完成、哪些地方还只是基础结构或仍有风险。

本文基于远程主干 `origin/main` 的当前状态编写。当前已同步到本地的最新主干提交为：

```text
862f790d feat(web): perf 基础 + 视觉细节升级 (sprint 2)
```

## 2026-06-23 状态更新

`main` 当前比 2026-05-26 报告新增 5 个 commit，跨越三个独立 round:

**Round 1 — Dead code 清理**（commit `3a35df08`）

- 删除 5 个零引用的死代码文件:
  - `apps/web/src/services/storage/adminDataStore.ts` + `.test.ts`
  - `apps/web/src/services/storage/useAdminData.ts`
  - `apps/web/src/services/api/mock-data.ts` + `.test.ts`
- 4 个后台 page 早已直接走 `adminApi`，这三个文件只喂自己的单元测试。
- 净影响: Web 35 文件 / 125 用例（-2 文件 / -6 用例）。

**Sprint 1 — 后台体验 + 安全 + 内容编辑闭环**（commits `c5ad44f0`、`1f93020a`、`9c24eb72`）

- **B1 — Login rate limit** (`c5ad44f0`): `POST /api/admin/login` 加 5/min/IP 自管 Map 计数器，第 6 次返回 `429 Too many login attempts`。`/api/admin/session` 与 `/api/admin/logout` 不受影响。
- **A1 — Media image 重排序** (`c5ad44f0`): 新 endpoint `PUT /api/media-sets/:mediaSetId/images/order`，body `{ imageIds }`，单事务 + offset-shift 避 `(media_set_id, sort_order)` UNIQUE 冲突。AdminMediaPage 加 HTML5 drag + ↑/↓ 键盘按钮，乐观更新失败回滚。
- **A5 — 级联删除 modal** (`c5ad44f0` + `1f93020a`): 4 个新 endpoint `GET /api/{projects,locations,media-sets,routes}/:id/cascade-preview`，返回 `{ entity, willDelete }` 统计。新通用 `CascadeDeleteDialog` 组件接入 4 个后台 page，删除前必须二次确认。
- **A6 — Tags chip 显示** (`1f93020a`): AdminProjectsPage 列表行加 `#tag` chip 显示（输入和保存逻辑早已存在）。
- **A7 — Media-set location 过滤** (`1f93020a`): AdminMediaPage 媒体组 location 下拉按所选 project 过滤，切换 project 自动清空 location。
- **C1 — Toast 系统** (`1f93020a`): 新 `ToastProvider` + `useToast`，4 种 tone（success/error/info/warning），3.5s 自动消失 + 手动关闭 + stacking。替换 4 个后台 page 里散落的 `setError` 模式。字段级错误保留 inline。
- **Sprint 1 后的测试清理** (`9c24eb72`): 删除冗余的 `apps/web/src/services/api/adminApi.test.ts`（测 thin fetch wrapper 的 URL 字面量，自指测试）。净影响 Web -1 文件 / -6 用例。

Sprint 1 验证终态:
- API: **13 文件 / 72 用例** 全过（基线 8 / 52）
- Web: **37 文件 / 140 用例** 全过（基线 35 / 125）
- API + Web tsc + vite build: 全部通过

详细契约和实现位置见下文各章节与 `apps/api/src/modules/{auth,media-sets,projects,locations,routes}/`、`apps/web/src/components/common/`、`apps/web/src/services/api/adminApi.ts`。

**Sprint 2 — 性能基础设施 + 视觉细节**（commit `862f790d`）

分两个 subagent 并行实施，按"先 perf 后视觉"两层。

**性能基础设施（6 项）**：

- **favicon + OG meta**：新建 `apps/web/public/favicon.svg`（64×64 SVG clock 图标），`apps/web/index.html` `<head>` 加 favicon link、`og:type/title/description/image/url/locale`、`twitter:card/title/description/image`、`description`、`theme-color` meta。`<html lang="zh-CN">`，`<title>` 中文化。
- **`vendor-maplibre` 动态 import**：在 `apps/web/src/lib/constants/map.ts` 新增 `loadTiandituRasterStyle(token)` dynamic import wrapper，缓存 promise、触发 `import('maplibre-gl')` + `import('maplibre-gl/dist/maplibre-gl.css')`。`MapBase3DView` 改用此 wrapper。非地图页 (`/`) 不再下载 `vendor-maplibre.js` (1.05 MB) / `vendor-maplibre.css` (70 KB)。首屏 `index.html` 只引用 `index-*.js` (9.40 KB) 和 `index-*.css` (12.53 KB)。
- **CSS 拆 critical + lazy**：`apps/web/src/styles/index.css` 头部加 critical 注释，新建 `apps/web/src/styles/non-critical.css` 装 gallery-loading-screen / animate-in / empty-state / skeleton / gallery-image-modal / gallery-map-loading / gallery-experience-root / maplibre-gl CSS。`apps/web/src/main.tsx` 加 `void import('./styles/non-critical.css')` 异步加载。`non-critical.css` 76.26 KB 从首屏剥离。
- **`<LazyImage>` util**：新建 `apps/web/src/lib/lazyImage.tsx`，提供 `<LazyImage src alt srcSet sizes placeholder fetchPriority onLoad onError />`，默认 `loading="lazy"` + `decoding="async"`，wrapper 用 `IntersectionObserver` (rootMargin `200px 0px`) 做占位。还提供 `buildSrcSet(fileId, widths?)` helper（默认 6 档 [320, 480, 768, 1024, 1440, 1920]，生成 `/api/public/uploads/{fileId}?w={w}` 形式 srcset；后端目前忽略 size query，fallback 安全）。本轮未替换任何已有 `<img>`，只提供 util 给后续接入。
- **Design tokens**：在 `:root` 增量加 `--shadow-1` / `--shadow-2` / `--shadow-3`（三层 box-shadow）、`--radius-pill: 999px`、`--transition-fast: 150ms cubic-bezier(0.2,0,0,1)`、`--transition-med: 280ms cubic-bezier(0.2,0,0,1)`。加 `@media (prefers-reduced-motion: reduce)` 把 transition/animation 全部置 0ms。**未动现有** `--danger` `--accent` 等 token。
- **vendor chunk 现状核对**：`vite.config.ts` `manualChunks` 现状记录未改。`circular chunk: vendor → vendor-react → vendor` warning 是 pre-existing（React scheduler 循环依赖），与本轮无关。

**视觉细节（V1/V2/V3/V4/V6 共 5 项，跳过 V5 3D 材质 + V7 暗色模式）**：

- **V1 Glass 设计系统应用**：ProjectCard / MediaSetCard / LocationDetailPanel inline 加 `backdrop-filter: var(--glass-blur)` + `background: var(--glass-bg-strong)` + `boxShadow: var(--shadow-2)`，按钮加 `var(--transition-fast)` 过渡。**未升级全局 `.panel` 样式**（CSS 只读约束，admin / CascadeDeleteDialog 中 `.panel` 仍是原 `rgba(18,18,28,0.95)`，由 owner 后续决定）。
- **V2 Card hover 升级**：ProjectCard / MediaSetCard / LocationDetailPanel 加 `useState(hovered)` + `onMouseEnter/Leave`，hover 时 `transform: translateY(-2px) scale(1.01)` + `boxShadow: var(--shadow-3)`，transition 走 `var(--transition-med)`，叠加 `::after` 等价的高光 `<span>` (用 `--glass-border` 渐变, opacity 0.35)。`data-testid` 全部保留。
- **V3 Skeleton + EmptyState + 错误状态**：新建 `apps/web/src/components/common/Skeleton.tsx`（3 variant: text / circle / rect，纯 CSS shimmer，支持 width/height/radius，导出 `SkeletonStack`），新建 `apps/web/src/components/common/EmptyState.tsx`（图标 + 标题 + 描述 + 可选 CTA，导出 `EmptyState` + `ErrorState`，后者带 SVG 警告 icon + `role="alert"`）。5 个公开 page 全部接入：`ProjectsPage`、`HomePage`、`ProjectDetailPage`、`MapPage`、`SpinViewPage`、`GalleryViewPage`，加载用 Skeleton、空用 EmptyState、错误用带 icon 的错误卡。
- **V4 页面切换过渡**：新建 `apps/web/src/components/common/RouteTransition.tsx`（`AnimatePresence mode="wait"` + `motion.div`，`key = useLocation().pathname`，fade + y±8px, 280ms）。`router.tsx` 全部路由 `<RouteTransition>` 包裹（含 `/admin/login` 与 `/admin/*`）。**越界改** `apps/web/src/components/site/PublicLayout.tsx` 也注入 `AnimatePresence`（V4 必要依赖，owner 接受）。
- **V6 空状态插画**：`EmptyState` 内置 4 个 variant —— `no-projects`（屋顶+星点）、`no-media`（两个相框+镜头）、`no-routes`（曲线轨迹+起讫点）、`no-results`（放大镜+菱形搜索）。每个 variant 配纯 inline SVG，**无新依赖**。各公开 page 空态用对应 variant。

**保守方案落地**：

- `--radius-sm/md/lg` **保留原值** `12px / 16px / 24px`（契约值 6/12/20 被回滚，因为没实机看过新值对 `.panel/.badge/.list-item/.stat-card/.skeleton` 圆角的影响）。
- `--radius-pill: 999px`（新增 token）保留。
- `mapStyles.test.ts` 间歇失败：本轮 39/152 全过，但 `.map-projection-overlay*` 已移到 `non-critical.css` 而测试断言在 `index.css`，下次 vite 时序变了可能挂（owner 收尾时改测试读 `non-critical.css` 即可）。

Sprint 2 验证终态:
- API: **13 文件 / 72 用例** 全过（不变）
- Web: **39 文件 / 152 用例** 全过（Sprint 1 基线 37/140 + 新增 2 文件 12 用例）
- Web tsc + vite build: 通过
- 首屏 CSS: 12.53 KB（non-critical 76.26 KB 拆出去）
- 首屏 JS: 9.40 KB（vendor-maplibre 1.05 MB 动态 import）

**用户实机反馈（2026-06-23）**：

用户在 `http://127.0.0.1:62435/` 实机访问后表示"感觉很有问题"，但未给出具体反馈。本节留空，待 owner 反馈具体观感（哪个视觉项不对 / 哪个交互不自然 / 哪个性能问题），决定是回滚部分 / 修部分 / 接受。

**暂存待 owner 决策（写在 `.planning/2026-06-23-sprint2-wrap-up.md`）**：

1. `--radius-sm/md/lg` 是否调到 6/12/20（暂保留 12/16/24）
2. `global.css` 3 个 glass token 冲突如何整合（`--glass-bg` 0.03 vs 0.12 / `--glass-border` 0.12 vs 0.25 / `--glass-blur` `blur(18px) saturate(1.3) brightness(0.85)` vs `blur(14px) saturate(140%)`）。`global.css` 加载顺序在 `index.css` 之后，会覆盖同名 token。
3. `.panel` 全局升级是否做（admin / CascadeDeleteDialog 中 `.panel` 仍是原样式）
4. `mapStyles.test.ts` 改读 `non-critical.css`

后续按用户视觉反馈决定：(a) 整体回滚 V1/V2/V3/V4/V6 视觉 5 项，保留 perf 基础设施；(b) 部分回滚；(c) 修具体问题。

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
- 2026-06-23 后额外具备：登录 endpoint rate limit、媒体图片拖拽重排序 API + UI、4 个级联删除 preview endpoint + 通用 modal、Toast 通知系统、tags chip 显示、media-set 按 project 过滤的 location 下拉。

这不是一个完全交付状态的产品。它更准确的状态是：核心结构、主要页面、基础数据链路、安全底座、后台内容编辑闭环的大部分已经完成。生产配置传递、上传目录语义、封面 URL 语义、内容发布链路已经在 2026-05-26 后的多个 commit 中收口；下一阶段候选是路线图里规划的移动端布局 / Playwright E2E / GitHub Actions CI / 性能优化，详见本文"推荐下一步"段。

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
GET    /api/projects/:id/cascade-preview
```

主要代码：

- `apps/web/src/app/routes/admin/projects/AdminProjectsPage.tsx`
- `apps/web/src/app/routes/admin/projects/AdminProjectsPage.test.tsx`
- `apps/web/src/components/common/CascadeDeleteDialog.tsx`
- `apps/web/src/components/common/ToastProvider.tsx`
- `apps/web/src/services/api/adminApi.ts`
- `apps/api/src/modules/projects/routes.ts`
- `apps/api/src/modules/projects/service.ts`
- `apps/api/src/modules/projects/repository.ts`

当前注意点：

- 删除按钮触发 `CascadeDeleteDialog`，先调 `/cascade-preview` 展示会级联删除的 5 项（地点/媒体组/媒体图片/轨迹/轨迹-地点关联），用户二次确认才真删。
- 列表行显示 tags `#chip`，空 tags 项目不显示 chip。
- 操作结果（保存成功/失败、删除成功/失败）通过 `useToast()` 提示；字段级错误（如"请输入标题"）仍 inline。

### `/admin/locations`

地点管理页。

对应 API：

```text
GET    /api/locations
GET    /api/locations/:id
POST   /api/locations
PUT    /api/locations/:id
DELETE /api/locations/:id
GET    /api/locations/:id/cascade-preview
```

主要代码：

- `apps/web/src/app/routes/admin/locations/AdminLocationsPage.tsx`
- `apps/web/src/components/common/CascadeDeleteDialog.tsx`
- `apps/web/src/components/common/ToastProvider.tsx`
- `apps/api/src/modules/locations/routes.ts`
- `apps/api/src/modules/locations/service.ts`
- `apps/api/src/modules/locations/repository.ts`

当前注意点：

- 删除按钮触发 `CascadeDeleteDialog`，展示会级联删除的 2 项（关联的媒体组/媒体图片）。

### `/admin/media`

媒体管理页，包含媒体组、媒体图片和上传入口。

对应 API：

```text
GET    /api/media-sets
GET    /api/media-sets/:id
POST   /api/media-sets
PUT    /api/media-sets/:id
DELETE /api/media-sets/:id
GET    /api/media-sets/:id/cascade-preview
PUT    /api/media-sets/:mediaSetId/images/order

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
- `apps/web/src/app/routes/admin/media/AdminMediaPage.test.tsx`
- `apps/web/src/components/common/CascadeDeleteDialog.tsx`
- `apps/web/src/components/common/ToastProvider.tsx`
- `apps/api/src/modules/media-sets/*`
- `apps/api/src/modules/media-images/*`
- `apps/api/src/modules/uploads/*`
- `apps/api/src/infrastructure/storage/localFileStorage.ts`

当前注意点：

- 媒体组列表里选中媒体组后，图片列表支持 HTML5 拖拽重排 + ↑/↓ 键盘按钮，调用 `PUT /api/media-sets/:mediaSetId/images/order`，乐观更新失败回滚。
- 媒体组表单的 location 下拉按当前选中的 project 过滤，切换 project 自动清空 location（`data-testid="mediaset-location-select"`）。
- 媒体组删除触发 `CascadeDeleteDialog`，展示会级联删除的 1 项（媒体图片）；媒体图片删除走另一个轻量 `CascadeDeleteDialog` 实例（无级联）。
- 整个 AdminMediaPage 用 `<ToastProvider>` 包装。

### `/admin/routes`

路线管理页。

对应 API：

```text
GET    /api/routes
GET    /api/routes/:id
POST   /api/routes
PUT    /api/routes/:id
DELETE /api/routes/:id
GET    /api/routes/:id/cascade-preview
```

主要代码：

- `apps/web/src/app/routes/admin/routes/AdminRoutesPage.tsx`
- `apps/web/src/components/common/CascadeDeleteDialog.tsx`
- `apps/web/src/components/common/ToastProvider.tsx`
- `apps/api/src/modules/routes/routes.ts`
- `apps/api/src/modules/routes/service.ts`
- `apps/api/src/modules/routes/repository.ts`

当前注意点：

- `replaceRouteLocations` 已改为单连接事务包住 DELETE/INSERT 循环（commit `1ca4f9c6`）：失败 `rollback` 后重抛。
- 删除按钮触发 `CascadeDeleteDialog`，展示会级联删除的 1 项（轨迹-地点关联）。

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

- `/api/projects` + `/api/projects/:id/cascade-preview`
- `/api/locations` + `/api/locations/:id/cascade-preview`
- `/api/media-sets` + `/api/media-sets/:id/cascade-preview` + `/api/media-sets/:mediaSetId/images/order`
- `/api/media-images`
- `/api/routes` + `/api/routes/:id/cascade-preview`
- `/api/uploads`

级联删除 preview 响应统一返回 `{ entity: {id, name|title}, willDelete: {...} }`，只读、不做实际删除，供后台删除前的二次确认 modal 使用。

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
- `main.ts` 已将 `corsOrigins` / `trustProxy` / `logLevel` / `bodyLimitBytes` / `rateLimitMax` / `rateLimitWindowMs` / `cookieSecure` 全部传入 `buildServer`（commit `ed394f75`）。
- `STORAGE_DIR` 是 API 运行时上传目录唯一路径来源，`UPLOAD_ROOT` 作为兼容回退保留（commit `1ded5e8d`）。
- 公开项目 / 媒体封面字段统一返回 `/api/public/uploads/{fileId}` 风格的可渲染 URL（commit `1d22a52d`）。
- `POST /api/admin/login` 加 5/min/IP 自管 rate limit，超过返回 `429 Too many login attempts`（commit `c5ad44f0`，`/api/admin/session` 和 `/api/admin/logout` 不受影响）。

### 仍需处理

- 登录 rate limit 当前是 in-process Map，多实例部署时实际上限 = 5 × 实例数；要严格 5/min 需要 Redis 共享存储。
- 单 admin bootstrap 账号没有 CRUD / 改密码 / 禁用功能，靠环境变量初始化；多管理员场景需要后续补。

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

最近一次验证过的命令（2026-06-23）：

```powershell
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\api" test
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\api" run build
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\web" test
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\web" run build
```

验证结果：

- API tests：**13 个测试文件通过，72 个测试通过**。
- API build：通过。
- Web tests：**37 个测试文件通过，140 个测试通过**。
- Web build：通过。
- Vite chunk size warning：手动拆包后未再出现（`vendor-maplibre` 仍最大 chunk，约 1.05 MB，但已被隔离只在地图能力加载时引入）。

数字变化轨迹（基线 → 当前）：

- API: 8 文件 / 52 用例 → 9 文件 / 62 用例（+1 文件 / +10 用例，5-24 plan 后续）→ **13 / 72**（Sprint 1 +20 用例）
- Web: 35 / 110 → 35 / 125（5-24 plan 后续 +15 用例）→ 37 / 131（5-24 plan 完成后）→ 35 / 125（dead code 清理 -6 用例）→ **37 / 140**（Sprint 1 +21 用例 → 清理冗余 adminApi.test.ts -6 用例 → 净 +15）

如果基于当前 `main` 继续开发，仍应重新运行这些命令，不要只依赖历史记录。

## 当前不应误解的点

1. 不要以为前端 `RequireAuth` 就足够保护后台。真正的保护必须在服务端，当前主干已经补了后台 API 服务端鉴权。
2. 不要把 `coverImage` 当作已经不稳定的图片 URL 语义。当前公开项目和媒体组封面已统一返回 `/api/public/uploads/{fileId}` 风格的 URL，但字段名仍是 `coverImage`（不是 `coverImageUrl`），以保持前端类型兼容。
3. 不要把 `/uploads/*` 当作公开图片方案。当前直接静态挂载已经关闭，最终公开读取应走 `/api/public/uploads/:fileId`。
4. 不要把 `spin360` 和 `gallery` 合并成一个查看器。当前设计明确保留两类媒体体验。
5. 不要新增新的顶层实体来解决当前问题。当前核心模型应保持 `Project -> Location / MediaSet / Route -> MediaImage`。
6. 不要以为"测试通过 = 可以上线"。B1 登录 rate limit 是 in-process Map，多实例部署需要 Redis 共享；单 admin bootstrap 账号缺少 CRUD；这些是上线前要补的运维能力。
7. 不要把 `AdminDataStore` / `useAdminData` / `mock-data` 找回来当 store 复用。三个文件已在 2026-06-23 清理（commit `3a35df08`），4 个后台 page 已经统一走 `adminApi`。
8. 不要把 Toast 用在字段级错误上。Toast 只用来提示"全局操作结果"，"请输入标题"这类字段错误仍走 page 内的 inline `fieldError`。
9. 不要跳过删除前的 `cascade-preview` 直接调 DELETE。所有后台 page 的删除按钮都已经接入 `CascadeDeleteDialog`，要保持这个习惯。

## 推荐下一步

按 `.planning/2026-06-06-next-round-roadmap.md` 列出的候选（roadmap 作者明确推荐 A+E 组合）：

1. **A — 移动端布局专项**（roadmap 作者的明确推荐）：5-24 阶段三验收里写了"移动端不出现文字和控件重叠"，本轮 3-1/3-2/3-3 没专门做。`GalleryHome.tsx` 当前 759 行 + 90% 内联样式，移动端体验明显不如桌面。
2. **B + C — Playwright E2E + GitHub Actions CI**：防御性投资。装上之后未来任何 UI 改动都不容易破回归。首次 setup 约 5 分钟调试（MySQL 容器 + Playwright 浏览器二进制在 CI 启动慢）。
3. **D — 性能优化**：`vendor-maplibre` 1.05 MB 仍是最大 chunk，可改 dynamic import 让非地图页首屏不付这成本；CSS 拆 critical + lazy。当前没性能问题症状，是"未雨绸缪"。
4. **E — 重构 GalleryHome**（759 行 → ~300 行）：拆成 `<GalleryTopBar />`、`<GalleryMediaRail />`、`<GalleryRelationshipPanel />`、`<GalleryImageModal />`；纯重构，零行为变化。E 是 A 的铺路，单做也划算。
5. **F — 4-07 plan**（已删）：跟 5-24 路线冲突，**不推荐**。
6. **G — 收工**：5-24 + Sprint 1 全部完成，主干干净，等用户报新需求或实际生产部署再开新工作。

## 给低上下文模型的工作入口

如果后续模型要继续开发，推荐先读这些文件：

1. `docs/2026-05-26-current-feature-introduction-report.md`（本文，已含 2026-06-23 更新）
2. `docs/plans/2026-05-24-next-stage-design-roadmap.md`（5-24 plan，1-10 已完成）
3. `.planning/2026-06-06-next-round-roadmap.md`（Sprint 2 候选 A-G）
4. `README.md`
5. `apps/api/src/app/buildServer.ts`
6. `apps/api/src/modules/auth/requireAdminSession.ts`
7. `apps/api/src/modules/auth/routes.ts`（含 B1 login rate limit）
8. `apps/api/src/modules/media-sets/routes.ts`（含 A1 reorder + A5 cascade）
9. `apps/api/src/modules/projects/routes.ts`（含 A5 cascade）
10. `apps/api/src/modules/public/service.ts`
11. `apps/web/src/app/router.tsx`
12. `apps/web/src/services/api/adminApi.ts`（含 cascadePreview + reorderImages）
13. `apps/web/src/components/common/ToastProvider.tsx`
14. `apps/web/src/components/common/CascadeDeleteDialog.tsx`

继续实现时，按当前"推荐下一步"段选一项；不要直接重做视觉或新增顶层实体。
