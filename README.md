# Trace Scope Platform

Trace Scope Platform 是一个空间叙事平台：用 **Project** 作为顶层内容单元，把地点（`Location`）、路线（`Route`）、地图关系、360 图片序列（`spin360`）和图集（`gallery`）组织到同一个前台体验和后台管理系统里。

- 前端：`apps/web` —— React 19 + Vite + TypeScript，含 3D 画廊（Three.js）、MapLibre 天地图、关系地图和后台管理。
- 后端：`apps/api` —— Fastify + TypeScript + MySQL，模块化单体（auth / projects / locations / media-sets / media-images / routes / uploads / public / system）。
- 部署：单节点 PM2 + Caddy 反向代理，PowerShell 备份/恢复/健康检查脚本齐全。

本 README 给后续开发者或低上下文模型快速接手，更细的设计规格、实施计划和 review 文档见 `docs/`。

---

## 当前阶段

四个 Phase 全部完成，并已完成 Sprint 1（后台体验闭环）、Sprint 2（性能基础设施 + 视觉细节）、移动端布局（A）和 GalleryHome 重构（E）。

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| Phase 1 | 鉴权基础设施 | ✅ 完成 |
| Phase 2 | Admin CRUD + 上传 | ✅ 完成 |
| Phase 3 | Public API + 前端迁移 | ✅ 完成 |
| Phase 4 | 单节点硬化 + 运维 | ✅ 完成 |
| Sprint 1 | 后台体验 + 安全 + 内容编辑闭环（login rate limit、媒体拖拽重排、级联删除 preview、Toast） | ✅ 完成 |
| Sprint 2 | 性能基础设施 + 视觉细节（favicon/OG、`vendor-maplibre` 动态 import、CSS critical/lazy、Glass tokens、Card hover、Skeleton/EmptyState、页面过渡） | ✅ 完成 |
| 移动端布局 | 关系面板窄屏切底部抽屉、网格响应式 | ✅ 完成 |
| GalleryHome 重构 | 759 行 → 364 行（−52%），抽出 ImageModal / MediaRail / TopBar / RelationshipPanel / locationImages | ✅ 完成 |
| E2E harness | Playwright 配置 + 4 smoke cases（home mount / projects page / public API / /health）+ fixture seeder + vitest 排除（roadmap B 基础；CI 集成待做） | ✅ 完成 |
| Bug 修复 | 真 bug 5 个 + 症状缓解 5 个（含 route 事务化、map-relationship mediaSetIds、admin auth 同步、滚动锁、maplibre 样式特异性等） | ✅ 完成 |

## 当前能力

### 前台

| 路由 | 说明 |
| --- | --- |
| `/` | Gallery 首页：沉浸式 3D 画廊 + 地图基底，图片按经纬度投影到中国地图范围，无经纬度走 fallback 排列 |
| `/projects` | 已发布项目卡片列表（玻璃质感 + hover 抬升 + EmptyState） |
| `/projects/:idOrSlug` | 项目详情：地点、媒体组、路线（移动端单列响应式） |
| `/map` | 地图关系页：项目/地点/路线/媒体组关系可视化（MapLibre + Three.js） |
| `/spin/:mediaSetId` | 360 序列查看器（**不与 gallery 合并**） |
| `/gallery/:mediaSetId` | 普通图集查看器 |

### 后台

所有后台 API 由 `requireAdminSession` 服务端 cookie 鉴权，未登录返 `401`。`POST /api/admin/login` 有 5/min/IP 自管 rate limit。

| 路由 | 说明 |
| --- | --- |
| `/admin/login` | 登录页（`.panel` glass 体系 + prefers-reduced-motion 适配） |
| `/admin` | 仪表盘入口 |
| `/admin/projects` | 项目 CRUD + 标签 `#tag` chip + 级联删除二次确认 |
| `/admin/locations` | 地点 CRUD + 级联删除二次确认 |
| `/admin/media` | 媒体组/媒体图片 CRUD + HTML5 拖拽 + 键盘按钮重排 + location 下拉按 project 过滤 |
| `/admin/routes` | 路线 CRUD + 原子化 location 链接替换 + 级联删除二次确认 |

### 后端模块

- `auth`：登录、session、登出；server 端 cookie 鉴权
- `projects` / `locations` / `media-sets` / `media-images` / `routes`：CRUD + cascade-preview
- `uploads`：multipart 上传 + 本地存储 + 受控公开读取
- `public`：已发布内容读取、地图关系、文件可达性校验
- `system`：健康检查（`/health`、`/health/live`、`/health/ready`）

### 性能与视觉基础设施（Sprint 2 增量）

- `vendor-maplibre` 1.05 MB 改为 dynamic import，非地图页首屏不下载
- CSS 拆 critical（首屏 12.53 KB）+ lazy（76.26 KB 异步加载）
- `<LazyImage>` + `buildSrcSet` util（已就绪，供后续接入）
- Glass 设计 token（`--glass-bg-strong` / `--glass-blur` / `--glass-border` / `--shadow-2` / `--transition-fast/med`）应用到 `.panel` / card / hover
- `Skeleton` / `EmptyState`（4 变体：no-projects / no-media / no-routes / no-results）/ `RouteTransition`（fade + y±8px）覆盖所有公开 page

## 技术栈

| 部分 | 技术 |
| --- | --- |
| 前端 | React 19, Vite, TypeScript, React Router, Three.js, MapLibre GL, Framer Motion |
| 后端 | Node.js, Fastify, TypeScript, MySQL, mysql2 |
| 文件/上传 | Fastify multipart, 本地文件存储, sha256 hash |
| 测试 | Vitest, Testing Library, jsdom, Playwright（E2E）|
| 运维 | PM2, Caddy, PowerShell 备份/恢复/健康检查脚本 |

## 目录结构

```text
trace-scope-platform/
|-- apps/
|   |-- api/                          # Fastify 后端（端口 4000）
|   |   `-- src/
|   |       |-- modules/              # 功能模块：auth, projects, locations, media-sets,
|   |       |                        # media-images, routes, uploads, public, system
|   |       |                        # 每个模块按 {routes, service, repository, types, *.test} 分层
|   |       |-- infrastructure/       # DB pool, storage, helpers
|   |       `-- app/                  # buildServer, config, errors
|   `-- web/                          # React + Vite 前端（端口 5173）
|       `-- src/
|           |-- app/routes/           # 页面路由（public/, admin/, gallery/）
|           |-- components/           # 共享组件（map/, media/, project/, common/, site/）
|           |-- features/             # 按域划分（map/, gallery/, projects/, media/）
|           |   `-- {api, model, projection}/  # API hooks / viewModel / 投影逻辑
|           |-- lib/                  # lazyImage, constants, utils
|           |-- services/             # storage (adminDataStore), api (httpClient), auth
|           |-- styles/               # index.css (critical), non-critical.css (lazy)
|           `-- types/                # domain.ts 共享类型
|-- deploy/
|   `-- caddy/                        # Caddy 反向代理配置
|-- docs/
|   |-- operations/                   # 部署、备份、恢复
|   |-- plans/                        # 阶段规划
|   |-- specs/                        # 设计规格
|   |-- superpowers/                  # 分阶段细粒度计划和规格
|   |-- 2026-05-24-code-review.md
|   `-- 2026-05-26-current-feature-introduction-report.md
|-- .planning/                        # 当前 round 规划与收尾决策
|-- scripts/
|   `-- ops/                          # 备份、恢复、健康检查、发布构建脚本
|-- ecosystem.config.cjs              # PM2 配置
`-- README.md
```

## 核心数据模型（强约束，不要改）

```text
Project
├── Location
├── MediaSet  (type: spin360 | gallery)
│   └── MediaImage
└── Route
    └── route_location  ──>  Location
```

- `Project` 是顶层叙事单元。
- `Location` 必须属于一个 `Project`。
- `MediaSet` 必须属于一个 `Project`，类型二选一。
- `Route` 必须属于一个 `Project`；路径由 `route_location` 串联已有 `Location`，不直接存坐标。
- `MediaImage` 只能挂在 `MediaSet` 下，不能直接挂到页面或项目。

不要新增顶层实体，不要随意改核心字段名。

## 本地启动

API（端口 4000）：

```powershell
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
Copy-Item ".env.example" ".env"
npm install
npm run migrate
npm run dev
```

Web（端口 5173，Vite 代理 `/api` → 4000）：

```powershell
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\web"
Copy-Item ".env.example" ".env"
npm install
npm run dev
```

> 地图底图依赖前端环境变量（天地图 token）；未配置时页面容器和交互保留，真实底图可能不显示。

## 测试和构建

```powershell
# API 单元/集成测试 + 编译
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test
npm run build

# Web 单元/组件测试 + 构建
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\web"
npm test
npm run build

# Web E2E（Playwright smoke，4 cases）
# 前置：MySQL 8 跑着 + trace_scope_e2e 库已建并跑过 migrations
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\web"
npm run test:e2e
```

最近一次验证（2026-07-05 收尾检查，工作区 `45d80768` → `e9977b30`）：

- E2E: 上一轮 2026-06-26 验证 **4/4 cases** 全过（约 16-22s，本轮未重跑；CI 集成仍待 roadmap C）
- API tests: **13 文件 / 89 用例** 全过
- API build: ✅（`tsc` 通过）
- Web tests: **34 文件 / 145 用例** 全过（`vitest.config.ts` 已 exclude `e2e/**`；本轮清理 6 个冗余自指测试 -6 文件 -14 用例）
- Web build: ✅（`vite build` 有一个**已知**的 `Circular chunk: vendor -> vendor-react -> vendor` warning，来自 `vite.config.ts` 的 manual chunks 配置，与 chunk size 无关、无害；首屏 JS ~9.56 KB，首屏 CSS 12.53 KB；`vendor-maplibre` 1.05 MB 仅在地图能力加载时引入）
- TODO / FIXME / HACK / deprecated 残留: 0 处

继续开发前请重新跑一次，不要只信任历史记录。

## 关键代码边界

前端：

- 路由页面位于 `apps/web/src/app/routes/`，应保持轻量，只负责页面组合。
- 共享领域类型集中在 `apps/web/src/types/domain.ts`。
- 公开 API hooks 位于 `apps/web/src/features/*/api/`。
- 地图相关组件集中在 `apps/web/src/components/map/` 和 `apps/web/src/features/map/`。
- gallery 相关组件集中在 `apps/web/src/components/gallery/` 和 `apps/web/src/features/gallery/`。
- 通用 UI（`Skeleton` / `EmptyState` / `ToastProvider` / `CascadeDeleteDialog` / `RouteTransition`）集中在 `apps/web/src/components/common/`。
- `spin360` 和 `gallery` **不要合并成一个查看器组件**。
- `apps/web/src/styles/index.css` 是 critical-only 入口；非关键样式写到 `apps/web/src/styles/non-critical.css`，由 `apps/web/src/main.tsx` 异步加载。

后端：

- 应用入口 `apps/api/src/main.ts`，所有生产配置（`corsOrigins` / `trustProxy` / `logLevel` / `bodyLimitBytes` / `rateLimitMax` / `rateLimitWindowMs` / `cookieSecure`）必须传进 `buildServer`。
- Fastify server 装配 `apps/api/src/app/buildServer.ts`，配置读取 `apps/api/src/app/config.ts`。
- 数据库基础设施 `apps/api/src/infrastructure/db/`。
- 功能模块集中在 `apps/api/src/modules/`，每个模块按 `routes/service/repository/types` 分层。
- `STORAGE_DIR` 是运行时上传目录唯一来源，`UPLOAD_ROOT` 保留为兼容回退。
- 后台 CRUD + 上传 + cascade-preview API 全部走 `requireAdminSession` 服务端 cookie 鉴权。

## 公开 API

| Endpoint | 用途 |
| --- | --- |
| `GET /health` / `/health/live` / `/health/ready` | 健康检查 |
| `GET /api/public/projects` | 已发布项目列表 |
| `GET /api/public/projects/:idOrSlug` | 已发布项目详情（含 locations、mediaSets、routes） |
| `GET /api/public/media-sets/:id` | 已发布媒体组（含 images） |
| `GET /api/public/map-relationship` | 地图关系可视化数据源（`projects[].mediaSetIds` 已真实填充） |
| `GET /api/public/uploads/:fileId` | 受控公开文件读取（`PublicService.isFileReachableFromPublishedContent` 校验可达性） |
| `POST /api/admin/login` | 管理员登录（5/min/IP rate limit） |
| `GET /api/admin/session` | 查询登录状态（前端 AuthProvider mount 时调用，与 server 同步） |
| `POST /api/admin/logout` | 登出 |

注意：

- `/api/public/uploads/:fileId` 是公开图片的唯一入口；后端已关闭 `/uploads/*` 直接静态挂载。
- 公开项目封面字段仍叫 `coverImage`（不是 `coverImageUrl`），值是 `/api/public/uploads/{fileId}` 形式的可渲染 URL，保持前端类型兼容。
- route service 的 create/update 已下沉事务到 repository，半路失败自动回滚；location_ids 缺省视为 `null`（保留旧链接），传数组（含空）才原子替换。

## 运维入口

- PM2: `ecosystem.config.cjs`
- Caddy: `deploy/caddy/Caddyfile`
- 部署文档：`docs/operations/single-node-deployment.md`
- 备份恢复：`docs/operations/backup-and-recovery.md`
- 运维脚本：`scripts/ops/{backup-mysql,restore-mysql,backup-uploads,restore-uploads,build-release,check-api-health}.ps1`

部署前必须确认：上传目录配置、公开文件访问策略、CORS、rate limit、trust proxy、日志级别、secure cookie 行为都已与生产环境一致。

## 推荐阅读顺序

1. `README.md`（本文）—— 项目全局认知
2. `docs/2026-05-26-current-feature-introduction-report.md` —— 截至 2026-06-24 的完整功能介绍 + Sprint 1/2 详情
3. `docs/2026-05-24-code-review.md` —— 主要风险历史和修复优先级
4. `.planning/2026-06-06-next-round-roadmap.md` —— 下一阶段候选（A 移动端 / B+C E2E+CI / D 性能 / E GalleryHome 重构 / G 收工）
5. `.planning/2026-06-23-sprint2-wrap-up.md` —— Sprint 2 收尾 owner 决策记录
6. `.planning/2026-06-26-e2e-harness-wrap-up.md` —— E2E harness Round 1 收尾（harness / 4 cases / fixture / 已知问题 / 后续 round 候选）
7. `docs/superpowers/specs/2026-04-09-backend-modular-monolith-design.md` —— 后端模块化单体设计
8. `docs/operations/` —— 部署、备份、恢复方案
9. 代码入口：`apps/api/src/main.ts`、`apps/api/src/app/buildServer.ts`、`apps/api/src/modules/auth/requireAdminSession.ts`、`apps/web/src/app/router.tsx`、`apps/web/src/services/auth/authContext.tsx`

## 下一阶段候选

主干干净，所有 P0/P1 已收口。`.planning/2026-06-06-next-round-roadmap.md` 列的 5 个候选 + 后续 round 状态：

- **A 移动端布局** ✅ 完成
- **B E2E harness** ✅ 完成（本地端，4 smoke cases + fixture seeder，详见 `.planning/2026-06-26-e2e-harness-wrap-up.md`）
- **C CI 集成** ⏳ 待做（B 完成后可直接接：`.github/workflows/e2e.yml` + MySQL service container）
- **D 性能再优化** ⏳ 待做（`vendor-maplibre` 已动态 import，CSS 已 critical/lazy；剩余空间不大）
- **E GalleryHome 重构** ✅ 完成
- **G 收工** ⏳ 候选（等用户新需求或生产部署再开新工作）

不建议：重启 4-07 plan hero 重设计（roadmap F）、合并 spin360/gallery、新增顶层实体。

## 交接规则

后续交接时必须说明：

- 当前基于哪个分支和提交。
- 修改了哪些文件，是否有未提交或未跟踪文件。
- 跑过哪些验证命令，结果是什么。
- 哪些能力已经可用，哪些只是结构基础。
- 是否触碰了核心数据模型或公开 API 语义。

参考入口：

- 后端：`apps/api/src/app/buildServer.ts`、`apps/api/src/modules/{auth,projects,locations,media-sets,routes}/`
- 前端：`apps/web/src/app/router.tsx`、`apps/web/src/services/api/adminApi.ts`、`apps/web/src/components/common/ToastProvider.tsx`、`apps/web/src/components/common/CascadeDeleteDialog.tsx`、`apps/web/src/services/auth/authContext.tsx`