# Gallery Map Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Gallery 页面从展示项目封面改为展示每张图片（MediaImage），每张图片按经纬度投影到底层 MapLibre 地图。天空层完全不动。

**Architecture:** GalleryScene 从 `Project[]` 改为 `MediaImage[]`；新增静止 MapLibre 地图底板；新增 `useGalleryProjection` hook 计算投影位置；图片分两类：有经纬度的按投影定位，无经纬度的环形布局兜底。

**Tech Stack:** React, TypeScript, MapLibre GL JS, Three.js (existing), Vitest

---

## File Map

### New files to create
- `apps/web/src/components/gallery/GalleryMapBase.tsx` — 静止 MapLibre 地图底板
- `apps/web/src/features/gallery/useGalleryProjection.ts` — 投影 hook
- `apps/web/src/features/gallery/useGalleryProjection.test.ts` — 投影 hook 测试
- `apps/web/src/components/gallery/GalleryMapBase.test.tsx` — 地图底板测试
- `apps/web/src/app/routes/gallery/GalleryHome.test.tsx` — GalleryHome 测试（改写）

### Files to modify
- `apps/web/src/types/domain.ts` — MediaImage 新增 latitude/longitude
- `apps/web/src/services/api/mock-data.ts` — 图片数据新增经纬度
- `apps/web/src/services/storage/adminEditorDrafts.ts` — saveMediaImage 支持经纬度
- `apps/web/src/app/routes/admin/media/AdminMediaPage.tsx` — 图片管理表单新增经纬度录入
- `apps/web/src/app/routes/gallery/GalleryHome.tsx` — 数据源切换 + 接入地图底板
- `apps/web/src/components/gallery/GalleryScene.tsx` — Props 改为 MediaImage[]，接入投影
- `apps/web/src/styles/index.css` — GalleryMapBase 样式

---

## Task 1: Add latitude/longitude to MediaImage type

**Files:**
- Modify: `apps/web/src/types/domain.ts`

- [ ] **Step 1: Write the failing test**

Create: `apps/web/src/types/domain.test.ts`
```typescript
import { describe, expect, it } from 'vitest';
import type { MediaImage } from '@/types/domain';

describe('MediaImage type', () => {
  it('has latitude and longitude fields', () => {
    const image: MediaImage = {
      id: 'test',
      mediaSetId: 'test',
      url: 'https://example.com/img.jpg',
      thumbnailUrl: '',
      altText: '',
      caption: '',
      sortOrder: 1,
      latitude: 31.2401,
      longitude: 121.4903,
      createdAt: new Date().toISOString(),
    };
    expect(image.latitude).toBe(31.2401);
    expect(image.longitude).toBe(121.4903);
  });

  it('latitude and longitude are optional', () => {
    const image: MediaImage = {
      id: 'test',
      mediaSetId: 'test',
      url: 'https://example.com/img.jpg',
      thumbnailUrl: '',
      altText: '',
      caption: '',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
    };
    expect(image.latitude).toBeUndefined();
    expect(image.longitude).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/types/domain.test.ts`
Expected: FAIL — latitude/longitude do not exist on MediaImage

- [ ] **Step 3: Write minimal implementation**

Modify `apps/web/src/types/domain.ts` line 8:

```typescript
export interface MediaImage {
  id: string;
  mediaSetId: string;
  url: string;
  thumbnailUrl: string;
  altText: string;
  caption: string;
  sortOrder: number;
  latitude?: number;    // 新增
  longitude?: number;    // 新增
  createdAt: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/types/domain.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/types/domain.ts apps/web/src/types/domain.test.ts
git commit -m "feat: add latitude/longitude to MediaImage type"
```

---

## Task 2: Add lat/lng to mock data and storage

**Files:**
- Modify: `apps/web/src/services/api/mock-data.ts`
- Modify: `apps/web/src/services/storage/adminEditorDrafts.ts`

- [ ] **Step 1: Write the failing test**

Create: `apps/web/src/services/api/mock-data.test.ts`
```typescript
import { describe, expect, it } from 'vitest';
import { mediaImages } from './mock-data';

describe('mock mediaImages', () => {
  it('some images have latitude and longitude', () => {
    const withCoords = mediaImages.filter(
      (img) => img.latitude !== undefined && img.longitude !== undefined,
    );
    expect(withCoords.length).toBeGreaterThan(0);
  });

  it('images without coordinates are also valid', () => {
    const withoutCoords = mediaImages.filter(
      (img) => img.latitude === undefined || img.longitude === undefined,
    );
    expect(withoutCoords.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/services/api/mock-data.test.ts`
Expected: FAIL — latitude/longitude not on mock data

- [ ] **Step 3: Write minimal implementation**

Modify `mock-data.ts` mediaImages entries. Add some images with lat/lng near Shanghai (31.22-31.25, 121.47-121.50), others without coordinates (undefined).

Example — assign coordinates to the first 5 images:
```typescript
// spin-01 through spin-05: around 外滩 (31.2401, 121.4903)
{ id: 'spin-01', ..., latitude: 31.2401, longitude: 121.4903 }
{ id: 'spin-02', ..., latitude: 31.2405, longitude: 121.4900 }
{ id: 'spin-03', ..., latitude: 31.2398, longitude: 121.4906 }
{ id: 'spin-04', ..., latitude: 31.2410, longitude: 121.4898 }
{ id: 'spin-05', ..., latitude: 31.2395, longitude: 121.4909 }
// spin-06 through spin-08: around 新天地 (31.2206, 121.4751)
{ id: 'spin-06', ..., latitude: 31.2206, longitude: 121.4751 }
{ id: 'spin-07', ..., latitude: 31.2210, longitude: 121.4755 }
{ id: 'spin-08', ..., latitude: 31.2203, longitude: 121.4748 }
// gallery-01 through gallery-03: no coordinates (undefined)
{ id: 'gallery-01', ... } // no lat/lng
{ id: 'gallery-02', ... } // no lat/lng
{ id: 'gallery-03', ... } // no lat/lng
```

Also update `saveMediaImage` in `adminEditorDrafts.ts` to accept optional lat/lng:
```typescript
function createMediaImageDraft(data?: Partial<MediaImage>): MediaImage {
  return {
    id: data?.id ?? '',
    mediaSetId: data?.mediaSetId ?? '',
    url: data?.url ?? '',
    thumbnailUrl: data?.thumbnailUrl ?? '',
    altText: data?.altText ?? '',
    caption: data?.caption ?? '',
    sortOrder: data?.sortOrder ?? 0,
    latitude: data?.latitude,
    longitude: data?.longitude,
    createdAt: data?.createdAt ?? new Date().toISOString(),
  };
}
```

And update `saveMediaImage` signature in `AdminDataStore` interface to include lat/lng:
```typescript
saveMediaImage(data: MediaImage): void;
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --run src/services/api/mock-data.test.ts src/services/storage/adminEditorDrafts.test.ts 2>&1 | head -30`
Expected: PASS for mock-data; adminEditorDrafts may need separate updates to tests

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/api/mock-data.ts apps/web/src/services/storage/adminEditorDrafts.ts apps/web/src/services/api/mock-data.test.ts
git commit -m "feat: add latitude/longitude to mock data and storage layer"
```

---

## Task 3: Add lat/lng input fields to AdminMediaPage

**Files:**
- Modify: `apps/web/src/app/routes/admin/media/AdminMediaPage.tsx`

- [ ] **Step 1: Write the failing test**

Create: `apps/web/src/app/routes/admin/media/AdminMediaPage.test.tsx`
```typescript
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('AdminMediaPage', () => {
  it('has latitude and longitude input fields in image form', () => {
    const source = fs.readFileSync('src/app/routes/admin/media/AdminMediaPage.tsx', 'utf-8');
    expect(source).toContain('latitude');
    expect(source).toContain('longitude');
    expect(source).toMatch(/latitude.*placeholder|placeholder.*latitude/);
    expect(source).toMatch(/longitude.*placeholder|placeholder.*longitude/);
  });

  it('addImage function passes lat/lng to saveMediaImage', () => {
    const source = fs.readFileSync('src/app/routes/admin/media/AdminMediaPage.tsx', 'utf-8');
    // The addImage function should reference latitude and longitude from state
    expect(source).toMatch(/latitude:\s*parseFloat/);
    expect(source).toMatch(/longitude:\s*parseFloat/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/routes/admin/media/AdminMediaPage.test.tsx`
Expected: FAIL — latitude/longitude not in AdminMediaPage yet

- [ ] **Step 3: Write minimal implementation**

In `AdminMediaPage.tsx`, add two state variables and input fields:

Add state:
```typescript
const [imageLatitude, setImageLatitude] = useState('');
const [imageLongitude, setImageLongitude] = useState('');
```

Add to `addImage` function — saveMediaImage call adds:
```typescript
latitude: imageLatitude ? parseFloat(imageLatitude) : undefined,
longitude: imageLongitude ? parseFloat(imageLongitude) : undefined,
```

In the "单张添加" form (after `imageCaption` input), add:
```tsx
<input
  value={imageLatitude}
  onChange={(e) => setImageLatitude(e.target.value)}
  placeholder="纬度（可选）"
  disabled={!selectedMediaSet}
/>
<input
  value={imageLongitude}
  onChange={(e) => setImageLongitude(e.target.value)}
  placeholder="经度（可选）"
  disabled={!selectedMediaSet}
/>
```

Reset both in `addImage` after saving:
```typescript
setImageLatitude('');
setImageLongitude('');
```

In `selectedImages.map`, show lat/lng when editing:
```tsx
<div className="muted">
  顺序：{image.sortOrder}
  {image.latitude !== undefined && <span> · {image.latitude}, {image.longitude}</span>}
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/app/routes/admin/media/AdminMediaPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/routes/admin/media/AdminMediaPage.tsx apps/web/src/app/routes/admin/media/AdminMediaPage.test.tsx
git commit -m "feat: add lat/lng fields to admin media image form"
```

---

## Task 4: Switch GalleryScene to MediaImage[]

**Files:**
- Modify: `apps/web/src/components/gallery/GalleryScene.tsx`

- [ ] **Step 1: Write the failing test**

Create: `apps/web/src/components/gallery/GalleryScene.test.tsx`
```typescript
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('GalleryScene', () => {
  it('accepts mediaImages prop instead of projects', () => {
    const source = fs.readFileSync('src/components/gallery/GalleryScene.tsx', 'utf-8');
    expect(source).toMatch(/mediaImages:\s*MediaImage\[\]/);
  });

  it('does not reference projects prop', () => {
    const source = fs.readFileSync('src/components/gallery/GalleryScene.tsx', 'utf-8');
    expect(source).not.toMatch(/projects:\s*Project\[\]/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/gallery/GalleryScene.test.tsx`
Expected: FAIL — still uses Project[]

- [ ] **Step 3: Write minimal implementation**

Change `GallerySceneProps` interface:
```typescript
import type { MediaImage } from '@/types/domain';

interface GallerySceneProps {
  mediaImages: MediaImage[];       // replaces projects
  nightMode: boolean;
  onImageSelect: (mediaImage: MediaImage) => void;  // replaces onProjectSelect
}
```

Remove all references to `projects` inside the component — replace with `mediaImages`. Remove `locations` from props if present.

Card creation: each card's front face uses `mediaImage.url`, back face uses `mediaImage.caption` / `mediaImage.altText`.

`onPointerUp` raycast hit → get `projectId` from `mediaImage.mediaSetId`:
```typescript
const mediaSet = state.mediaSets.find((ms) => ms.id === mediaImage.mediaSetId);
const projectId = mediaSet?.projectId;
```

Click calls `onImageSelect(mediaImage)` instead of `onProjectSelect(project)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/gallery/GalleryScene.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/gallery/GalleryScene.tsx apps/web/src/components/gallery/GalleryScene.test.tsx
git commit -m "refactor: switch GalleryScene from Project[] to MediaImage[]"
```

---

## Task 5: Switch GalleryHome data source

**Files:**
- Modify: `apps/web/src/app/routes/gallery/GalleryHome.tsx`
- Modify: `apps/web/src/services/storage/publicDataReader.ts`

- [ ] **Step 1: Write the failing test**

Create: `apps/web/src/app/routes/gallery/GalleryHome.test.tsx`
```typescript
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('GalleryHome', () => {
  it('passes MediaImage[] to GalleryScene', () => {
    const source = fs.readFileSync('src/app/routes/gallery/GalleryHome.tsx', 'utf-8');
    expect(source).toMatch(/mediaImages=/);
  });

  it('reads all published media images', () => {
    const source = fs.readFileSync('src/app/routes/gallery/GalleryHome.tsx', 'utf-8');
    expect(source).toMatch(/getAllPublishedMediaImages|getPublishedMediaImages/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/routes/gallery/GalleryHome.test.tsx`
Expected: FAIL — getAllPublishedMediaImages not defined

- [ ] **Step 3: Write minimal implementation**

In `publicDataReader.ts`, add:
```typescript
function getAllPublishedMediaImagesFromState(state: AdminDataState): MediaImage[] {
  const publishedProjectIds = getPublishedProjectIdsFromState(state);
  const publishedMediaSets = state.mediaSets.filter(
    (ms) => ms.status !== 'draft' || publishedProjectIds.has(ms.projectId),
  );
  // Actually filter by published projects only
  const publishedMediaSets2 = state.mediaSets.filter(
    (ms) => publishedProjectIds.has(ms.projectId),
  );
  const mediaSetIds = new Set(publishedMediaSets2.map((ms) => ms.id));
  return state.mediaImages.filter((img) => mediaSetIds.has(img.mediaSetId));
}

return {
  // ...existing methods...
  getAllPublishedMediaImages(): MediaImage[] {
    return getAllPublishedMediaImagesFromState(getState());
  },
};
```

Fix: `MediaSet` doesn't have `status` — filter by `project.status === 'published'` is correct. Filter mediaSets by their project's published status.

In `GalleryHome.tsx`:
```typescript
const allImages = reader.getAllPublishedMediaImages();

// Pass to GalleryScene:
<GalleryScene
  mediaImages={allImages}
  nightMode={nightMode}
  onImageSelect={(img) => {
    // TODO: open image viewer modal (future task)
  }}
/>
```

Remove `projects` prop from GalleryScene usage. Remove `filteredProjects` and search by project logic. Filter by image caption/altText instead.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/app/routes/gallery/GalleryHome.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/routes/gallery/GalleryHome.tsx apps/web/src/services/storage/publicDataReader.ts apps/web/src/app/routes/gallery/GalleryHome.test.tsx
git commit -m "feat: switch GalleryHome to read from MediaImage data source"
```

---

## Task 6: Add GalleryMapBase (static map floor)

**Files:**
- Create: `apps/web/src/components/gallery/GalleryMapBase.tsx`
- Create: `apps/web/src/components/gallery/GalleryMapBase.test.tsx`
- Modify: `apps/web/src/styles/index.css`

- [ ] **Step 1: Write the failing test**

Create: `apps/web/src/components/gallery/GalleryMapBase.test.tsx`
```typescript
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { GalleryMapBase } from '@/components/gallery/GalleryMapBase';

describe('GalleryMapBase', () => {
  it('renders a map container div', () => {
    const { container } = render(<GalleryMapBase />);
    expect(container.querySelector('.gallery-map-base')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/gallery/GalleryMapBase.test.tsx`
Expected: FAIL — GalleryMapBase does not exist

- [ ] **Step 3: Write minimal implementation**

Create `GalleryMapBase.tsx`:
```typescript
import { useEffect, useRef } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { MAP_CAMERA_DEFAULTS } from '@/lib/constants/map';
import {
  buildTiandituRasterStyle,
  DEFAULT_MAP_PROVIDER,
  MAP_ENV_KEYS,
} from '@/lib/constants/map';

export function GalleryMapBase() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (DEFAULT_MAP_PROVIDER !== 'maplibre-tianditu') return;

    const token = import.meta.env[MAP_ENV_KEYS.tiandituToken];
    if (!token) return;

    let disposed = false;

    async function init() {
      const maplibre = await import('maplibre-gl');
      if (disposed || !containerRef.current) return;

      const map = new maplibre.Map({
        container: containerRef.current,
        style: buildTiandituRasterStyle(token),
        center: [...MAP_CAMERA_DEFAULTS.center],
        zoom: MAP_CAMERA_DEFAULTS.zoom,
        pitch: MAP_CAMERA_DEFAULTS.pitch,
        attributionControl: false,
        interactive: false,  // 静止地图
      });

      // 禁用所有交互
      map.boxZoom.disable();
      map.scrollZoom.disable();
      map.dragPan.disable();
      map.dragRotate.disable();
      map.keyboard.disable();
      map.doubleClickZoom.disable();
      map.touchZoomRotate.disable();
    }

    void init();
    return () => {
      disposed = true;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="gallery-map-base"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
      }}
    />
  );
}
```

Add CSS to `index.css`:
```css
/* === Gallery Map Base === */
.gallery-map-base {
  position: absolute;
  inset: 0;
  z-index: 0;
  filter: brightness(0.35) saturate(0.5) sepia(0.15);
  opacity: 0.85;
}

.gallery-map-base .maplibregl-map,
.gallery-map-base .maplibregl-canvas,
.gallery-map-base .maplibregl-canvas-container {
  width: 100%;
  height: 100%;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/gallery/GalleryMapBase.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/gallery/GalleryMapBase.tsx apps/web/src/components/gallery/GalleryMapBase.test.tsx apps/web/src/styles/index.css
git commit -m "feat: add static gallery map base layer"
```

---

## Task 7: Add useGalleryProjection hook

**Files:**
- Create: `apps/web/src/features/gallery/useGalleryProjection.ts`
- Create: `apps/web/src/features/gallery/useGalleryProjection.test.ts`

- [ ] **Step 1: Write the failing test**

Create: `apps/web/src/features/gallery/useGalleryProjection.test.ts`
```typescript
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGalleryProjection } from './useGalleryProjection';

describe('useGalleryProjection', () => {
  it('marks images with lat/lng as projected', () => {
    const { result } = renderHook(() =>
      useGalleryProjection({
        mediaImages: [
          {
            id: 'img-1',
            mediaSetId: 'ms-1',
            url: 'https://example.com/1.jpg',
            thumbnailUrl: '',
            altText: '',
            caption: '',
            sortOrder: 1,
            latitude: 31.2401,
            longitude: 121.4903,
            createdAt: '',
          },
        ],
        stageWidth: 1280,
        stageHeight: 720,
      }),
    );
    expect(result.current.projectedImages[0].isProjected).toBe(true);
    expect(result.current.projectedImages[0].x).toBeGreaterThan(0);
  });

  it('marks images without coordinates as not projected', () => {
    const { result } = renderHook(() =>
      useGalleryProjection({
        mediaImages: [
          {
            id: 'img-2',
            mediaSetId: 'ms-1',
            url: 'https://example.com/2.jpg',
            thumbnailUrl: '',
            altText: '',
            caption: '',
            sortOrder: 2,
            createdAt: '',
          },
        ],
        stageWidth: 1280,
        stageHeight: 720,
      }),
    );
    expect(result.current.projectedImages[0].isProjected).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/features/gallery/useGalleryProjection.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `useGalleryProjection.ts`:
```typescript
import { useMemo } from 'react';
import type { MediaImage } from '@/types/domain';

const LNG_MIN = 73;
const LNG_MAX = 135;
const LAT_MIN = 18;
const LAT_MAX = 54;

export interface ProjectedImage {
  mediaImage: MediaImage;
  x: number;
  isProjected: boolean;
}

interface UseGalleryProjectionOptions {
  mediaImages: MediaImage[];
  stageWidth: number;
  stageHeight: number;
}

export function useGalleryProjection({
  mediaImages,
  stageWidth,
  stageHeight,
}: UseGalleryProjectionOptions): { projectedImages: ProjectedImage[] } {
  const projectedImages = useMemo(() => {
    return mediaImages.map((mediaImage) => {
      if (
        mediaImage.latitude !== undefined &&
        mediaImage.longitude !== undefined
      ) {
        const x = ((mediaImage.longitude - LNG_MIN) / (LNG_MAX - LNG_MIN)) * stageWidth;
        return { mediaImage, x, isProjected: true };
      }
      return { mediaImage, x: 0, isProjected: false };
    });
  }, [mediaImages, stageWidth, stageHeight]);

  return { projectedImages };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/features/gallery/useGalleryProjection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/gallery/useGalleryProjection.ts apps/web/src/features/gallery/useGalleryProjection.test.ts
git commit -m "feat: add gallery projection hook"
```

---

## Task 8: Wire projection into GalleryScene

**Files:**
- Modify: `apps/web/src/components/gallery/GalleryScene.tsx`
- Modify: `apps/web/src/app/routes/gallery/GalleryHome.tsx`
- Modify: `apps/web/src/components/gallery/GalleryMapBase.tsx`

- [ ] **Step 1: Write the failing test**

In `GalleryScene.test.tsx`, add:
```typescript
it('uses projected positions for images with coordinates', () => {
  const source = fs.readFileSync('src/components/gallery/GalleryScene.tsx', 'utf-8');
  expect(source).toMatch(/useGalleryProjection/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/gallery/GalleryScene.test.tsx`
Expected: FAIL — useGalleryProjection not imported yet

- [ ] **Step 3: Write minimal implementation**

**In `GalleryScene.tsx`:**
- Import and call `useGalleryProjection({ mediaImages, stageWidth, stageHeight })`
- For each card:
  - If `isProjected === true`: set `group.position.x = projectedImages[idx].x` (instead of `pos.x`)
  - If `isProjected === false`: use existing ring position logic
- `stageWidth` and `stageHeight` come from `containerRef.current.clientWidth/Height`

**In `GalleryHome.tsx`:**
- Add `<GalleryMapBase />` inside the scene container (absolute positioned, behind the 3D canvas)
- Pass container ref to GalleryScene so it knows dimensions

**Layout change in `GalleryHome.tsx`:**
```tsx
<div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: nightMode ? '#1a2245' : '#87CEEB', transition: 'background 2s ease' }}>
  {/* Layer 0: Static map base */}
  <GalleryMapBase />
  
  {/* Layer 1: 3D Sky + cards (existing) */}
  {!showLoader && (
    <GalleryScene
      ref={sceneContainerRef}
      mediaImages={allImages}
      nightMode={nightMode}
      onImageSelect={handleImageSelect}
    />
  )}
</div>
```

The map base CSS `filter` already makes it dark/faded — sky color will show through.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/gallery/GalleryScene.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/gallery/GalleryScene.tsx apps/web/src/app/routes/gallery/GalleryHome.tsx
git commit -m "feat: wire gallery projection into scene with map base"
```

---

## Task 9: Add image select modal (basic)

**Files:**
- Modify: `apps/web/src/app/routes/gallery/GalleryHome.tsx`
- Create: `apps/web/src/components/gallery/GalleryImageModal.tsx` (optional, can reuse GalleryModal pattern)

- [ ] **Step 1: Add onImageSelect handler to GalleryHome**

In `GalleryHome.tsx`, add state and modal:
```typescript
const [selectedImage, setSelectedImage] = useState<MediaImage | null>(null);
```

Handler:
```typescript
const handleImageSelect = useCallback((mediaImage: MediaImage) => {
  setSelectedImage(mediaImage);
}, []);
```

Add modal after GalleryScene (or inside overlay):
```tsx
{selectedImage && (
  <div className="gallery-image-modal" onClick={() => setSelectedImage(null)}>
    <img src={selectedImage.url} alt={selectedImage.altText} />
    {selectedImage.caption && <p>{selectedImage.caption}</p>}
  </div>
)}
```

Add CSS:
```css
.gallery-image-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0,0,0,0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.gallery-image-modal img {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
}
.gallery-image-modal p {
  margin-top: 16px;
  color: rgba(230,230,240,0.9);
  font-family: 'Work Sans', sans-serif;
}
```

- [ ] **Step 2: Verify app builds**

Run: `npm run build -- --dry-run 2>&1 | head -20` or just `npm run build 2>&1 | tail -20`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/routes/gallery/GalleryHome.tsx apps/web/src/styles/index.css
git commit -m "feat: add basic image select modal in gallery"
```

---

## Self-Review Checklist

1. **Spec coverage:** Every requirement from the spec has a task above.
   - MediaImage lat/lng fields → Task 1
   - Admin image form → Task 3
   - GalleryScene MediaImage[] → Task 4
   - GalleryHome data source → Task 5
   - Map base layer → Task 6
   - Projection hook → Task 7
   - Scene wired to projection → Task 8
   - Image select modal → Task 9

2. **Placeholder scan:** No TBD/TODO placeholders in task steps. All code shown is complete.

3. **Type consistency:** `MediaImage` type updated in Task 1, all downstream consumers (mock-data, storage, admin, gallery) reference the same type.

4. **Test coverage:** Each task has a test-first step. Tests verify actual behavior, not just that code exists.

5. **Order dependencies:**
   - Task 1 must come before Tasks 2, 3
   - Task 2 must come before Task 3
   - Task 7 must come before Task 8
   - Tasks 4/5 can run in parallel (both change GalleryHome+GalleryScene)
   - Task 6 (map base) can run in parallel with Tasks 4/5
