# Trace Scope — yuyuzi.art 风格 3D 沉浸式画廊

## 1. 概述

将 Trace Scope 首页重构为 yuyuzi.art 风格的 3D 沉浸式画廊体验。

**核心效果：**
- Three.js 3D 场景，背景为天空穹顶着色器（日间蓝天+云层 / 夜间星空）
- 所有已发布项目（`published`）以 3D 同心圆阵列排列在空间中
- 鼠标拖拽旋转、滚轮缩放的 OrbitControls 轨道相机
- 点击项目 → 玻璃拟态 Modal 展示详情
- 珊瑚红 Loading 动画开场

**不改动：**
- `domain.ts` 数据模型
- spin360 / gallery 查看页（仅统一视觉风格）
- 后台管理页面
- 路由结构

## 2. 技术依赖

**新增：**
- `three` — 3D 引擎
- `@types/three` — TypeScript 类型

**可移除：**
- `mapbox-gl`（用户确认舍弃地图）

## 3. Three.js 场景参数

### 3.1 天空穹顶

- 球体：半径 5000，`THREE.BackSide`，GLSL ShaderMaterial
- **日间**：天顶蓝 `#87CEEB` → 地平线 `#B0D4E8` → 暖色 `#F5E6D3`
- **夜间**：深蓝 `#0f1629` → `#1a2245` → `#22295b`，带星点闪烁
- 云层：FBM (Fractal Brownian Motion) 噪声，仅日间可见
- 自动日/夜切换：19:00–06:00 夜间模式

### 3.2 相机

```
PerspectiveCamera(55, width/height, 1, 10000)
```

- 初始位置：theta=0.4, phi=π/2, distance=2200
- OrbitControls：鼠标拖拽旋转，滚轮缩放（min=500, max=5000）

### 3.3 项目卡片 3D 排列

```
INNER_RADIUS = 1000
RING_SPACING = 800
CARDS_PER_RING = 4
MAX_ROWS = 4
VERTICAL_SPACING = 400
```

算法：
- `row = index % rows`
- `posInRow = floor(index / rows)`
- `ring = floor(posInRow / CARDS_PER_RING)`
- `posInRing = posInRow % CARDS_PER_RING`
- 半径：`INNER_RADIUS + ring * RING_SPACING`
- 每张卡片尺寸：200×133（4:3）

### 3.4 卡片动画

- 悬浮浮动：正弦波 `y += sin(time + index) * 10`
- 边框发光：`emissive` + `bloom` 后处理
- hover：透明度变化 + 边框增亮

## 4. Loading 动画

参考 yuyuzi.art：
1. 全屏珊瑚红渐变背景 `#E85A4F → #E8A87C`
2. 居中骰子图标旋转（可用 CSS `spin` 动画）
3. 淡出 → 显示 3D 场景（opacity 过渡 0.6s）

## 5. Modal 详情弹窗

- 背景：3D 场景模糊（`filter: blur(8px)` 或 CSS backdrop-filter）
- 玻璃 Modal：`backdrop-filter: blur(20px)` + 白色半透明背景
- 布局：左侧项目封面大图，右侧标题/描述/地点列表/媒体入口
- 关闭：点击遮罩层或关闭按钮

## 6. 组件清单

| 组件 | 文件 | 职责 |
|------|------|------|
| `GalleryScene` | `components/gallery/GalleryScene.tsx` | Three.js Canvas + 场景管理 |
| `SkyDome` | `components/gallery/SkyDome.tsx` | 天空穹顶着色器 |
| `ProjectCards3D` | `components/gallery/ProjectCards3D.tsx` | 同心圆阵列渲染 |
| `GalleryModal` | `components/gallery/GalleryModal.tsx` | 项目详情 Modal |
| `LoadingScreen` | `components/gallery/LoadingScreen.tsx` | Loading 动画 |
| `GalleryHome` | `routes/gallery/GalleryHome.tsx` | 首页容器（组合上述组件）|

## 7. 视觉风格

- **字体**：Playfair Display（衬线标题）+ Inter（无衬线正文）
- **颜色**：日间 `#87CEEB` 蓝白 / 夜间 `#0f1629` 深蓝
- **Modal**：Apple 风格毛玻璃
- **背景**：透明（Three.js Canvas 提供）

## 8. 实施顺序

1. 安装 `three`，移除 mapbox 依赖
2. `SkyDome` — 天空穹顶着色器
3. `LoadingScreen` — Loading 动画
4. `ProjectCards3D` — 同心圆 3D 卡片阵列
5. `OrbitControls` — 轨道相机
6. `GalleryModal` — 点击弹出详情
7. `GalleryHome` — 首页整合
8. 视觉风格统一（spin/gallery 页面）
9. 清理 Mapbox 相关代码
