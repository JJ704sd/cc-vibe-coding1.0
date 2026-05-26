# Trace Scope Platform

Trace Scope Platform 是一个空间叙事平台，用于把项目、地点、轨迹、360 图片序列和图集内容组织到同一个网站中。当前代码库已经从早期前端骨架推进到前后端分离结构：`apps/web` 提供 React/Vite 前端，`apps/api` 提供 Fastify/MySQL 后端。

本 README 的用途是给后续开发者或模型快速接手项目。它不是产品宣传文案，也不应该替代 `docs/` 里的设计规格、实施计划和 review 文档。

## 当前状态

已具备：

- 前台页面和后台管理页面的基础结构。
- React/Vite 前端，包含项目页、地图页、图库/360 查看入口和后台页面。
- Fastify 后端，包含 auth、projects、locations、routes、media-sets、media-images、uploads、public、system 等模块。
- MySQL 迁移、基础 CRUD、公开 API、上传模块和本地文件存储。
- 后台 CRUD 和上传接口的服务端 admin session 鉴权。
- 上传文件公开读取已收敛到受控的 `/api/public/uploads/:fileId`。
- Vitest 测试与前后端构建脚本。
- 单节点部署相关材料：PM2、Caddy 配置、备份/恢复/健康检查脚本和运维文档。
- 代码 review 文档：`docs/2026-05-24-code-review.md`。

仍需重点处理：

- 生产配置字段存在但部分没有传入真实启动路径。
- `STORAGE_DIR` 与 `UPLOAD_ROOT` 的上传目录语义需要统一。
- 公开项目封面字段当前返回 file id，前端按图片 URL 使用时可能 broken。
- Web 构建中 `maplibre-gl` 和 gallery 相关 chunk 体积偏大，需要后续拆包优化。

## 技术栈

| 部分 | 技术 |
| --- | --- |
| 前端 | React, Vite, TypeScript, React Router, Three.js, MapLibre GL, Framer Motion |
| 后端 | Node.js, Fastify, TypeScript, MySQL |
| 文件/上传 | Fastify multipart, 本地文件存储 |
| 测试 | Vitest, Testing Library |
| 运维 | PM2, Caddy, PowerShell backup/restore scripts |

## 目录结构

```text
trace-scope-platform/
|-- apps/
|   |-- api/                 # Fastify 后端
|   `-- web/                 # React + Vite 前端
|-- deploy/
|   `-- caddy/               # Caddy 反向代理配置
|-- docs/
|   |-- plans/               # 早期实施计划
|   |-- specs/               # 早期设计规格
|   |-- operations/          # 部署、备份、恢复文档
|   |-- superpowers/         # 分阶段计划和规格
|   `-- 2026-05-24-code-review.md
|-- scripts/
|   `-- ops/                 # 备份、恢复、健康检查、发布构建脚本
|-- ecosystem.config.cjs     # PM2 配置
`-- README.md
```

## 核心数据模型

强约束链路：

```text
Project -> Location / MediaSet / Route -> MediaImage
```

含义：

- `Project` 是顶层叙事单元。
- `Location` 必须属于一个 `Project`。
- `MediaSet` 必须属于一个 `Project`，类型为 `spin360` 或 `gallery`。
- `Route` 必须属于一个 `Project`。
- `MediaImage` 只能挂在 `MediaSet` 下，不能直接挂到页面或项目。

后续修改不要擅自新增顶层核心实体，也不要随意改动核心字段名。若确实需要调整数据模型，先更新设计文档和迁移计划。

## 本地启动

### 1. 启动 API

```powershell
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
Copy-Item ".env.example" ".env"
npm install
npm run migrate
npm run dev
```

API 默认使用 `PORT=4000`。数据库、上传目录、session、CORS 等配置参考 `apps/api/.env.example` 和 `apps/api/.env.production.example`。

### 2. 启动 Web

```powershell
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\web"
Copy-Item ".env.example" ".env"
npm install
npm run dev
```

Web 默认由 Vite 启动。地图底图依赖前端环境变量；如果没有配置地图 token，页面仍应保留容器和交互边界，但真实底图可能不显示。

## 测试和构建

API：

```powershell
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\api"
npm test
npm run build
```

Web：

```powershell
Set-Location "D:\VS vibe coding files\trace-scope-platform\apps\web"
npm test
npm run build
```

当前提交前的 Web 验证记录（2026-05-24）：

- Web tests: 33 files passed, 106 tests passed.
- Web build: passed；Vite 已按 `react`、`three`、`maplibre-gl` 拆分 vendor chunks，当前构建无 chunk size warning。

后台 API 鉴权合并后的验证记录（2026-05-26）：

- API tests: 6 files passed, 37 tests passed.
- API build: passed.
- Web tests: 35 files passed, 110 tests passed.
- Web build: passed.

继续开发或部署前仍应重新运行相关命令。

## 关键代码边界

前端：

- 路由页面位于 `apps/web/src/app/routes/`，应保持轻量，只负责页面组合。
- 共享领域类型集中在 `apps/web/src/types/domain.ts`。
- 公开 API hooks 位于 `apps/web/src/features/*/api/`。
- 地图相关组件集中在 `apps/web/src/components/map/` 和 `apps/web/src/features/map/`。
- gallery 相关组件集中在 `apps/web/src/components/gallery/` 和 `apps/web/src/features/gallery/`。
- `spin360` 和 `gallery` 不要合并成一个查看器组件。

后端：

- 应用入口在 `apps/api/src/main.ts`。
- Fastify server 装配在 `apps/api/src/app/buildServer.ts`。
- 配置读取在 `apps/api/src/app/config.ts`。
- 数据库基础设施在 `apps/api/src/infrastructure/db/`。
- 功能模块集中在 `apps/api/src/modules/`，每个模块通常按 `routes/service/repository/types` 分层。

## 公开 API

当前公开 API 包括：

| Endpoint | 用途 |
| --- | --- |
| `GET /api/public/projects` | 已发布项目列表 |
| `GET /api/public/projects/:idOrSlug` | 已发布项目详情 |
| `GET /api/public/media-sets/:id` | 已发布媒体组及图片 |
| `GET /api/public/map-relationship` | 地图关系可视化数据 |
| `GET /api/public/uploads/:fileId` | 受控公开文件读取 |

注意：`/api/public/uploads/:fileId` 的设计意图是只返回发布内容可达文件；当前后端不再直接静态挂载 `/uploads/*`。

## 运维入口

相关文件：

- PM2: `ecosystem.config.cjs`
- Caddy: `deploy/caddy/Caddyfile`
- 部署文档：`docs/operations/single-node-deployment.md`
- 备份恢复：`docs/operations/backup-and-recovery.md`
- 运维脚本：`scripts/ops/*.ps1`

后续部署前必须先确认上传目录配置、公开文件访问策略、CORS、rate limit、trust proxy、日志级别和 secure cookie 行为都已和生产环境一致。

## 推荐阅读顺序

1. `README.md`：先建立项目全局认知。
2. `docs/2026-05-24-code-review.md`：了解当前主要风险和修复优先级。
3. `docs/superpowers/specs/2026-04-09-backend-modular-monolith-design.md`：理解后端模块化单体设计。
4. `docs/superpowers/plans/`：查看后端分阶段实施计划。
5. `docs/operations/`：查看部署、备份和恢复方案。
6. 代码入口：`apps/api/src/main.ts`、`apps/api/src/app/buildServer.ts`、`apps/web/src/app/router.tsx`。

## 下一步优先级

建议按风险优先处理：

1. 修正 `main.ts` 到 `buildServer` 的生产配置传递。
2. 统一 `STORAGE_DIR` 与 `UPLOAD_ROOT` 的语义。
3. 修正公开项目封面 URL 映射。
4. 为 route location 替换增加事务保护。
5. 继续补后台表单、排序、发布流程和 Web chunk 拆分优化。

## 交接规则

后续交接时必须说明：

- 当前基于哪个分支和提交。
- 修改了哪些文件，是否有未提交或未跟踪文件。
- 跑过哪些验证命令，结果是什么。
- 哪些能力已经可用，哪些只是结构基础。
- 是否触碰了核心数据模型或公开 API 语义。

不要只因为测试通过就宣称项目完成。这个项目还有明确的生产配置、上传目录语义和内容发布链路问题需要关闭。
