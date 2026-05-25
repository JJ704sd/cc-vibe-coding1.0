# Trace Scope Platform 代码 Review - 2026-05-24

## Review 范围

本 review 基于当前 `codex/D` 分支工作区状态，覆盖近期的画廊地图首页改版、README 更新、Web API client 恢复，以及 Vite chunk 拆包优化。

本次重点查看：

- Web 画廊首页和地图交互。
- Web 构建拆包配置。
- README 和项目交接信息。
- 当前仍影响生产可用性的后端/API 风险。

这是一份项目现状 review，不代表整个产品已经完成交付。

## 主要问题

### Critical：后台写接口仍需要服务端鉴权保护

证据：

- `apps/api/src/app/buildServer.ts` 注册了 `/api/projects`、`/api/locations`、`/api/media-sets`、`/api/media-images`、`/api/routes`、`/api/uploads` 等具备写能力的模块。
- 前端 `RequireAuth` 只保护浏览器内的后台路由访问，不能保护直接 HTTP 请求。

影响：

- 只要客户端能访问 API，就可能绕过前端路由，直接创建、修改、删除或上传数据。
- 这是正式部署前优先级最高的阻断项。

建议：

- 给所有后台写接口增加共享的 `requireAdminSession` preHandler，或统一迁移到 `/api/admin/*`。
- 补充未登录返回 `401`、登录后允许访问的接口测试。

### Critical：`/uploads/*` 静态访问可能绕过发布内容检查

证据：

- 后端已经有受控的公开文件访问路径 `/api/public/uploads/:fileId`。
- 如果同时存在直接公开的 `/uploads/*` 静态挂载，就可能绕过“文件必须属于已发布内容”的检查。

影响：

- 草稿、孤立文件、后台临时上传文件，只要 storage key 泄露就可能被外部访问。
- 这会削弱当前公开内容访问控制模型。

建议：

- 移除或限制公开 `/uploads/*` 静态挂载。
- 公开文件统一通过 `/api/public/uploads/:fileId` 输出。
- 后台预览文件如果需要单独入口，应走带 admin session 的接口。

### High：生产配置需要端到端验证

证据：

- 配置中包含 CORS origins、rate limit、body limit、trust proxy、log level、secure cookie 等生产相关字段。
- 这些字段需要验证是否确实从 `main.ts` 传入并作用于 `buildServer`。

影响：

- 环境变量看似配置了，但真实启动路径中可能没有生效。
- Caddy/反向代理部署场景下，真实客户端 IP、secure cookie、CORS 和限流行为可能与文档不一致。

建议：

- 增加集成测试或启动路径断言，覆盖 CORS、rate limit、logger、body limit、trust proxy、secure cookie 等配置。

### High：上传目录配置命名需要统一

证据：

- 代码和运维材料中存在 storage/upload-root 两套命名。
- 备份和恢复脚本必须指向运行时真实使用的上传目录。

影响：

- API 可能写入一个目录，而备份脚本读取另一个目录。
- 恢复时可能遗漏真实上传文件。

建议：

- 保留一个统一的环境变量名，优先使用部署文档和运维脚本已有的命名。
- 删除重复字段或在配置层集中映射，并补测试验证解析结果。

### Medium：公开项目封面字段应返回 URL，而不是裸 file id

证据：

- 前端项目卡片会把封面字段当作可直接渲染的图片地址。
- 媒体图片的公开映射已经使用 `/api/public/uploads/:fileId` 风格的可访问 URL。

影响：

- 接入真实上传后，如果项目封面返回的是裸 file id，前端 `<img>` 可能请求错误路径并显示 broken image。

建议：

- 公开 API 返回 `coverImageUrl`。
- 或明确拆分为 `coverFileId` 和 `coverImageUrl`，并同步更新前端类型和测试。

### Medium：路线地点替换应使用事务

证据：

- 路线地点更新逻辑是先删除旧关联，再插入新关联。

影响：

- 如果中途插入失败，路线可能被清空地点或只写入一部分地点。

建议：

- 使用单个数据库事务包住删除和插入流程。

## 本次变更 Review

### 画廊地图首页

当前画廊首页已经按用户选择的“地台式平铺地图”方向调整：

- 默认状态下，地图面板更像低角度地台。
- 媒体图片以发光星点的形式分布在地图上方。
- 点击进入地图聚焦后，地图状态会旋转/收拢，星点向中国地图区域归位。
- 星点按钮保留无障碍标签，例如 `打开地图媒体：...`，并复用现有媒体选择回调。

相关文件：

- `apps/web/src/components/gallery/GalleryExperience.tsx`
- `apps/web/src/components/gallery/GalleryExperience.test.tsx`
- `apps/web/src/features/gallery/useCurvedMapProjection.ts`

### Vite chunk 优化

Web 构建已经增加手动 vendor 拆包：

- `vendor-react`
- `vendor-three`
- `vendor-maplibre`
- `vendor`

优化效果：

- `GalleryHome` chunk 从约 560 KB 降到约 42 KB。
- 入口 `index` chunk 从约 293 KB 降到约 8.6 KB。
- `maplibre-gl` 仍是较大的单库 chunk，但已经被隔离，只在需要地图能力时加载。
- 当前构建不再出现 Vite chunk size warning。

相关文件：

- `apps/web/vite.config.ts`

### 文档和 API client

- `README.md` 已按当前前后端结构、验证结果和后续风险重新整理。
- `apps/web/src/services/api/adminApi.ts` 和 `apps/web/src/services/api/httpClient.ts` 已恢复，因为当前 Web 构建会引用它们。

## 验证记录

本次最终 Web 状态执行过：

```powershell
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\web' test
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\web' run build
```

结果：

- Web tests：33 个测试文件通过，106 个测试通过。
- Web build：通过。
- Vite chunk size warning：手动拆包后未再出现。

说明：

- 最终画廊地图和 chunk 优化阶段没有修改 API 源码，因此最后一轮没有重新运行 API tests/build。
- API 侧仍有上文列出的服务端鉴权、上传公开访问和生产配置风险。

## 当前工作区说明

分支：

- `codex/D`

远程：

- `origin https://github.com/JJ704sd/cc-vibe-coding1.0.git`

本次计划纳入提交的核心文件：

- `README.md`
- `docs/2026-05-24-code-review.md`
- `apps/web/vite.config.ts`
- `apps/web/src/components/gallery/GalleryExperience.tsx`
- `apps/web/src/components/gallery/GalleryExperience.test.tsx`
- `apps/web/src/features/gallery/useCurvedMapProjection.ts`
- `apps/web/src/app/routes/admin/media/AdminMediaPage.test.tsx`
- `apps/web/src/services/api/adminApi.ts`
- `apps/web/src/services/api/httpClient.ts`

以下未跟踪文件当前保持不提交，除非后续明确要求：

- `CLAUDE.md`
- `apps/web/.env`
- `apps/web/build.log`
- `apps/web/check_build.sh`
- `apps/web/vite-gallery-preview.log`
- `apps/web/vite-gallery.log`
- `docs/superpowers/plans/2026-04-07-gallery-reference-homepage.md`
- `docs/superpowers/plans/2026-04-08-curved-geo-gallery.md`
- `docs/superpowers/plans/2026-04-08-map-true-projection-overlay.md`
- `docs/superpowers/specs/2026-04-08-curved-geo-gallery-design.md`
- `photos/`

## 建议下一步

1. 给所有后台写接口补服务端 admin session 鉴权。
2. 关闭 `/uploads/*` 公开绕过路径，公开文件统一走受控接口。
3. 验证生产配置从环境变量到 `buildServer` 的传递。
4. 统一上传存储目录环境变量和备份目标。
5. 修正公开项目封面 URL 语义。
6. 给路线地点替换补事务保护。
