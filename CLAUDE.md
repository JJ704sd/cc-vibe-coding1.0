# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

地理标记内容平台，前端用 R3F/Three.js 曲面画廊 + MapLibre 天地图，后端是模块化单体架构（Fastify + MySQL）。

## 常用命令

### 启动开发服务器

```bash
# 后端（端口 4000）
cd apps/api && npm run dev

# 前端（端口 5173，Vite 代理 /api 到 4000）
cd apps/web && npm run dev
```

### 测试

```bash
cd apps/api && npm test          # API 测试（Vitest）
cd apps/web && npm test           # Web 测试（Vitest）
```

### 构建

```bash
cd apps/api && npm run build      # TypeScript 编译
cd apps/web && npm run build      # Vite 生产构建
```

### 数据库

```bash
cd apps/api && npm run migrate    # 运行数据库迁移
```

## 架构概览

```
apps/
├── api/                          # Fastify 后端（端口 4000）
│   └── src/
│       ├── modules/              # 功能模块（auth, projects, media-sets, locations, routes, uploads, public, system）
│       │   └── {routes, service, repository, types, *.test}.ts
│       ├── infrastructure/       # DB pool、storage、helpers
│       └── app/                 # buildServer.ts、config.ts、errors.ts
└── web/                         # React + Vite 前端（端口 5173）
    └── src/
        ├── app/routes/          # 页面路由（public/、admin/）
        ├── components/           # 共享组件（map/、media/、project/）
        ├── features/             # 按域划分（map/、gallery/、projects/、media/）
        │   └── {api, model, projection}/  # API hooks、viewModel、投影逻辑
        ├── services/storage/     # adminDataStore（localStorage）
        └── services/api/         # httpClient（/api 前缀）
```

### 数据模型（强约束，不可改变）

```
Project -> Location / MediaSet / Route -> MediaImage
```

- `Project` 是顶层叙事单元
- `Location` 必须属于一个 `Project`
- `MediaSet` 必须属于一个 `Project`（类型为 `spin360` 或 `gallery`）
- `Route` 必须属于一个 `Project`
- `MediaImage` 只能挂在 `MediaSet` 下

### 公开 API 路由

| 端点 | 说明 |
|------|------|
| `GET /api/public/projects` | 已发布项目列表 |
| `GET /api/public/projects/:idOrSlug` | 已发布项目详情（含 locations、mediaSets、routes） |
| `GET /api/public/media-sets/:id` | 已发布媒体组（含 images） |
| `GET /api/public/map-relationship` | 地图可视化数据源 |
| `GET /api/public/uploads/:fileId` | 公开文件读取（含可达性检查） |

### 运维（Phase 4 完成）

- PM2：`ecosystem.config.cjs`
- Caddy 反向代理配置：`deploy/caddy/Caddyfile`
- 运维脚本：`scripts/ops/*.ps1`（backup、restore、health check、build-release）
- 部署文档：`docs/operations/`

## 核心约束

- 不要把 `spin360` 和 `gallery` 合并成一个查看器组件
- 不要把地图逻辑直接写进页面路由组件，路由页面只负责页面组合
- 共享类型统一在 `apps/web/src/types/domain.ts`
- 不要擅自新增顶层核心实体或改动核心字段名

## 行为准则

**权衡：** 偏向谨慎而非速度，简单任务自行判断。

1. **思考后再编码** — 不假设，有疑问明确说明；多种解释并存时先呈现而非静默选择；存在更简单方案时指出并 push back。
2. **简洁优先** — 只写解决问题所需的最少代码，不做推测性工作；单次使用的代码不抽象。
3. **精准修改** — 只改必须改的；不"改进"相邻代码；不重构没坏的东西。
4. **目标驱动执行** — 多步骤任务先声明计划，验证每个步骤。

## 阶段状态

| Phase | 内容 | 状态 |
|-------|------|------|
| Phase 1 | 鉴权基础设施 | ✅ 完成 |
| Phase 2 | Admin CRUD + 上传 | ✅ 完成 |
| Phase 3 | Public API + 前端迁移 | ✅ 完成 |
| Phase 4 | 单节点硬化 + 运维 | ✅ 完成 |

## 文档

- 实施计划：`docs/superpowers/plans/`
- 设计规范：`docs/superpowers/specs/`
- 运维文档：`docs/operations/`

## 记录的错误和规则

（暂无 - 随着 Claude 犯错逐步添加）
