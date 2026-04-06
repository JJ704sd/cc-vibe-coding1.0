# Trace Scope Platform 设计文档（弱模型执行版）

## 1. 文档目的
本设计文档的目标不是介绍概念，而是为后续实现提供稳定、明确、可拆分的约束。

后续实现模型必须遵守以下原则：
- 不擅自新增核心实体
- 不擅自改字段名
- 不把多个职责混入一个组件
- 不为了“更炫”破坏既定信息结构
- 不跳过状态处理和异常处理

本项目的第一阶段重点是“结构正确、职责清楚、可继续扩展”，不是一次性做完整产品。

## 2. 产品定位
Trace Scope Platform 是一个双核心的空间叙事网站。

两个核心能力同等重要：
1. 基于多张有序图片的 360 度序列查看
2. 基于地图点位和轨迹的空间叙事展示

该系统分为两部分：
- 前台：用于展示项目、地点、轨迹和媒体内容
- 后台：用于管理项目、地点、媒体组、图片和轨迹

## 3. 第一阶段范围
### 3.1 必须实现
- 前台首页
- 项目列表页
- 项目详情页
- 地图探索页
- `spin360` 查看页
- `gallery` 查看页
- 后台仪表盘
- 项目 CRUD 壳层
- 地点 CRUD 壳层
- 媒体组 CRUD 壳层
- 轨迹 CRUD 壳层
- 单管理员登录页壳层

### 3.2 第一阶段支持的媒体类型
#### `spin360`
含义：
- 一组按顺序排列的图片
- 用于模拟旋转查看
- 用户可以按顺序切帧查看

必须满足：
- 图片有明确顺序
- 图片数量可被读取
- 支持低帧数警告

#### `gallery`
含义：
- 一组地点相关图片
- 用于图集式浏览
- 不要求形成闭环旋转

必须满足：
- 有主图
- 可切换缩略图
- 保留地点和项目上下文

### 3.3 第一阶段明确不做
- AI 自动三维重建
- 真实三维模型生成
- 多用户权限系统
- 社交互动
- 实时协同编辑
- GIS 分析
- 自动地理编码

## 4. 核心数据关系
核心数据链路必须固定为：

`Project -> Location -> MediaSet / Route`

解释：
- 一个 `Project` 是顶层叙事容器
- 一个 `Location` 必须属于一个 `Project`
- 一个 `MediaSet` 必须属于一个 `Project`，并且可以绑定一个主 `Location`
- 一个 `Route` 必须属于一个 `Project`，其轨迹由多个 `Location` 顺序组成

弱模型禁止做以下事情：
- 让 `MediaImage` 直接脱离 `MediaSet` 独立挂到页面
- 让 `Route` 直接存复杂几何对象作为第一阶段主数据
- 让 `Location` 脱离 `Project` 独立存在

## 5. 核心实体定义
### 5.1 Project
字段：
- `id`
- `title`
- `slug`
- `summary`
- `description`
- `coverImage`
- `tags`
- `status`
- `locationIds`
- `mediaSetIds`
- `routeIds`
- `createdAt`
- `updatedAt`

约束：
- `id` 必须唯一
- `slug` 用于 URL 或可读标识
- `status` 第一阶段仅允许 `draft` 或 `published`
- 首页和项目列表页默认只读取 `published` 项目
- `locationIds`、`mediaSetIds`、`routeIds` 只存 ID，不内嵌对象

### 5.2 Location
字段：
- `id`
- `projectId`
- `name`
- `slug`
- `description`
- `latitude`
- `longitude`
- `addressText`
- `mediaSetIds`
- `visitOrder`
- `createdAt`
- `updatedAt`

约束：
- `projectId` 必填
- `latitude`、`longitude` 必须显式录入，不允许推测
- 一个地点可以绑定多个媒体组
- `visitOrder` 只作为辅助字段，真正轨迹顺序以 `Route.locationIds` 为准

### 5.3 MediaSet
字段：
- `id`
- `projectId`
- `locationId`
- `type`
- `title`
- `description`
- `coverImage`
- `imageIds`
- `isFeatured`
- `createdAt`
- `updatedAt`

允许的 `type`：
- `spin360`
- `gallery`

约束：
- 必须属于一个项目
- 最多只绑定一个主地点
- `imageIds` 只保存图片 ID，不内嵌图片对象
- `spin360` 和 `gallery` 在页面和组件上必须分别处理

### 5.4 MediaImage
字段：
- `id`
- `mediaSetId`
- `url`
- `thumbnailUrl`
- `altText`
- `caption`
- `sortOrder`
- `createdAt`

约束：
- 一张图片必须属于一个 `MediaSet`
- `sortOrder` 第一阶段必须可读、可排序、可编辑
- `spin360` 的播放顺序必须严格依赖 `sortOrder`

### 5.5 Route
字段：
- `id`
- `projectId`
- `name`
- `description`
- `locationIds`
- `lineStyle`
- `color`
- `isFeatured`
- `createdAt`
- `updatedAt`

约束：
- `locationIds` 必须按顺序排列
- 轨迹折线由地点经纬度计算得到
- 第一阶段不要求存储复杂 GeoJSON 主体结构

### 5.6 AdminUser
字段：
- `id`
- `username`
- `passwordHash`
- `role`

约束：
- 第一阶段只考虑单管理员
- 不实现复杂权限继承关系

## 6. 前台页面定义
### 6.1 `/`
目标：
- 首屏必须同时让用户感知地图能力和媒体能力

必须包含：
- 品牌标题
- 精选项目入口
- 地图轨迹视觉区
- 媒体展示视觉区
- 已发布项目入口

禁止：
- 首屏只有一张大图
- 首屏只表现地图或只表现图片其中之一

### 6.2 `/projects`
目标：
- 统一浏览已发布项目

必须包含：
- 项目卡片列表
- 项目封面
- 项目标题
- 项目摘要

读取规则：
- 默认只显示 `published`

### 6.3 `/projects/:projectId`
目标：
- 作为单个项目的主叙事页面

必须包含：
- 项目简介
- 地图展示区
- 地点列表
- 媒体组列表
- 当前选中地点详情区

联动要求：
- 点击地点列表项后，更新选中地点详情
- 后续接入地图时，点位点击也必须能同步更新详情

### 6.4 `/map`
目标：
- 集中展示点位与轨迹

必须包含：
- 地图主区域
- 点位信息表达
- 轨迹信息表达

第一阶段允许：
- 先用占位壳层表达结构
- 在完成 Token 后再接入 Mapbox

### 6.5 `/spin/:mediaSetId`
目标：
- 展示 `spin360` 类型媒体组

必须包含：
- 当前帧图像
- 前一帧按钮
- 后一帧按钮
- 帧计数
- 低帧数提示

状态要求：
- 无图片时有空状态
- 图片不足时有提示状态
- 正常情况下按序切换

### 6.6 `/gallery/:mediaSetId`
目标：
- 展示 `gallery` 类型媒体组

必须包含：
- 主图
- 缩略入口或图片切换入口
- 当前图说明

状态要求：
- 无图时有空状态
- 可切换当前图

## 7. 后台页面定义
### 7.1 `/admin`
必须包含：
- 项目数
- 地点数
- 媒体组数
- 轨迹数

### 7.2 `/admin/projects`
必须支持：
- 项目列表
- 项目创建入口
- 项目编辑入口
- 项目删除入口

### 7.3 `/admin/locations`
必须支持：
- 地点列表
- 地点创建入口
- 显式经纬度录入
- 绑定所属项目

### 7.4 `/admin/media`
必须支持：
- 媒体组列表
- 选择媒体组类型
- 图片上传入口
- 图片顺序调整入口
- 绑定项目和地点

### 7.5 `/admin/routes`
必须支持：
- 轨迹列表
- 按顺序选择地点
- 调整地点顺序

### 7.6 `/admin/login`
必须包含：
- 用户名输入
- 密码输入
- 登录按钮

第一阶段允许：
- 先作为静态壳层页面存在

## 8. 组件边界
### 8.1 必须独立存在的组件
- `SiteHeader`
- `PublicLayout`
- `HeroEntryPanel`
- `ProjectCard`
- `LocationDetailPanel`
- `MediaSetCard`
- `MapView`
- `LocationMarkerLayer`
- `RoutePolylineLayer`
- `SpinViewer`
- `GalleryViewer`
- `AdminSidebar`

### 8.2 组件职责说明
#### `MapView`
只负责：
- 承载地图渲染区域
- 接收地点和轨迹数据

不负责：
- 决定项目业务逻辑
- 决定路由跳转

#### `SpinViewer`
只负责：
- 图片按顺序显示
- 帧切换
- 低帧数提示

不负责：
- 获取项目数据
- 处理地图联动

#### `GalleryViewer`
只负责：
- 主图切换
- 图集浏览

不负责：
- 管理旋转逻辑

## 9. 技术与结构约束
后续实现必须遵守：
- 路由文件只做页面组合，不写复杂业务逻辑
- 共享类型集中在 `src/types/domain.ts`
- 示例数据集中在 `src/services/api/mock-data.ts`
- 地图逻辑不直接散落在多个页面中
- `spin360` 和 `gallery` 不共享一个主查看器组件

## 10. 状态处理要求
第一阶段每类页面至少考虑以下状态：
- 加载前占位状态
- 空数据状态
- 正常数据状态
- 数据不足提示状态（适用于 `spin360`）

后台至少考虑：
- 表单默认状态
- 提交中状态
- 删除确认状态

## 11. 验收标准
### 11.1 前台
- 首页首屏能同时看出地图与媒体双核心能力
- 项目列表页能展示项目卡片
- 项目详情页能展示项目、地点和媒体组结构
- 地图页能承载点位和轨迹表达
- `spin360` 页面能按顺序切图并显示帧数
- `gallery` 页面能切换主图

### 11.2 后台
- 仪表盘能显示统计卡片
- 项目、地点、媒体、轨迹页面都已建立
- 后台页面的字段方向与核心实体一致

### 11.3 架构
- 组件职责没有混乱重叠
- 页面没有重复定义类型
- 路由层和组件层边界清晰

## 12. 实现优先级
后续实现顺序必须优先采用：
1. 工具链与路由
2. 共享类型与示例数据
3. 前台基础页面
4. 地图占位模块
5. 媒体查看模块
6. 后台壳层
7. 再逐步补真实交互和持久化
