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

最新曲面场景补丁已经通过聚焦测试和构建，但会话在最新截图复验前被中断。视觉复验仍是主要待办。

## 相关文件

- `apps/web/src/app/router.tsx`
- `apps/web/src/app/router.test.ts`
- `apps/web/src/app/routes/gallery/GalleryHome.tsx`
- `apps/web/src/app/routes/gallery/GalleryHome.test.tsx`
- `apps/web/src/components/gallery/GalleryExperience.tsx`
- `apps/web/src/components/gallery/GalleryExperience.test.tsx`
- `apps/web/src/styles/index.css`
