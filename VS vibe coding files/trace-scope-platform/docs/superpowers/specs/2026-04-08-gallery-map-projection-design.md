# Gallery Map Projection Design

## 1. 目标

将地图能力引入 Gallery 页面，作为底层空间参照。每张 Gallery 卡片对应一个真实地理位置，经纬度决定其在地图上的投影位置。

天空层完全保留不动，地图作为新增层叠加在天空下方。

---

## 2. 分层结构

```
Layer 0（最底）：MapLibre 地图底板
  - 透明渐变融入天空色调
  - 静止（不做平移/缩放联动），仅作视觉参照
Layer 1：Three.js 天空调度（SkyBackground，完全不动）
Layer 2：Gallery 卡片
  - 有经纬度 → 按投影定位
  - 无经纬度 → 环形布局兜底
Layer 3：UI Overlay（导航、搜索等）
```

---

## 3. 数据模型变更

### 3.1 MediaImage 新增字段

```typescript
// apps/web/src/types/domain.ts
interface MediaImage {
  id: string;
  mediaSetId: string;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  caption?: string;
  sortOrder: number;
  latitude?: number;   // 新增
  longitude?: number;   // 新增
  createdAt: string;
}
```

### 3.2 投影定位规则

| 条件 | 布局方式 |
|------|---------|
| `latitude !== undefined && longitude !== undefined` | 按经纬度投影到地图底板 |
| `latitude === undefined \|\| longitude === undefined` | 环形布局兜底（现有算法） |

### 3.3 投影算法

预设中国区域边界：
- 经度范围：73° ~ 135°
- 纬度范围：18° ~ 54°

```typescript
const LNG_MIN = 73;
const LNG_MAX = 135;
const LAT_MIN = 18;
const LAT_MAX = 54;

function projectToStage(lng: number, lat: number, stageWidth: number, stageHeight: number) {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * stageWidth;
  // y 取环形行高（现有逻辑），不参与经纬度映射
  return { x };
}
```

x 坐标由经纬度决定，y 坐标由现有环形行高逻辑决定（`VERTICAL_SPACING` 保持不变）。

---

## 4. 组件变更

### 4.1 GalleryScene

**Props 变更：**
```typescript
interface GallerySceneProps {
  mediaImages: MediaImage[];    // 替换 projects
  nightMode: boolean;
  onImageSelect: (mediaImage: MediaImage) => void;
}
```

**卡片数量：** 所有已发布的 `MediaImage`（来自所有 `published` 状态的 MediaSet）。

**卡片内容：**
- 正面：图片缩略图（`thumbnailUrl` 或 `url`）
- 背面：图片标题 + 说明（caption / altText）

**交互：** 点击卡片 → `onImageSelect` 回调，触发大图查看或 spin360 播放。

### 4.2 GalleryHome

**数据读取变更：**
```typescript
// 从 usePublicData 获取所有 published MediaImage
const allImages = reader.getAllPublishedMediaImages();
```

**投影触发：** 传入 `mediaImages` + 地图容器宽高到 `GalleryScene`。

### 4.3 新增：GalleryMapBase

```typescript
// apps/web/src/components/gallery/GalleryMapBase.tsx
interface GalleryMapBaseProps {
  className?: string;
}
```

职责：
- 挂载 MapLibre 实例
- 静止地图（禁用交互），仅渲染底板
- 透明滤镜融合天空色调
- 通过 ref 或 context 暴露投影函数

### 4.4 新增：useGalleryProjection Hook

```typescript
// apps/web/src/features/gallery/useGalleryProjection.ts
interface UseGalleryProjectionOptions {
  mapInstance: Map | null;
  mediaImages: MediaImage[];
  stageWidth: number;
  stageHeight: number;
}

interface ProjectedImage {
  mediaImage: MediaImage;
  x: number;         // 投影后 x（在地图底板上的位置）
  isProjected: boolean; // 是否为经纬度投影卡片
}
```

逻辑：
- 遍历 `mediaImages`
- 有经纬度 → 通过 `map.project()` 或投影算法计算 x
- 无经纬度 → `isProjected = false`，由 GalleryScene 分配环形位置

---

## 5. 地图底板样式

- 底色：`#1a2245`（深蓝）融合天空夜间色
- 瓦片：不做特殊处理，依赖 MapLibre 默认渲染
- 地图本身静止，不响应缩放/平移事件（`boxZoom: false, scrollZoom: false, dragPan: false`）
- 滤镜：`brightness(0.4) saturate(0.6)` 融入整体色调

---

## 6. 实现顺序

### Phase 1：数据模型 + 后台录入
1. `MediaImage` 新增 `latitude` / `longitude` 字段
2. `AdminMediaPage` 媒体组详情页中，为每张图片增加经纬度录入表单

### Phase 2：Gallery 数据源切换
3. `GalleryScene` Props 切换为 `MediaImage[]`
4. 卡片内容改为图片正反面
5. `onImageSelect` 逻辑：打开大图 Modal 或跳转 spin360

### Phase 3：投影链路
6. 新增 `GalleryMapBase`（MapLibre 静止底板）
7. 新增 `useGalleryProjection` hook
8. `GalleryScene` 接入投影，投影卡片替换环形位置，无经纬度卡片保留环形布局

---

## 7. 风险与约束

- **无经纬度图片**：始终保留环形布局，不会被投影到地图上
- **地图 Token**：依赖天地图 Token（与 `/map` 页面共用 `.env` 配置）
- **性能**：Gallery 卡片数量可能较大（每个 MediaImage 一张卡），需做 frustum culling（已有）
- **天空层不变**：SkyBackground 及其动画完全不改动
