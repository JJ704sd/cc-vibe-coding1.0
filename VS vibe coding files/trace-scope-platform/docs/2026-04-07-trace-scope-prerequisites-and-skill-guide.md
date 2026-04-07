# Trace Scope Platform 前提知识与提示词 / Skill 编写指南

## 1. 文档目的

这份文档用于给后续接手这个项目的人提供一份稳定的认知基线，避免在没有理解项目性质的情况下直接改代码、改视觉或写 skill。

本文件重点覆盖：

- 这个项目当前到底是什么
- 接手者需要具备哪些前提知识
- 应该按什么顺序学习代码与文档
- 应该如何编写适合本项目的提示词
- 应该如何编写适合本项目的 `SKILL.md`

---

## 2. 项目当前性质

Trace Scope Platform 当前不是一个完整的“已上线内容平台”，而是一个可继续扩展的前端原型与结构化实现底座。

当前项目包含两个并行方向：

1. 空间叙事平台结构
2. 艺术展陈风格的沉浸式前台展示

从代码现状看，这个项目主要由以下几部分构成：

- React + TypeScript + Vite 前端应用
- 基于 Three.js 的 3D 画廊首页
- 基于 `localStorage` 的后台数据管理壳层
- 基于固定领域模型的项目 / 地点 / 媒体组 / 轨迹结构
- 尚未真正接入完成态地图与真实后端

必须先接受一个事实：

- 这不是“普通企业后台 + 普通官网”
- 这也不是“完整 GIS 系统”
- 这更不是“真实多用户媒体管理平台”

它当前更接近：

- 一个带后台壳层的空间叙事前端原型
- 一个正在向艺术化展陈体验靠拢的内容展示系统

---

## 3. 必须先理解的核心约束

### 3.1 核心数据链不可乱改

本项目核心链路固定为：

`Project -> Location -> MediaSet / Route`

必须理解的含义：

- `Project` 是顶层叙事容器
- `Location` 必须属于某个 `Project`
- `MediaSet` 必须属于某个 `Project`
- `Route` 必须属于某个 `Project`
- `MediaImage` 只能属于某个 `MediaSet`

### 3.2 媒体类型不能乱合并

`spin360` 和 `gallery` 在一阶段中必须维持为两个独立概念：

- `spin360` 是按顺序切帧的图片序列
- `gallery` 是地点相关的图集浏览

因此：

- 不能把两个查看器粗暴合并成一个万能组件
- 不能把旋转逻辑和普通图集逻辑混写

### 3.3 路由层要保持轻

路由页面应该主要负责：

- 页面组合
- 取数拼装
- 状态分发

不应该负责：

- 重业务算法
- 大量底层图形逻辑
- 混乱的数据变换

### 3.4 当前后台不是“真实后台”

后台数据当前主要由前端存储层驱动，不是数据库驱动。

这意味着：

- 现在的 CRUD 更接近“可验证结构”的原型能力
- 不能假设已经有真实 API、权限系统、上传系统、持久化服务
- 提示词与 skill 里必须明确这一点，避免 AI 自作主张按全栈系统改造

---

## 4. 你需要具备的前提知识

以下知识不是平均重要，应该分优先级掌握。

### 4.1 第一优先级：领域建模

这是接手本项目最重要的能力。

你必须能回答：

- `Project`、`Location`、`MediaSet`、`Route`、`MediaImage` 各自是什么
- 它们之间的归属关系是什么
- 哪些字段是平台核心字段，哪些只是展示层使用
- 什么是领域实体，什么只是视图层模型

如果这里理解错了，后面代码、美术、提示词都会错。

### 4.2 第一优先级：React + TypeScript 工程能力

必须具备：

- TypeScript 类型阅读与建模能力
- React 基础组件设计
- Hook 使用与状态管理
- React Router 路由组织
- 懒加载与页面拆分
- Vite 项目结构理解
- Vitest 基础测试理解

至少要能独立判断：

- 这段逻辑应该写在组件、hook、服务层还是类型层
- 哪些修改会破坏类型边界

### 4.3 第一优先级：前端数据层理解

这个项目当前的数据层不是“后端接口层”，而是浏览器存储模拟层。

必须理解：

- `localStorage`
- `sessionStorage`
- 前端模拟持久化
- store / reader 分层
- seed 数据与运行态数据的关系

### 4.4 第二优先级：Three.js 与交互图形基础

如果要改首页或沉浸式视觉区，需要掌握：

- `Scene`
- `Camera`
- `Renderer`
- `Light`
- `Material`
- `Texture`
- `OrbitControls`
- Raycasting
- 动画循环
- 资源销毁与清理

不要求一上来就会高级图形编程，但至少要能看懂：

- 卡片为什么这样排布
- 镜头为什么这样移动
- 交互点击是如何命中物体的

### 4.5 第二优先级：视觉与美术判断

这个项目对美术能力的要求不是“会切图”这么简单，而是要求能判断：

- 什么叫艺术展陈感
- 什么叫空间感与镜头感
- 什么叫视觉层级清晰
- 什么叫展览式而不是平台式

至少要具备：

- 字体搭配基础
- 色彩氛围判断
- 留白与布局节奏判断
- 图片封面与缩略图组织能力
- 玻璃拟态、昼夜模式、动态背景的审美一致性判断

### 4.6 第二优先级：内容策展与叙事能力

这个项目不是单纯图片浏览器。

你需要有能力理解：

- 为什么地点顺序会影响叙事
- 为什么轨迹和媒体组要共同构成项目体验
- 为什么首页文案不能写成 SaaS 平台导航
- 为什么项目详情页要更像“叙事页”而不是“数据详情页”

### 4.7 第三优先级：地图 / 空间表达理解

当前地图能力还不是完整态，但仍需要理解：

- 经纬度与地点实体关系
- 轨迹由地点顺序推导而来
- 地图页面是空间叙事的一部分
- 当前地图页仍处于结构占位与渐进实现阶段

### 4.8 第三优先级：验证与约束意识

这个项目尤其需要“不要乱扩张”的意识。

必须具备：

- 不凭空新增核心实体
- 不随意改字段含义
- 不为了视觉炫技破坏结构
- 不把临时原型误判成完整系统
- 不把后台壳层写成伪全栈系统

---

## 5. 建议的学习顺序

接手这个项目时，建议按下面顺序阅读。

### 5.1 先读领域模型

优先阅读：

- `apps/web/src/types/domain.ts`

目标：

- 吃透所有核心实体和字段
- 建立对项目结构的第一性理解

### 5.2 再读主数据来源

优先阅读：

- `apps/web/src/services/api/mock-data.ts`
- `apps/web/src/services/storage/adminDataStore.ts`
- `apps/web/src/services/storage/publicDataReader.ts`

目标：

- 搞清楚数据从哪里来
- 弄明白后台和前台如何共享数据
- 理解当前项目为什么是“前端存储驱动原型”

### 5.3 再读前台主体验

优先阅读：

- `apps/web/src/app/routes/gallery/GalleryHome.tsx`
- `apps/web/src/components/gallery/GalleryScene.tsx`
- `apps/web/src/components/gallery/GalleryModal.tsx`

目标：

- 理解 3D 首页不是普通列表页
- 理解沉浸式视觉层的实现边界

### 5.4 再读媒体查看器

优先阅读：

- `apps/web/src/components/media/SpinViewer.tsx`
- `apps/web/src/components/media/GalleryViewer.tsx`

目标：

- 理解两种媒体类型的交互差异

### 5.5 再读项目详情与地图页

优先阅读：

- `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx`
- `apps/web/src/app/routes/public/map/MapPage.tsx`

目标：

- 理解空间叙事页与地图页目前处于什么阶段

### 5.6 最后读设计文档

优先阅读：

- `docs/specs/2026-04-05-trace-scope-platform-design.md`
- `docs/specs/2026-04-06-trace-scope-3d-gallery-design.md`
- `docs/gallery-reference-improvements.md`

目标：

- 理解项目“应该成为什么样”
- 分清楚当前已实现和未来目标

---

## 6. 写提示词时必须说清楚的内容

很多 AI 输出失控，不是因为模型差，而是因为提示词没有把项目事实说清楚。

你写提示词时必须固定包含以下模块。

### 6.1 角色定义

例如：

- 你是负责 Trace Scope Platform 的高级前端工程师
- 你同时需要尊重平台领域模型和展陈式视觉方向

### 6.2 项目背景

必须明确说明：

- 这是 React + TypeScript + Vite 项目
- 首页是 Three.js 3D 画廊
- 后台当前基于 `localStorage`
- 地图能力尚未完全接入

### 6.3 已知事实

必须写清楚：

- 哪些是现状
- 哪些是规划
- 哪些页面只是壳层
- 哪些能力尚未落地

### 6.4 不可破坏的约束

至少要写：

- 核心数据链不可改
- 不新增顶层核心实体
- 不改 `domain.ts` 中已有实体含义
- `spin360` 与 `gallery` 保持独立查看器
- 路由页保持轻量
- 首页保持展陈感而不是后台感

### 6.5 本次目标

只写本次要做的事情。

例如：

- 优化首页视觉层级
- 新增 AboutModal
- 重构项目详情页地点联动

### 6.6 非目标

必须明确禁止 AI 顺手扩张：

- 不接真实后端
- 不重写认证系统
- 不新增 GIS 分析能力
- 不引入新的顶层业务模型

### 6.7 输出要求

建议要求 AI：

- 先复述理解
- 再给方案
- 标明影响文件
- 标注风险与假设

---

## 7. 推荐提示词模板

下面这个模板可以直接复用。

```md
你在修改 Trace Scope Platform。

项目性质：
- React + TypeScript + Vite 前端
- 首页是 Three.js 3D 画廊
- 后台目前基于 localStorage，不是真实后端
- 地图页目前仍是占位结构，不要假设已经接入完整地图能力

必须遵守的约束：
- 核心数据链固定为 Project -> Location -> MediaSet / Route
- 不新增顶层核心实体
- 不修改 domain.ts 中已有实体含义
- spin360 与 gallery 必须保持为两个独立查看器
- 路由页只做页面组合，不把重业务逻辑塞进去
- 保持艺术展陈 / 空间叙事语气，不要做成企业后台首页

本次目标：
- [写这次具体目标]

非目标：
- 不接真实后端
- 不重做认证体系
- 不新增复杂 GIS / 3D 模型能力

输出要求：
- 先概括理解
- 给出改动方案
- 标明会改哪些文件
- 如有风险先说明
```

如果是视觉类任务，再补一段：

```md
视觉方向：
- 参考艺术作品集 / 展厅体验，而不是 SaaS 控制台
- 强调留白、镜头感、氛围和排版层级
- 减少平台化按钮噪音
- 优先考虑封面图、标题、说明文字、空间感的统一
```

---

## 8. 本项目的 Skill 应该怎么写

### 8.1 先写项目型 skill，不要先写空泛 skill

这个项目更适合沉淀两类 skill：

1. 项目结构约束类
2. 视觉方向约束类

不建议优先写：

- 通用 React skill
- 通用 TypeScript skill
- 泛化的“写前端页面” skill

因为真正反复犯错的地方不在通用技术，而在“这个项目的边界”。

### 8.2 Skill 最适合沉淀什么内容

适合写进 skill 的内容：

- 核心数据链约束
- 页面和组件职责边界
- 视觉风格禁区
- 项目事实与错误假设提醒
- 反复出现的错误修改模式

不适合写进 skill 的内容：

- 与项目无关的教程
- 你个人一次性的思考过程
- 过长的 narrative 叙述

### 8.3 `description` 只写“什么时候用”

`description` 必须描述触发条件，不要描述流程。

错误示例：

```yaml
description: Use when editing Trace Scope and then first analyze domain types, then read GalleryHome, then update CSS
```

正确示例：

```yaml
description: Use when modifying Trace Scope Platform pages, data flow, or component boundaries and there is risk of breaking the platform's core entity relationships or presentation model
```

### 8.4 一个适合本项目的 skill 结构

建议 skill 结构：

```md
---
name: trace-scope-project-guardrails
description: Use when modifying Trace Scope Platform pages, data flow, or component boundaries and there is risk of breaking the platform's core entity relationships or presentation model.
---

# Trace Scope Project Guardrails

## Overview
[用 1 到 2 句话说明这个 skill 的核心原则]

## When to Use
- [列出触发场景]

## Core Constraints
- [列出项目硬约束]

## Project Facts
- [列出关键代码位置和事实]

## Good Changes
- [列出安全改动方向]

## Bad Changes
- [列出高风险错误改动]

## Completion Check
- [列出完成前检查问题]
```

---

## 9. 推荐优先编写的两个 Skill

### 9.1 Skill 一：项目结构约束类

建议名称：

`trace-scope-project-guardrails`

建议用途：

- 修改数据模型时使用
- 修改页面边界时使用
- 修改媒体 / 地点 / 轨迹相关逻辑时使用

建议覆盖：

- 核心数据链
- 实体边界
- route 页面职责
- 后台原型存储事实
- 不可乱做的扩张项

### 9.2 Skill 二：画廊视觉方向类

建议名称：

`trace-scope-gallery-visual-direction`

建议用途：

- 修改首页视觉
- 修改模态层
- 修改加载动画
- 修改艺术展陈相关文案或视觉层级

建议覆盖：

- 首页必须更像展陈空间而不是平台首页
- 控件噪音要低
- 作品图与标题优先级高于平台结构信息
- 动画要克制、平缓、带镜头感

---

## 10. 可直接参考的 Skill 样例

### 10.1 项目结构约束 Skill 示例

```md
---
name: trace-scope-project-guardrails
description: Use when modifying Trace Scope Platform pages, data flow, or component boundaries and there is risk of breaking the platform's core entity relationships or presentation model.
---

# Trace Scope Project Guardrails

## Overview
Trace Scope is a spatial narrative platform with an art-portfolio-style frontend.
The main risk is breaking entity boundaries or turning exhibition pages into generic dashboard UI.

## When to Use
- Adding or changing public pages
- Editing admin CRUD flows
- Touching data models or view models
- Refactoring media, route, or location rendering

## Core Constraints
- Core chain is `Project -> Location -> MediaSet / Route`
- `MediaImage` must belong to a `MediaSet`
- `spin360` and `gallery` stay as separate viewers
- Route pages should compose UI, not own deep business logic
- Do not treat current localStorage storage as a real backend
- Do not present the homepage like a SaaS dashboard

## Project Facts
- Shared domain types live in `apps/web/src/types/domain.ts`
- Seed/mock content lives in `apps/web/src/services/api/mock-data.ts`
- Admin persistence lives in `apps/web/src/services/storage/adminDataStore.ts`
- Gallery homepage is driven by Three.js scene code

## Good Changes
- Add a view-model layer for gallery presentation
- Improve visual hierarchy without changing domain meaning
- Keep page components thin and move reusable logic downward

## Bad Changes
- Merge `spin360` and `gallery` into one mega viewer
- Add new top-level entities casually
- Move heavy business logic into route files
- Replace art-direction language with generic platform copy

## Completion Check
- Did entity relationships remain intact?
- Did the page become clearer without becoming more generic?
- Did the change preserve the gallery / exhibition tone?
```

### 10.2 视觉方向 Skill 示例

```md
---
name: trace-scope-gallery-visual-direction
description: Use when redesigning Trace Scope gallery-facing pages, overlays, or art presentation and visual choices need to stay aligned with the project's immersive exhibition direction.
---

# Trace Scope Gallery Visual Direction

## Overview
The gallery layer should feel like a curated exhibition, not a product catalog.

## When to Use
- Updating `GalleryHome`
- Changing modal presentation
- Revising typography, overlays, loader, or scene atmosphere
- Reworking artwork cards or labels

## Visual Rules
- Prefer atmospheric restraint over busy chrome
- Typography should feel editorial, not default app UI
- Metadata hierarchy should support artwork viewing first
- Navigation should stay minimal on the homepage
- Motion should feel cinematic and calm

## Avoid
- Platform-heavy labels on the homepage
- Dense admin-like control bars
- Loud button clusters in the main visual field
- Random style mixing without a clear art direction

## Review Questions
- Does this feel like entering a curated space?
- Is the artwork / media the first visual priority?
- Are copy and controls secondary to atmosphere?
```

---

## 11. 最后提醒

接手这个项目时，最容易犯的错有四类：

1. 把它误判成普通内容管理系统
2. 把它误判成完整地图产品
3. 为了追求统一而错误合并 `spin360` 与 `gallery`
4. 为了追求“更炫”而破坏既有结构与叙事边界

所以真正重要的不是“先写很多代码”，而是先守住三件事：

- 守住领域模型
- 守住组件与页面边界
- 守住视觉方向的一致性

只要这三件事不丢，后续无论是继续做地图、补后台、优化首页，还是给 AI 写提示词和 skill，都会更稳。
