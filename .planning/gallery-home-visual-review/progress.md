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

## 待办

- 最新 `GalleryExperience` 补丁后重新截图。
- 确认 loader 退出后首页非空。
- 确认 Three.js 场景中曲面地图和媒体卡片可见、可点击。
- 提交前可选运行完整 `npm test`。
