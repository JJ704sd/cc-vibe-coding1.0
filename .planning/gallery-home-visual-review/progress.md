# Gallery 首页视觉复查进度

## 2026-05-25

- 调查前端界面为什么没有达到此前描述的沉浸式 gallery 效果。
- 发现 `/` 仍嵌套在 `PublicLayout` 下，导致固定公共导航栏和顶部 padding 影响首页。
- 新增 `src/app/router.test.ts`，锁住 gallery 首页独立路由行为。
- 更新 `GalleryHome` 源码级测试，锁住 `LoadingScreen` 挂载行为。
- 修改 `router.tsx`：`/` 直接渲染 `HomePage`，其他公开路由继续放在 `PublicLayout` 下。
- 在 `GalleryHome` 中挂载 `LoadingScreen`。
- 更新 Google Fonts 导入，补齐 `Cormorant Garamond` 和 `Work Sans`。
- 运行聚焦路由/首页测试：13 项通过。
- 运行生产构建：构建通过。
- 在工具沙箱外启动 Vite 并截图。
- 截图显示公共布局 chrome 已消失，但 `GalleryExperience` 仍像平面 MapLibre 地图面板。
- 复查 `GalleryExperience` 和对应测试，发现测试明确断言 `flat-paper`，与曲面 gallery 设计规格相反。
- 重写 `GalleryExperience.test.tsx` 的相关断言：
  - 禁止 gallery 场景依赖 DOM MapLibre / `flat-paper`；
  - 要求曲面地图 mesh 可见；
  - 要求媒体投影使用中国展示边界。
- 更新 `GalleryExperience.tsx`：
  - 移除 gallery 专用 `maplibre-gl` 路径；
  - 移除 DOM 地图面板和聚焦控制；
  - 设置 `mapMesh.visible = true`；
  - 使用 `pivot.add(mapMesh)` 将曲面地图加入旋转场景；
  - 将媒体投影切回中国展示边界。
- 运行 `GalleryExperience.test.tsx`：7 项通过。
- 运行聚焦测试集合：
  - `src/app/router.test.ts`
  - `src/app/routes/gallery/GalleryHome.test.tsx`
  - `src/components/gallery/GalleryExperience.test.tsx`
  结果：20 项通过。
- 运行 `npm run build`：Vite 生产构建通过。
- 用户在最终截图复验前中断。
- 已停止已知的 Vite 预览 PowerShell 进程 `52964`。

## 2026-05-25 复验续跑

- 在沙箱外启动前端 Vite：`http://127.0.0.1:62435/`。
- 首次只启动前端时，`/api/public/map-relationship` 返回 404，首页无法加载真实关系数据。
- 启动 API 后，`/health/live` 返回 200，`/api/public/map-relationship` 返回 200。
- 重新截取 `1440x900` 首页截图：`D:\Trae_develop_code\trace-scope-gallery-home-1440x900.png`。
- 观察结果：
  - loader 已退出；
  - 页面非空；
  - 公共 `PublicLayout` chrome 未出现；
  - 不再显示平面 DOM MapLibre 面板；
  - 可见 Three.js 星空背景和曲面地图 mesh。
- 当前本地 API 数据中 15 个媒体组的 `images` 均为 0，因此本轮无法验证媒体卡片可见/可点击。
- 重新运行聚焦测试集合：
  - `src/app/router.test.ts`
  - `src/app/routes/gallery/GalleryHome.test.tsx`
  - `src/components/gallery/GalleryExperience.test.tsx`
  结果：20 项通过。
- 运行完整 web 测试套件：34 个测试文件、109 项通过。

## 待办

已完成。提交前检查当前工作区差异即可。

## 2026-05-25 媒体卡片复验完成

- 重新启动 API：`http://127.0.0.1:4000/health/live` 返回 200。
- 重新启动 Vite：`http://127.0.0.1:5173/` 返回 200。
- 确认 `GET /api/public/media-sets/31cb4f65-d24c-4c51-95b5-a447cda5f5a8` 返回 1 张图片，URL 为 `/api/public/uploads/dff7df3b-9e77-4806-a50c-4cb11f439bc2`。
- 使用 headless Edge 打开首页，等待 loader 退出后截图：`D:\Trae_develop_code\trace-scope-gallery-home-card-current-1440x900.png`。
- 截图观察结果：页面非空，公共 `PublicLayout` chrome 未出现，仍是 Three.js 曲面场景，媒体图片卡片可见。
- 点击卡片坐标 `(520, 365)` 后，全屏预览打开；点击后截图：`D:\Trae_develop_code\trace-scope-gallery-home-card-click-current-1440x900.png`。
- DOM 复验结果：预览层存在，页面包含 1 个图片元素，`src` 指向公开上传图片，`alt` 为 `gallery image 1`。
- 运行聚焦测试集合：
  - `src/app/router.test.ts`
  - `src/app/routes/gallery/GalleryHome.test.tsx`
  - `src/components/gallery/GalleryExperience.test.tsx`
  结果：3 个测试文件、20 项通过。
- 运行完整 web 测试套件：35 个测试文件、110 项通过。
- 运行 `npm run build`：Vite 生产构建通过。
