# cc-vibe-coding1.0

本仓库当前主要收纳 `Trace Scope Platform` 项目，项目目录位于：

`VS vibe coding files/trace-scope-platform`

Trace Scope Platform 是一个空间叙事平台，用于把项目页面、地点、轨迹、360 图片序列和图集浏览组织到同一个网站中。项目采用前后端分离结构：前端是 React/Vite 应用，后端是 Fastify/MySQL API，并在项目目录内保留设计文档、实施计划、交接说明和代码 review 记录。

## 目录结构

```text
VS vibe coding files/
`-- trace-scope-platform/
    |-- apps/
    |   |-- api/        # Fastify API、MySQL 持久化、后台/公开接口
    |   `-- web/        # React + Vite 前端
    |-- docs/           # 规格、计划、交接和 review 文档
    `-- README.md       # 项目级接手说明
```

## 项目能力

- 前台项目浏览，用于展示空间叙事内容。
- 地点和轨迹数据结构，用于地图式探索。
- 独立的 `spin360` 与 `gallery` 媒体查看体验。
- 后台项目、地点、轨迹、媒体组和媒体图片管理基础。
- 后端模块覆盖鉴权、公开 API、上传、项目、地点、轨迹、媒体组和媒体图片。
- 文档覆盖设计决策、分阶段实现计划和代码 review 问题记录。

## 技术栈

| 领域 | 技术 |
| --- | --- |
| 前端 | React, Vite, TypeScript, React Router, Three.js, MapLibre GL |
| 后端 | Node.js, Fastify, TypeScript, MySQL |
| 测试 | Vitest, Testing Library |
| 文档 | Markdown specs, plans, operations notes, review reports |

## 快速启动

从仓库根目录进入项目：

```powershell
Set-Location "VS vibe coding files/trace-scope-platform"
```

启动 API：

```powershell
Set-Location "apps/api"
Copy-Item ".env.example" ".env"
npm install
npm run migrate
npm run dev
```

另开一个终端启动 Web：

```powershell
Set-Location "VS vibe coding files/trace-scope-platform/apps/web"
Copy-Item ".env.example" ".env"
npm install
npm run dev
```

Web 由 Vite 启动，API 从 `apps/api` 启动。端口、数据库和地图 token 等配置以项目级 README 和各应用的 `.env.example` 为准。

## 验证命令

分别在前后端目录中运行：

```powershell
# API
Set-Location "VS vibe coding files/trace-scope-platform/apps/api"
npm test
npm run build

# Web
Set-Location "VS vibe coding files/trace-scope-platform/apps/web"
npm test
npm run build
```

## 重要文档

- 项目接手说明：`VS vibe coding files/trace-scope-platform/README.md`
- 代码 review：`VS vibe coding files/trace-scope-platform/docs/2026-05-24-code-review.md`
- 设计规格：`VS vibe coding files/trace-scope-platform/docs/specs/`
- 实施计划：`VS vibe coding files/trace-scope-platform/docs/plans/`
- Superpowers 计划和规格：`VS vibe coding files/trace-scope-platform/docs/superpowers/`

## 当前状态

Trace Scope Platform 仍处于持续实现阶段。当前已经具备前后端基础结构、测试和构建脚本，但在作为生产项目使用前，需要先处理最新 review 文档中提到的后台鉴权、上传访问控制、运行配置和公开媒体 URL 等问题。
