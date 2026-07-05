# Gallery 首页视觉复查计划

## 目标

让 `/` gallery 首页重新对齐预期的沉浸式画廊效果；如果当前会话被中断，留下可以直接恢复的交接记录。

## 当前状态

- [x] 确认首页仍被 `PublicLayout` 包裹，导致公共导航栏覆盖沉浸式页面。
- [x] 将 `/` 拆成独立 gallery 路由，同时保留 `/projects`、`/map`、`/spin/:mediaSetId`、`/gallery/:mediaSetId` 继续使用 `PublicLayout`。
- [x] 在 `GalleryHome` 中挂载 `LoadingScreen`，用于首次进入页面的加载动画。
- [x] 补齐 gallery 组件实际使用的字体导入。
- [x] 第一次修复后通过截图发现：公共导航栏消失了，但页面仍显示为平面 DOM MapLibre 地图面板。
- [x] 更新 `GalleryExperience` 测试：禁止 DOM MapLibre / `flat-paper` 路径，并要求 Three.js 曲面地图 mesh 可见。
- [x] 从 `GalleryExperience` 中移除 gallery 专用 DOM MapLibre 面板。
- [x] 让 Three.js 曲面地图 mesh 默认可见，并挂到旋转场景 pivot 上。
- [x] 将 gallery 媒体点位投影切回中国展示边界。
- [x] 重新运行最新 `GalleryExperience` 修改后的浏览器截图验证。
- [x] 确认 loader 结束后页面非空、是曲面 Three.js 场景，不再是平面 DOM 地图面板。
- [x] 补充有发布图片的本地数据后，再确认媒体卡片可见、可点击。
- [x] 时间允许时运行完整 web 测试套件。

## 本轮复验结果

1. 已重新启动 API 与 Vite，`GET http://127.0.0.1:4000/api/public/media-sets/31cb4f65-d24c-4c51-95b5-a447cda5f5a8` 返回 1 张公开图片：`/api/public/uploads/dff7df3b-9e77-4806-a50c-4cb11f439bc2`。
2. `1440x900` 首页截图已保存到 `D:\Trae_develop_code\trace-scope-gallery-home-card-current-1440x900.png`，截图中媒体图片卡片可见。
3. 使用 headless Edge 点击卡片坐标 `(520, 365)` 后，全屏图片预览打开；点击后截图已保存到 `D:\Trae_develop_code\trace-scope-gallery-home-card-click-current-1440x900.png`。
4. DOM 复验结果：预览层存在，页面包含 1 个图片元素，`src` 为 `http://127.0.0.1:5173/api/public/uploads/dff7df3b-9e77-4806-a50c-4cb11f439bc2`，`alt` 为 `gallery image 1`。

## 已执行的验证命令

```powershell
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\web' test -- --run src/components/gallery/GalleryExperience.test.tsx
```

观察结果：`7 passed`。

```powershell
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\web' test -- --run src/app/router.test.ts src/app/routes/gallery/GalleryHome.test.tsx src/components/gallery/GalleryExperience.test.tsx
```

观察结果：`20 passed`。

```powershell
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\web' test
```

观察结果：`35 passed` 测试文件，`110 passed` 测试项。

```powershell
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\web' run build
```

观察结果：Vite 生产构建成功。

## 下一步

Gallery 首页视觉复查已完成。提交前检查当前工作区差异即可。
