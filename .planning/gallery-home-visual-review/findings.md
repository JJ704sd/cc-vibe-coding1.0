# Gallery 首页视觉复查发现

## 发现

### 公共布局泄漏到首页

`apps/web/src/app/router.tsx` 之前把 gallery 首页作为 `PublicLayout` 的 index 子路由渲染。结果是公共固定导航栏和 `main` 的顶部 padding 仍然影响 `/`，这和沉浸式首页目标冲突。

处理：`/` 现在是独立路由；其他公开页面仍使用 `PublicLayout`。

### Loader 已实现但未挂载

`apps/web/src/components/gallery/LoadingScreen.tsx` 和相关 CSS 已存在，但 `GalleryHome` 没有导入或渲染它。

处理：`GalleryHome` 现在维护 `showLoadingScreen` 状态，并在 `LoadingScreen` 的 `onComplete` 触发前显示加载层。

### 字体导入与组件使用不一致

gallery 组件中使用了 `Cormorant Garamond` 和 `Work Sans`，但 `index.css` 原先没有导入这两个字体族。

处理：`index.css` 已补充这两个字体族，同时保留原有字体。

### 截图暴露了更深层的 GalleryExperience 偏差

修复布局后，浏览器截图显示首页仍是大面积平面卫星地图面板。公共导航栏确实消失了，但视觉仍不符合曲面 Three.js gallery 的预期。

根因：`GalleryExperience` 仍渲染 DOM MapLibre 面板，且测试里明确断言 `data-layout="flat-paper"`。Three.js 曲面地图 mesh 虽然存在，但只有 MapLibre 出错时才显示。

处理：测试已改为拒绝 MapLibre / flat-paper 路径；组件现在默认渲染曲面 mesh，并把它加入旋转 pivot。

## 剩余风险

最新曲面场景补丁已经通过聚焦测试、完整 web 测试和构建；浏览器复验也确认媒体卡片可见且可点击。

### 本地联调数据发布图片已确认

复验续跑时，API 已正常启动，`/api/public/map-relationship` 返回 200，但当前本地数据里的 15 个媒体组 `images` 均为 0。首页因此能验证 loader、独立路由、Three.js 曲面地图和非 MapLibre 路径，但不能验证媒体卡片可见或点击打开图片。

修正：后续复查发现 `loc-001` 关联的 gallery 媒体组 `31cb4f65-d24c-4c51-95b5-a447cda5f5a8` 已有 `img-001`，直接访问 API `http://127.0.0.1:4000/api/public/media-sets/31cb4f65-d24c-4c51-95b5-a447cda5f5a8` 可以返回图片 URL `/api/public/uploads/dff7df3b-9e77-4806-a50c-4cb11f439bc2`。

复验结果：`D:\Trae_develop_code\trace-scope-gallery-home-card-current-1440x900.png` 中媒体卡片可见；点击卡片坐标 `(520, 365)` 后打开全屏预览，截图为 `D:\Trae_develop_code\trace-scope-gallery-home-card-click-current-1440x900.png`。

### Vite 代理目标不能使用 localhost

在当前 Windows 环境中，`http://127.0.0.1:4000` 能访问 Trace Scope API，但 `http://localhost:4000` 返回 404。`apps/web/vite.config.ts` 原先将 `/api` 代理到 `http://localhost:4000`，导致前端通过 Vite 访问 `/api/public/media-sets/...` 返回 404。已新增 `src/app/viteProxyConfig.test.ts` 锁定代理目标为 `http://127.0.0.1:4000`，并将 `vite.config.ts` 改为 IPv4 loopback。测试先红后绿。

### 用户提供的验证图片尚未落盘

用户在对话中提供了蓝底角色图，可作为下一轮视觉验证素材。但该附件当前没有出现在本地文件列表中，不能直接被 API 上传。若必须使用这张具体图片，下一轮需要先拿到本地文件路径或将附件保存为本地文件。

## 相关文件

- `apps/web/src/app/router.tsx`
- `apps/web/src/app/router.test.ts`
- `apps/web/src/app/routes/gallery/GalleryHome.tsx`
- `apps/web/src/app/routes/gallery/GalleryHome.test.tsx`
- `apps/web/src/components/gallery/GalleryExperience.tsx`
- `apps/web/src/components/gallery/GalleryExperience.test.tsx`
- `apps/web/src/styles/index.css`
