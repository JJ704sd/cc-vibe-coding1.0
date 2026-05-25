# Curved Geo Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the gallery page as a single Three.js experience with a curved map surface, geo-anchored media cards, preserved star sky, and fallback handling for images without coordinates.

**Architecture:** Replace the old split between DOM map background and Three.js gallery scene with `GalleryExperience` as the single scene orchestrator. Keep all coordinate math in pure helper files and access curved-map geometry only through a sampler interface so weaker workers can implement and verify each piece in isolation.

**Tech Stack:** React, TypeScript, Three.js, Vitest, Testing Library

---

## File Map

### Create

- `apps/web/src/features/gallery/gallerySceneMath.ts`
- `apps/web/src/features/gallery/gallerySceneMath.test.ts`
- `apps/web/src/features/gallery/useCurvedMapProjection.ts`
- `apps/web/src/features/gallery/useCurvedMapProjection.test.ts`
- `apps/web/src/components/gallery/CurvedMapSurface.tsx`
- `apps/web/src/components/gallery/CurvedMapSurface.test.tsx`
- `apps/web/src/components/gallery/GeoMediaLayer.tsx`
- `apps/web/src/components/gallery/GeoMediaLayer.test.tsx`
- `apps/web/src/components/gallery/GalleryExperience.tsx`
- `apps/web/src/components/gallery/GalleryExperience.test.tsx`

### Modify

- `apps/web/src/app/routes/gallery/GalleryHome.tsx`
- `apps/web/src/styles/index.css`

### Leave In Place During Migration

- `apps/web/src/components/gallery/GalleryScene.tsx`
- `apps/web/src/components/gallery/GalleryMapBase.tsx`
- `apps/web/src/features/gallery/useGalleryProjection.ts`

Do not delete these until the new gallery route is fully switched and verified.

---

### Task 1: Add Pure Curved-Map Math Helpers

**Files:**
- Create: `apps/web/src/features/gallery/gallerySceneMath.ts`
- Test: `apps/web/src/features/gallery/gallerySceneMath.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  clampToUnit,
  lngLatToUv,
  uvToCurvedWorld,
  estimateCurvedNormal,
} from './gallerySceneMath';

describe('gallerySceneMath', () => {
  it('maps lng/lat to normalized uv inside China bounds', () => {
    const uv = lngLatToUv(121.4903, 31.2401);
    expect(uv.u).toBeGreaterThan(0);
    expect(uv.u).toBeLessThan(1);
    expect(uv.v).toBeGreaterThan(0);
    expect(uv.v).toBeLessThan(1);
  });

  it('bends uv into curved world coordinates', () => {
    const point = uvToCurvedWorld({
      u: 0.5,
      v: 0.5,
      radius: 1400,
      arcSpan: Math.PI * 0.9,
      mapHeight: 1800,
    });
    expect(point.y).toBeCloseTo(0, 5);
    expect(Number.isFinite(point.x)).toBe(true);
    expect(Number.isFinite(point.z)).toBe(true);
  });

  it('returns a normalized surface normal', () => {
    const normal = estimateCurvedNormal(0.5, Math.PI * 0.9);
    expect(normal.length()).toBeCloseTo(1, 5);
  });

  it('clamps out-of-range values into [0, 1]', () => {
    expect(clampToUnit(-0.2)).toBe(0);
    expect(clampToUnit(1.8)).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/features/gallery/gallerySceneMath.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

Create the helpers in `gallerySceneMath.ts`:

```ts
import * as THREE from 'three';

export const LNG_MIN = 73;
export const LNG_MAX = 135;
export const LAT_MIN = 18;
export const LAT_MAX = 54;

export function clampToUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function lngLatToUv(longitude: number, latitude: number) {
  const u = clampToUnit((longitude - LNG_MIN) / (LNG_MAX - LNG_MIN));
  const v = clampToUnit(1 - (latitude - LAT_MIN) / (LAT_MAX - LAT_MIN));
  return { u, v };
}

export function uvToCurvedWorld({
  u,
  v,
  radius,
  arcSpan,
  mapHeight,
}: {
  u: number;
  v: number;
  radius: number;
  arcSpan: number;
  mapHeight: number;
}) {
  const angle = -arcSpan / 2 + arcSpan * clampToUnit(u);
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius - radius;
  const y = (0.5 - clampToUnit(v)) * mapHeight;
  return new THREE.Vector3(x, y, z);
}

export function estimateCurvedNormal(u: number, arcSpan: number) {
  const angle = -arcSpan / 2 + arcSpan * clampToUnit(u);
  return new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/features/gallery/gallerySceneMath.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/gallery/gallerySceneMath.ts apps/web/src/features/gallery/gallerySceneMath.test.ts
git commit -m "feat: add curved gallery scene math helpers"
```

---

### Task 2: Add Projection Hook For Anchored And Fallback Media

**Files:**
- Create: `apps/web/src/features/gallery/useCurvedMapProjection.ts`
- Test: `apps/web/src/features/gallery/useCurvedMapProjection.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCurvedMapProjection } from './useCurvedMapProjection';

const baseImage = {
  mediaSetId: 'set-1',
  url: 'https://example.com/test.jpg',
  thumbnailUrl: '',
  altText: 'test',
  caption: 'test',
  sortOrder: 1,
  createdAt: '2026-04-08T00:00:00.000Z',
};

describe('useCurvedMapProjection', () => {
  it('anchors images with coordinates', () => {
    const { result } = renderHook(() =>
      useCurvedMapProjection({
        mediaImages: [
          { ...baseImage, id: 'img-1', latitude: 31.2401, longitude: 121.4903 },
        ],
      }),
    );
    expect(result.current.anchored.length).toBe(1);
    expect(result.current.fallback.length).toBe(0);
  });

  it('moves images without coordinates into fallback placements', () => {
    const { result } = renderHook(() =>
      useCurvedMapProjection({
        mediaImages: [{ ...baseImage, id: 'img-2' }],
      }),
    );
    expect(result.current.anchored.length).toBe(0);
    expect(result.current.fallback.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/features/gallery/useCurvedMapProjection.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

Create `useCurvedMapProjection.ts` with:

```ts
import { useMemo } from 'react';
import type { MediaImage } from '@/types/domain';
import { lngLatToUv } from './gallerySceneMath';

export interface AnchoredMediaPlacement {
  mediaImage: MediaImage;
  u: number;
  v: number;
}

export interface FallbackMediaPlacement {
  mediaImage: MediaImage;
  fallbackIndex: number;
}

export function useCurvedMapProjection({
  mediaImages,
}: {
  mediaImages: MediaImage[];
}) {
  return useMemo(() => {
    const anchored: AnchoredMediaPlacement[] = [];
    const fallback: FallbackMediaPlacement[] = [];

    mediaImages.forEach((mediaImage) => {
      if (
        mediaImage.longitude !== undefined &&
        mediaImage.latitude !== undefined
      ) {
        const { u, v } = lngLatToUv(mediaImage.longitude, mediaImage.latitude);
        anchored.push({ mediaImage, u, v });
        return;
      }

      fallback.push({
        mediaImage,
        fallbackIndex: fallback.length,
      });
    });

    return { anchored, fallback };
  }, [mediaImages]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/features/gallery/useCurvedMapProjection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/gallery/useCurvedMapProjection.ts apps/web/src/features/gallery/useCurvedMapProjection.test.ts
git commit -m "feat: add curved gallery projection hook"
```

---

### Task 3: Build A Curved Map Surface Component With Sampler

**Files:**
- Create: `apps/web/src/components/gallery/CurvedMapSurface.tsx`
- Test: `apps/web/src/components/gallery/CurvedMapSurface.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CurvedMapSurface } from './CurvedMapSurface';

describe('CurvedMapSurface', () => {
  it('renders a host element', () => {
    const samplerSpy = vi.fn();
    const { container } = render(
      <CurvedMapSurface onSamplerReady={samplerSpy} textureUrl="" />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/gallery/CurvedMapSurface.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

Create `CurvedMapSurface.tsx` as a non-route helper component that:

- exports `CurvedMapSampler`,
- creates a subdivided plane geometry,
- bends vertex positions using `uvToCurvedWorld`,
- builds a mesh with `THREE.MeshStandardMaterial`,
- calls `onSamplerReady` with methods backed by `lngLatToUv`, `uvToCurvedWorld`, and `estimateCurvedNormal`.

The first implementation can return `null` from JSX and expose a factory function for use by `GalleryExperience`, if that matches the existing scene style better. If doing that, adapt the test to target the exported factory instead of DOM markup.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/gallery/CurvedMapSurface.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/gallery/CurvedMapSurface.tsx apps/web/src/components/gallery/CurvedMapSurface.test.tsx
git commit -m "feat: add curved map surface sampler component"
```

---

### Task 4: Build The Geo Media Layer

**Files:**
- Create: `apps/web/src/components/gallery/GeoMediaLayer.tsx`
- Test: `apps/web/src/components/gallery/GeoMediaLayer.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import type { AnchoredMediaPlacement } from '@/features/gallery/useCurvedMapProjection';

describe('GeoMediaLayer', () => {
  it('module can be imported', async () => {
    const mod = await import('./GeoMediaLayer');
    expect(mod.GeoMediaLayer).toBeTypeOf('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/gallery/GeoMediaLayer.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

Create `GeoMediaLayer.tsx` with a function that:

- accepts `scene`, `anchored`, `fallback`, `sampler`, and `onImageSelect`,
- reuses shared plane geometry for cards,
- creates one front mesh and one back mesh per media image,
- places anchored cards at `sampler.getPointAt(...) + normal * lift`,
- places fallback cards in a side ribbon using deterministic spacing,
- stores `mediaImage` on the front mesh `userData` for raycasting.

Keep the first version simple:

- one shared `PlaneGeometry`,
- one `TextureLoader`,
- minimal card animation data structure,
- no clustering beyond deterministic lift or lateral offset.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/gallery/GeoMediaLayer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/gallery/GeoMediaLayer.tsx apps/web/src/components/gallery/GeoMediaLayer.test.tsx
git commit -m "feat: add geo media layer for curved gallery"
```

---

### Task 5: Create GalleryExperience As The New Scene Orchestrator

**Files:**
- Create: `apps/web/src/components/gallery/GalleryExperience.tsx`
- Test: `apps/web/src/components/gallery/GalleryExperience.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('GalleryExperience', () => {
  it('uses CurvedMapSurface and GeoMediaLayer', () => {
    const source = fs.readFileSync('src/components/gallery/GalleryExperience.tsx', 'utf-8');
    expect(source).toContain('CurvedMapSurface');
    expect(source).toContain('GeoMediaLayer');
    expect(source).toContain('createSkyBackground');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/gallery/GalleryExperience.test.tsx`
Expected: FAIL because file does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `GalleryExperience.tsx` by extracting the stable parts from the existing `GalleryScene`:

- renderer creation,
- scene and camera creation,
- orbit controls,
- animation loop,
- raycaster handling,
- sky background update.

Then wire in:

- `useCurvedMapProjection(mediaImages)`,
- `CurvedMapSurface`,
- `GeoMediaLayer`.

Do not copy over the old ring layout logic.

Keep prop shape:

```ts
interface GalleryExperienceProps {
  mediaImages: MediaImage[];
  nightMode: boolean;
  onImageSelect: (mediaImage: MediaImage) => void;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/gallery/GalleryExperience.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/gallery/GalleryExperience.tsx apps/web/src/components/gallery/GalleryExperience.test.tsx
git commit -m "feat: add curved gallery experience scene"
```

---

### Task 6: Switch The Gallery Route To The New Experience

**Files:**
- Modify: `apps/web/src/app/routes/gallery/GalleryHome.tsx`

- [ ] **Step 1: Write the failing test**

Update or create `apps/web/src/app/routes/gallery/GalleryHome.test.tsx`

```tsx
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('GalleryHome', () => {
  it('uses GalleryExperience instead of GalleryScene and GalleryMapBase', () => {
    const source = fs.readFileSync('src/app/routes/gallery/GalleryHome.tsx', 'utf-8');
    expect(source).toContain('GalleryExperience');
    expect(source).not.toContain('GalleryScene');
    expect(source).not.toContain('GalleryMapBase');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/routes/gallery/GalleryHome.test.tsx`
Expected: FAIL because the route still imports old components.

- [ ] **Step 3: Write minimal implementation**

Modify `GalleryHome.tsx`:

- replace `GalleryScene` with `GalleryExperience`,
- remove `GalleryMapBase` from the gallery route,
- keep overlay UI, search, night mode, and modal state intact,
- keep `usePublicData().getAllPublishedMediaImages()` as the data source.

Target usage:

```tsx
<GalleryExperience
  mediaImages={filteredImages}
  nightMode={nightMode}
  onImageSelect={handleImageSelect}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/app/routes/gallery/GalleryHome.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/routes/gallery/GalleryHome.tsx apps/web/src/app/routes/gallery/GalleryHome.test.tsx
git commit -m "refactor: switch gallery route to curved map experience"
```

---

### Task 7: Add Minimal Styling And Runtime Verification

**Files:**
- Modify: `apps/web/src/styles/index.css`

- [ ] **Step 1: Add styling for the new scene container and modal compatibility**

Add only the styles needed for:

- `.gallery-experience`,
- full-screen canvas container,
- any fallback ribbon labels,
- modal compatibility if the new scene slightly changes stacking.

Do not move UI overlay styling out of the route unless necessary.

- [ ] **Step 2: Run focused tests**

Run: `npm test -- --run src/features/gallery/gallerySceneMath.test.ts src/features/gallery/useCurvedMapProjection.test.ts src/components/gallery/CurvedMapSurface.test.tsx src/components/gallery/GeoMediaLayer.test.tsx src/components/gallery/GalleryExperience.test.tsx src/app/routes/gallery/GalleryHome.test.tsx`
Expected: PASS.

- [ ] **Step 3: Run build verification**

Run: `npm run build`
Expected: successful TypeScript and bundler build with no gallery import errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/styles/index.css
git commit -m "style: finalize curved gallery scene integration"
```

---

## Self-Review

### Spec coverage

- single Three.js scene: Task 5 and Task 6
- curved map surface: Task 3
- geo-anchored cards: Task 2 and Task 4
- fallback handling for missing coordinates: Task 2 and Task 4
- preserved sky layer: Task 5
- weak-model-friendly decomposition: all tasks are isolated and ordered

### Placeholder scan

No task says “handle later” or “implement appropriately”. Each task names the files, tests, and minimum code required to continue.

### Type consistency

- `MediaImage` remains the source content type
- projection hook produces placement models, not new domain entities
- sampler interface isolates geometry from media content

### Dependency order

- Task 1 before Task 2 and Task 3
- Task 2 and Task 3 before Task 4
- Task 4 before Task 5
- Task 5 before Task 6
- Task 7 only after the route is switched

---

## 交接更新 - 2026-05-25

当前会话已部分修正 gallery 路由和场景实现：

- `/` 现在是独立 gallery 路由，不再是 `PublicLayout` 的 index 子路由。
- `LoadingScreen` 已从 `GalleryHome` 挂载。
- gallery 字体导入已包含 `Cormorant Garamond` 和 `Work Sans`。
- 第一次修复后的截图确认公共 header chrome 已消失，但也暴露出 `GalleryExperience` 仍显示为平面 DOM MapLibre 地图面板。
- `GalleryExperience.test.tsx` 已更新为拒绝 flat-paper MapLibre 路径，并要求可见的 Three.js 曲面地图 mesh。
- `GalleryExperience.tsx` 已移除 gallery 专用 DOM MapLibre 面板，让曲面 mesh 默认可见，并加入旋转 pivot。

中断前已完成的验证：

```powershell
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\web' test -- --run src/components/gallery/GalleryExperience.test.tsx
```

观察结果：`7 passed`。

```powershell
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\web' test -- --run src/app/router.test.ts src/app/routes/gallery/GalleryHome.test.tsx src/components/gallery/GalleryExperience.test.tsx
```

观察结果：`20 passed`。

```powershell
npm --prefix 'D:\VS vibe coding files\trace-scope-platform\apps\web' run build
```

观察结果：生产构建通过。

剩余工作：

- 最新 `GalleryExperience` 补丁后重新运行浏览器截图。
- 确认 loader 退出后场景非空。
- 确认曲面 mesh 和媒体卡片可见且可交互。
- 时间允许时，提交前运行完整 web 测试套件。
