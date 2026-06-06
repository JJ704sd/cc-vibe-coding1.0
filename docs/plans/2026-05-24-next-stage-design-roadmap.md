# Trace Scope Platform 下一阶段设计规划 - 2026-05-24

## 规划背景

本规划最初基于 `codex/D` 分支状态制定。当前 `main` 已同步到：

```text
b262f8ab Merge pull request #8 from JJ704sd/codex/close-public-uploads
```

当前项目已经具备 React/Vite 前端、Fastify/MySQL 后端、公开 API、后台管理页面、上传模块、地图关系视图、画廊首页和基础部署材料。近期已完成画廊首页地图平铺方向调整、Vite chunk 拆分优化、README 整理、中文 review 文档、后台 API 服务端鉴权，以及 `/uploads/*` 直接公开访问收敛。

下一阶段不建议继续优先堆叠视觉效果。当前最大风险已经从“服务端鉴权和上传公开访问”推进到“生产配置传递、上传目录语义、内容发布链路和公开数据语义”。设计顺序应继续先保证“可安全部署、可稳定发布”，再深化前台空间叙事体验。

## 2026-05-26 进度更新

已完成：

1. 阶段一任务 1：后台 CRUD 和上传 API 服务端 admin session 鉴权。
2. 阶段一任务 2：关闭 `/uploads/*` 直接静态公开访问，公开文件统一走受控接口。

当前仍需优先处理：

1. 阶段一任务 3：生产配置完整传递到 `buildServer` 并补测试。
2. 阶段一任务 4：统一 `STORAGE_DIR` / `UPLOAD_ROOT` 上传目录语义。
3. 阶段二任务 1：修正公开项目封面 URL 语义。
4. 阶段二任务 2：给路线地点替换补事务保护。

## 设计目标

1. 建立正式部署前的最低安全边界。
2. 打通后台内容编辑到前台公开展示的发布闭环。
3. 保持画廊首页当前 C 方向：地图在下，图片像星点分布在地图上方。
4. 将后续工作拆成可独立验证、可分阶段提交的小块。
5. 避免在核心数据模型未稳定前新增顶层实体或扩大交互复杂度。

## 设计原则

- **安全优先**：后台写接口和上传接口必须由服务端鉴权保护，不能依赖前端路由守卫。
- **公开访问收敛**：公开文件只通过受控 API 输出，避免 `/uploads/*` 绕过发布状态检查。
- **数据语义清楚**：前端可渲染字段必须是 URL；file id 和 image URL 不混用。
- **阶段可验收**：每个阶段都应有明确测试命令、验收标准和可提交边界。
- **视觉暂缓扩张**：画廊首页保持现有方向，后续只在数据链路稳定后做体验深化。

## 阶段一：安全发布底座

### 目标

让后台管理和上传能力具备正式部署前的基本安全边界。

### 范围

重点处理：

- 已完成：后台 CRUD 接口服务端鉴权。
- 已完成：上传接口服务端鉴权。
- 已完成：`/uploads/*` 静态公开路径收敛。
- 待处理：生产配置从环境变量到 `buildServer` 的传递。
- 待处理：上传目录环境变量统一。

### 建议设计

#### 1. 后台接口鉴权（已完成）

新增共享鉴权能力，读取 `trace_scope_session` cookie，并调用现有 `authService.getSession` 校验管理员会话。

建议将后台写接口保护分成两层：

- 后台管理接口：`/api/projects`、`/api/locations`、`/api/media-sets`、`/api/media-images`、`/api/routes`、`/api/uploads`
- 公开接口：`/api/public/*`、`/health`、`/health/live`、`/health/ready`

短期可先在现有路径上加 `preHandler`，避免一次性迁移所有前端 API 地址。中期再考虑把后台接口统一迁移到 `/api/admin/*`。

关键文件：

- `apps/api/src/app/buildServer.ts`
- `apps/api/src/modules/auth/routes.ts`
- `apps/api/src/modules/*/routes.ts`
- `apps/api/src/app/buildServer.test.ts`

验收标准：

- 未登录访问后台写接口返回 `401`。
- 登录后访问后台写接口返回原有业务结果。
- 公开接口不受后台 session 影响。
- 前端后台页面仍能通过 `credentials: include` 正常调用 API。

当前状态：

- 已通过 `createRequireAdminSession` / `requireAdminSession` 在服务端保护后台 CRUD 和上传 API。
- 已补充未登录、有效 session、`/api/admin/session` 公开查询的 API 测试。

#### 2. 上传公开访问收敛（已完成）

当前已有受控公开文件路径：

```text
GET /api/public/uploads/:fileId
```

后续应移除或限制直接静态挂载：

```text
/uploads/*
```

公开文件访问统一由 `PublicService.isFileReachableFromPublishedContent` 判断。后台预览如需访问未发布文件，应新增带管理员 session 的预览接口，而不是重新开放静态目录。

关键文件：

- `apps/api/src/app/buildServer.ts`
- `apps/api/src/modules/public/routes.ts`
- `apps/api/src/modules/uploads/routes.ts`
- `apps/api/src/modules/public/service.ts`

验收标准：

- 未发布或孤立上传文件不能通过公开路径访问。
- 已发布内容引用的文件可通过 `/api/public/uploads/:fileId` 访问。
- `/uploads/*` 不再直接暴露完整存储目录。

当前状态：

- `apps/api/src/app/buildServer.ts` 已移除 `/uploads/*` 静态挂载。
- `@fastify/static` 已从 API 依赖中移除。
- 已补充测试确认 storage 目录文件不能通过 `/uploads/<file>` 直接读取。

#### 3. 生产配置传递

`config.ts` 已定义 CORS、rate limit、body limit、trust proxy、log level、secure cookie 等字段，但 `main.ts` 当前只传递了部分配置。

设计上应让 `main.ts` 成为唯一生产启动入口，并将运行时配置完整传入 `buildServer`：

- `cookieSecure`
- `logLevel`
- `bodyLimitBytes`
- `trustProxy`
- `corsOrigins`
- `rateLimitMax`
- `rateLimitWindowMs`

关键文件：

- `apps/api/src/main.ts`
- `apps/api/src/app/config.ts`
- `apps/api/src/app/buildServer.ts`
- `apps/api/src/app/buildServer.test.ts`
- `apps/api/src/app/config.test.ts`

验收标准：

- 配置解析测试覆盖所有生产字段。
- `buildServer` 测试能证明 CORS 和 rate limit 生效。
- 生产启动路径不再遗漏已定义配置。

#### 4. 上传目录语义统一

当前存在 `STORAGE_DIR` 与 `UPLOAD_ROOT` 两套语义。下一阶段应选择一个运行时上传目录来源，并让 API、备份脚本和部署文档一致。

建议：

- API 运行时统一使用 `STORAGE_DIR`。
- 若必须兼容 `UPLOAD_ROOT`，只在配置层做别名映射。
- README、运维文档、备份脚本统一说明同一个目录变量。

关键文件：

- `apps/api/src/app/config.ts`
- `apps/api/.env.example`
- `apps/api/.env.production.example`
- `docs/operations/backup-and-recovery.md`
- `scripts/ops/*.ps1`

验收标准：

- 配置测试证明变量优先级和最终目录一致。
- 备份脚本读取的目录与 API 写入目录一致。

## 阶段二：内容发布闭环

### 目标

让后台能稳定支撑“项目、地点、路线、媒体、发布状态”的内容生产流程。

### 范围

重点处理：

- 公开项目封面 URL 语义。
- 媒体组封面和图片 URL 映射。
- 后台表单保存、排序、发布状态。
- 路线地点替换事务。
- 前台公开页面的数据一致性。

### 建议设计

#### 1. 封面字段拆分

公开 API 不应让前端把裸 file id 当图片地址使用。

建议输出：

```ts
coverFileId: string | null
coverImageUrl: string | null
```

短期为了兼容也可以保留 `coverImage`，但应明确它的语义。如果继续保留 `coverImage`，建议让它返回可渲染 URL，而不是 file id。

关键文件：

- `apps/api/src/modules/public/service.ts`
- `apps/api/src/modules/public/types.ts`
- `apps/web/src/features/projects/api/*`
- `apps/web/src/types/domain.ts`
- `apps/web/src/components/project/ProjectCard.tsx`

验收标准：

- 项目卡片封面不会 broken image。
- 项目详情页、媒体组入口和地图关系数据使用一致的图片 URL。

#### 2. 路线地点替换事务

`replaceRouteLocations` 当前是先删除再插入。后续应使用数据库事务包住删除和插入，避免中途失败导致路线地点被清空或半写入。

关键文件：

- `apps/api/src/modules/routes/repository.ts`
- `apps/api/src/modules/routes/service.ts`
- `apps/api/src/modules/routes/*.test.ts`

验收标准：

- 插入失败时旧路线地点仍保留。
- 成功时新路线地点顺序完整写入。

#### 3. 后台发布流程

后台需要让编辑者明确区分草稿、已发布、未完整内容。

建议补齐：

- 项目发布状态提示。
- 媒体组是否有图片的校验提示。
- 地点是否有经纬度的校验提示。
- 路线是否有关联地点的校验提示。
- 发布前检查列表。

关键文件：

- `apps/web/src/app/routes/admin/projects/*`
- `apps/web/src/app/routes/admin/locations/*`
- `apps/web/src/app/routes/admin/media/*`
- `apps/web/src/app/routes/admin/routes/*`
- `apps/web/src/services/api/adminApi.ts`

验收标准：

- 编辑者能看出内容是否足够公开展示。
- 发布状态改变后，公开 API 和前台页面结果一致。

## 阶段三：前台空间叙事体验深化

### 目标

在安全和内容链路稳定后，继续打磨用户看到的空间叙事体验。

### 范围

重点处理：

- 画廊首页平铺地图细节。
- 地图模式、图库模式、项目详情页之间的跳转。
- 图片星点与地点、路线、媒体组之间的关系表达。
- 移动端布局和加载状态。

### 建议设计

#### 1. 画廊首页保持 C 方向

当前方向已经明确：

- 地图在下。
- 图片像星点分布在地图上方。
- 点击后进入聚焦中国地图状态。
- 避免明显 3D 舞台、地台或过重卡片感。

后续只做细节优化：

- 减少残留卡片边框感。
- 提升地图占屏比例。
- 优化星点密度和悬停反馈。
- 增加图片加载失败时的占位策略。

关键文件：

- `apps/web/src/components/gallery/GalleryExperience.tsx`
- `apps/web/src/components/gallery/GalleryExperience.test.tsx`
- `apps/web/src/features/gallery/useCurvedMapProjection.ts`
- `apps/web/src/app/routes/gallery/GalleryHome.tsx`

验收标准：

- 首页默认态能一眼看出是“地图平铺 + 图片星点”。
- 点击地图后仍能进入具体中国地图聚焦状态。
- 移动端不出现文字和控件重叠。

#### 2. 地图、项目、媒体之间的导航关系

前台应减少孤立页面感，让用户能从首页、地图、项目、媒体互相进入。

建议：

- 地图星点点击打开图片，同时可跳转到对应项目或地点。
- 项目详情页展示关联地点、路线和媒体组。
- 媒体查看页保留返回项目和返回地图上下文。

关键文件：

- `apps/web/src/app/routes/public/project-detail/ProjectDetailPage.tsx`
- `apps/web/src/app/routes/public/map/MapPage.tsx`
- `apps/web/src/app/routes/public/gallery-view/GalleryViewPage.tsx`
- `apps/web/src/app/routes/public/spin-view/SpinViewPage.tsx`

验收标准：

- 用户可以从任一公开页面回到相关项目或地图上下文。
- 媒体不再像孤立资源，而是属于明确地点或项目。

#### 3. 加载和空状态

前台需要将 API 失败、无发布内容、无地图 token、图片加载失败等状态表达清楚。

建议：

- 空项目：显示简洁空状态。
- 地图 token 缺失：保留布局，提示地图底图不可用。
- 媒体加载失败：局部跳过，不阻断整个页面。
- 图片 URL 失效：显示占位缩略块。

关键文件：

- `apps/web/src/features/map/api/useMapRelationshipData.ts`
- `apps/web/src/app/routes/gallery/GalleryHome.tsx`
- `apps/web/src/components/gallery/*`
- `apps/web/src/components/project/*`

验收标准：

- API 失败时页面不白屏。
- 无内容时用户能理解当前状态。
- 部分图片失败不影响其他图片展示。

## 推荐执行顺序

1. [x] 阶段一任务 1：后台写接口鉴权。
2. [x] 阶段一任务 2：上传公开访问收敛。
3. [x] 阶段一任务 3：生产配置传递。
4. [x] 阶段一任务 4：上传目录语义统一。
5. [x] 阶段二任务 1：封面 URL 语义修正。
6. [x] 阶段二任务 2：路线地点事务。
7. [x] 阶段二任务 3：后台发布流程。
8. [x] 阶段三任务 1：画廊首页细节优化。
9. [x] 阶段三任务 2：公开页面导航关系。
10. [x] 阶段三任务 3：加载和空状态。

## 阶段验收命令

后端相关阶段至少运行：

```powershell
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\api" test
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\api" run build
```

前端相关阶段至少运行：

```powershell
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\web" test
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\web" run build
```

涉及前台视觉和交互时，还应启动项目并在浏览器检查：

```powershell
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\api" run dev
npm --prefix "D:\VS vibe coding files\trace-scope-platform\apps\web" run dev -- --host 127.0.0.1 --port 62435
```

约定前端查看地址：

```text
http://127.0.0.1:62435/
```

不要使用 `http://127.0.0.1:5173/` 判断本项目效果，因为该端口之前对应过其他 GUI 项目。

## 当前不建议做的事

- 不建议继续大幅重做首页视觉，除非先完成生产配置、上传目录语义和内容发布链路收口。
- 不建议新增新的顶层核心实体。
- 不建议把 `spin360` 和 `gallery` 合并成一个查看器。
- 不建议直接公开上传目录作为图片访问方案。
- 不建议重新打开 `/uploads/*` 作为公开图片访问方案。

## 下一步建议

下一步应继续推进“阶段一：安全发布底座”的剩余两项，并开始为内容发布闭环做最小修正。建议下一批只覆盖：

1. 生产配置传递测试和实现：确认 `corsOrigins`、`trustProxy`、`logLevel`、`bodyLimitBytes`、`rateLimitMax`、`rateLimitWindowMs` 等配置进入 `buildServer`。
2. 上传目录语义统一：明确 `STORAGE_DIR` / `UPLOAD_ROOT` 的最终关系，并同步 API 配置、示例环境变量、备份脚本和运维文档。
3. 公开项目封面 URL 语义：避免前端把 file id 当成可渲染图片 URL。
4. 路线地点替换事务：避免删除旧关联后插入失败导致路线地点被清空。

这一批完成后，再进入后台发布流程完善和前台体验深化。
