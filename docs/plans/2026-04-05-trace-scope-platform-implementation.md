# Trace Scope Platform 实施计划（弱模型执行版）

> **给执行型代理的要求：** 必须使用 `superpowers:subagent-driven-development` 或 `superpowers:executing-plans`。使用复选框跟踪任务进度。除非文档明确允许，不要改变文件边界、实体命名和页面职责。

**目标：** 为一个双核心的空间叙事平台搭建一个可维护、可接手、可逐步扩展的前端基础，覆盖前台与后台两部分。

**架构：** 使用 React + Vite + TypeScript 的 Web 应用结构。页面路由只负责组合，业务类型集中定义，地图模块、媒体模块、后台模块分别隔离。

**技术栈：** React、Vite、TypeScript、React Router、Tailwind CSS、Framer Motion、Mapbox GL JS

---

## 执行总规则
- 不新增新的核心实体
- 不重命名已有核心字段
- 不把 `spin360` 和 `gallery` 合并成一个查看器
- 不把 Mapbox 逻辑直接堆进页面路由组件
- 每完成一批任务后，至少手动检查一次文件结构和导入关系

## 任务 1：工具链基础
**目标：** 让 `apps/web` 成为一个明确可运行的前端应用目录。

- [ ] 创建 `apps/web/package.json`
- [ ] 创建 `apps/web/tsconfig.json`
- [ ] 创建 `apps/web/tsconfig.node.json`
- [ ] 创建 `apps/web/vite.config.ts`
- [ ] 创建 `apps/web/index.html`
- [ ] 在 `package.json` 中至少包含 `dev`、`build`、`preview` 三个脚本
- [ ] 安装依赖并确认没有明显的依赖声明缺失

完成标准：
- `apps/web` 目录具备基础前端工程入口
- 路径别名和 TypeScript 配置方向明确

## 任务 2：应用启动骨架
**目标：** 让应用具备明确的启动入口和路由承载点。

- [ ] 创建 `apps/web/src/main.tsx`
- [ ] 创建 `apps/web/src/app/router.tsx`
- [ ] 创建 `apps/web/src/styles/index.css`
- [ ] 在 `main.tsx` 中挂载路由
- [ ] 在 `router.tsx` 中建立前台与后台两组路由
- [ ] 在 `index.css` 中定义基础设计变量和全局样式

完成标准：
- 应用入口唯一
- 路由入口唯一
- 基础视觉变量已集中定义

## 任务 3：共享类型与示例数据
**目标：** 让所有页面和组件都从统一契约读取数据。

- [ ] 创建 `apps/web/src/types/domain.ts`
- [ ] 在其中定义 `Project`、`Location`、`MediaSet`、`MediaImage`、`RouteEntity`、`AdminUser`
- [ ] 创建 `apps/web/src/services/api/mock-data.ts`
- [ ] 为每个核心实体提供至少一组可用示例数据
- [ ] 确保页面中不重复定义这些类型

完成标准：
- 所有页面可直接复用共享类型
- 示例数据足够支撑首页、项目页、地图页和媒体页渲染

## 任务 4：公共布局与导航
**目标：** 建立前台统一外壳，避免每个页面各自重复导航结构。

- [ ] 创建 `apps/web/src/components/site/SiteHeader.tsx`
- [ ] 创建 `apps/web/src/components/site/PublicLayout.tsx`
- [ ] 在 `PublicLayout` 中挂载 `SiteHeader` 和 `Outlet`
- [ ] 为首页、项目页、地图页和后台入口提供导航

完成标准：
- 前台页面共享同一套导航结构
- 路由结构与布局结构清楚对应

## 任务 5：首页与项目浏览
**目标：** 先把最能体现产品结构的前台页面搭出来。

- [ ] 创建 `apps/web/src/components/project/HeroEntryPanel.tsx`
- [ ] 创建 `apps/web/src/components/project/ProjectCard.tsx`
- [ ] 创建 `apps/web/src/app/routes/public/home/HomePage.tsx`
- [ ] 创建 `apps/web/src/app/routes/public/projects/ProjectsPage.tsx`
- [ ] 首页首屏同时表达地图能力和媒体能力
- [ ] 项目列表页默认读取已发布项目

完成标准：
- 首页不是空壳，能看出双核心产品方向
- 项目列表页能稳定显示卡片列表

## 任务 6：项目详情页
**目标：** 建立单项目的主叙事页面。

- [ ] 创建 `apps/web/src/components/project/LocationDetailPanel.tsx`
- [ ] 创建 `apps/web/src/components/project/MediaSetCard.tsx`
- [ ] 创建 `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx`
- [ ] 页面中包含项目介绍、地点列表、地图区域、媒体组列表
- [ ] 页面中至少有一个“当前选中地点”的显式状态

完成标准：
- 点击地点列表项时，详情区域能更新
- 媒体组列表能够区分跳转到 `spin` 或 `gallery`

## 任务 7：地图模块
**目标：** 把地图能力拆成独立模块，而不是塞进页面。

- [ ] 创建 `apps/web/src/components/map/MapView.tsx`
- [ ] 创建 `apps/web/src/components/map/LocationMarkerLayer.tsx`
- [ ] 创建 `apps/web/src/components/map/RoutePolylineLayer.tsx`
- [ ] 创建 `apps/web/src/app/routes/public/map/MapPage.tsx`
- [ ] `MapView` 只做地图容器和数据输入
- [ ] `LocationMarkerLayer` 只负责点位层
- [ ] `RoutePolylineLayer` 只负责轨迹层
- [ ] 在没有 Token 的情况下先使用占位实现

完成标准：
- 地图页的结构已明确
- 组件职责可一眼看清
- 后续接入 Mapbox 时无需推翻页面结构

## 任务 8：媒体查看模块
**目标：** 把 `spin360` 与 `gallery` 彻底拆开实现。

- [ ] 创建 `apps/web/src/components/media/SpinViewer.tsx`
- [ ] 创建 `apps/web/src/components/media/GalleryViewer.tsx`
- [ ] 创建 `apps/web/src/app/routes/public/spin-view/SpinViewPage.tsx`
- [ ] 创建 `apps/web/src/app/routes/public/gallery-view/GalleryViewPage.tsx`
- [ ] `SpinViewer` 支持按 `sortOrder` 切换图片
- [ ] `SpinViewer` 显示当前帧数和总帧数
- [ ] `SpinViewer` 在帧数不足时给出警告
- [ ] `GalleryViewer` 支持主图切换

完成标准：
- 两种查看器的状态和逻辑完全分开
- 页面可以从媒体组数据中正确取出图片列表

## 任务 9：后台壳层
**目标：** 先建立后台信息架构与 CRUD 入口，不急于一次做完真实表单逻辑。

- [ ] 创建 `apps/web/src/components/admin/AdminSidebar.tsx`
- [ ] 创建 `apps/web/src/app/routes/admin/dashboard/AdminDashboardPage.tsx`
- [ ] 创建 `apps/web/src/app/routes/admin/projects/AdminProjectsPage.tsx`
- [ ] 创建 `apps/web/src/app/routes/admin/locations/AdminLocationsPage.tsx`
- [ ] 创建 `apps/web/src/app/routes/admin/media/AdminMediaPage.tsx`
- [ ] 创建 `apps/web/src/app/routes/admin/routes/AdminRoutesPage.tsx`
- [ ] 创建 `apps/web/src/app/routes/admin/login/AdminLoginPage.tsx`
- [ ] 仪表盘显示项目、地点、媒体组、轨迹四类数量
- [ ] 各后台页面文本中明确自身要管理的字段方向

完成标准：
- 后台导航完整
- 后台页面边界不混乱
- 每个页面都能让下一个模型清楚知道它负责什么

## 任务 10：补充表单与排序接口占位
**目标：** 为下一轮真实 CRUD 做结构准备。

- [ ] 在后台文档或组件注释中明确项目表单字段
- [ ] 明确地点表单包含经纬度输入
- [ ] 明确媒体组页面包含图片顺序调整区域
- [ ] 明确轨迹页面包含地点顺序调整区域

完成标准：
- 即使 아직未实现真实上传，页面结构也已经为上传和排序预留位置

## 任务 11：基础验证
**目标：** 在声称“可继续开发”之前，至少完成最小校验。

- [ ] 安装依赖
- [ ] 运行开发服务器
- [ ] 检查是否存在明显导入错误
- [ ] 检查主要页面是否都可访问
- [ ] 记录尚未完成的真实功能

完成标准：
- 不把“仅写了文件”误称为“已可完整运行”
- 交接说明中明确哪些是壳层，哪些已具备基本交互

## 最终交接说明必须包含
- 已创建的关键文件清单
- 已固定的数据模型
- 已固定的页面职责
- 下一步最合理的实现顺序
- 尚未完成的真实能力，例如依赖安装、Mapbox 接入、上传、持久化、校验
