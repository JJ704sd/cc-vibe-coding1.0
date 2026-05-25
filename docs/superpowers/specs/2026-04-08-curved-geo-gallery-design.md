# Curved Geo Gallery Design

## Goal

Replace the current split `GalleryMapBase + GalleryScene` composition with a single Three.js-driven gallery experience where:

- the star sky remains present,
- the map becomes a curved spatial surface instead of a flat DOM background,
- media cards are anchored by longitude/latitude above the map surface,
- the overall scene still reads as an orbital installation rather than a flat GIS screen.

This design is intentionally optimized for harness-style execution by weaker agentic workers: clear boundaries, pure math in isolated files, and staged verification after each unit.

---

## Current State Review

### `GalleryHome`

[`apps/web/src/app/routes/gallery/GalleryHome.tsx`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\app\routes\gallery\GalleryHome.tsx) currently composes:

- `GalleryMapBase` as an absolute DOM background,
- `GalleryScene` as a full-screen Three.js layer,
- UI overlay and modal state.

This route is acceptably thin, but the scene is split across two rendering systems.

### `GalleryMapBase`

[`apps/web/src/components/gallery/GalleryMapBase.tsx`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\components\gallery\GalleryMapBase.tsx) creates a non-interactive MapLibre map. It works as a static visual reference, but it cannot become a curved spatial object and cannot provide stable 3D anchoring for cards.

### `GalleryScene`

[`apps/web/src/components/gallery/GalleryScene.tsx`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\components\gallery\GalleryScene.tsx) currently owns:

- renderer and camera lifecycle,
- orbit controls,
- sky dome,
- card creation,
- card hover/click raycasting,
- layout logic.

The main architectural weakness is that card placement is still fundamentally ring-randomized. Geographic projection only overrides the `x` coordinate, so the current scene does not have one coherent spatial model.

### `useGalleryProjection`

[`apps/web/src/features/gallery/useGalleryProjection.ts`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\features\gallery\useGalleryProjection.ts) only projects longitude to stage-space `x`. This is insufficient for a true curved map surface because the scene needs:

- normalized map UV coordinates,
- world position on the curved surface,
- surface normal,
- tangent directions for overlap resolution and card orientation.

### `SkyBackground`

[`apps/web/src/components/site/SkyBackground.tsx`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\components\site\SkyBackground.tsx) is already suitable for reuse. It should remain the far-background layer inside the unified Three.js scene.

---

## Design Decision

Use a single Three.js scene for the gallery page.

Do not keep MapLibre in the gallery rendering path.

Instead:

- use a static map texture or pre-generated map artwork as a material source,
- bend a subdivided plane into a curved map surface,
- place each media card above that surface using geographic anchoring,
- preserve the star sky and cinematic camera movement,
- preserve route thinness and existing domain boundaries.

This keeps `Project -> Location -> MediaSet / Route` intact and introduces no new top-level entities. The change is presentation-only.

---

## Target Architecture

### Route Layer

[`apps/web/src/app/routes/gallery/GalleryHome.tsx`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\app\routes\gallery\GalleryHome.tsx)

Responsibilities:

- read published `MediaImage` data,
- handle filter/search/night mode,
- own selected-image modal state,
- pass prepared data to the single gallery experience component,
- keep overlay UI separate from scene internals.

It should not own renderer setup or geometry math.

### Scene Orchestrator

Create `apps/web/src/components/gallery/GalleryExperience.tsx`.

Responsibilities:

- initialize Three.js renderer/camera/controls,
- add sky, curved map surface, and geo media layer,
- own scene-wide animation loop,
- own raycaster and scene object registry for click handling,
- expose simple props: `mediaImages`, `nightMode`, `onImageSelect`.

This replaces `GalleryScene` as the top-level scene container.

### Curved Map Surface

Create `apps/web/src/components/gallery/CurvedMapSurface.tsx`.

Responsibilities:

- build the curved geometry from a subdivided plane,
- apply static map texture / gradient / outline material,
- compute or delegate surface sampling,
- expose a sampler contract to media-placement code.

This component must not know about cards, search state, or modal state.

### Geo Media Layer

Create `apps/web/src/components/gallery/GeoMediaLayer.tsx`.

Responsibilities:

- translate media items into card placements using the sampler,
- render front/back card meshes,
- control lift, stack separation, distance fading, and light animation,
- attach click metadata for raycasting.

This component must not know how the map geometry is built.

### Projection / Math Layer

Create:

- `apps/web/src/features/gallery/useCurvedMapProjection.ts`
- `apps/web/src/features/gallery/gallerySceneMath.ts`

Responsibilities:

- pure coordinate transforms,
- normalized UV calculation,
- curved world-point generation,
- normal/tangent derivation,
- cluster offset strategy for overlapping media points.

These files are the critical seam for weak-model implementation.

---

## Coordinate Model

### Geographic Bounds

For the first version, keep the current China-oriented bounds:

- `LNG_MIN = 73`
- `LNG_MAX = 135`
- `LAT_MIN = 18`
- `LAT_MAX = 54`

These remain presentation bounds, not domain constraints.

### UV Mapping

Convert longitude/latitude to normalized map space:

```ts
u = (lng - LNG_MIN) / (LNG_MAX - LNG_MIN)
v = 1 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN)
```

Clamp values to `[0, 1]` for render safety.

### Curved Surface Mapping

Treat the map as a bent ribbon around the viewer:

```ts
angle = lerp(-arcSpan / 2, arcSpan / 2, u)
x = Math.sin(angle) * radius
z = Math.cos(angle) * radius - radius
y = lerp(mapTop, mapBottom, v)
```

This produces a readable orbital wall instead of a flat plane.

### Surface Sampling

Every anchored media item needs:

- surface point,
- surface normal,
- tangent,
- bitangent,
- lift offset.

Target sampler contract:

```ts
interface CurvedMapSampler {
  getUvAt(lng: number, lat: number): { u: number; v: number };
  getPointAt(lng: number, lat: number): THREE.Vector3;
  getNormalAt(lng: number, lat: number): THREE.Vector3;
  getTangentAt(lng: number, lat: number): THREE.Vector3;
}
```

`GeoMediaLayer` should depend on this interface, not on mesh internals.

---

## Visual Composition

### Layering

Within the Three.js scene:

1. sky dome,
2. curved map surface,
3. optional outline/glow accent layer,
4. geo-anchored media cards,
5. camera-facing atmosphere cues such as fog and fading.

No DOM map should exist underneath.

### Macro Orbital Feel

The orbital quality should come from:

- curved map geometry,
- cinematic intro camera path sliding across the arc,
- varying card lift heights,
- edge glow and distance fade,
- slow global ambient motion.

Do not recreate the old random ring placement.

### Card Orientation

Cards should be oriented primarily by the surface normal, with slight camera bias to avoid unreadable edge-on views.

Recommended orientation mode:

- face outward from the map surface,
- blend a small percentage toward camera-facing rotation,
- preserve enough surface alignment so cards still feel geographically attached.

---

## Fallback Rules

### Media With Coordinates

If `latitude` and `longitude` exist and fall within the configured bounds:

- anchor to curved map surface.

### Media Without Coordinates

For the first curved-map version, do not mix them into the old random orbital system.

Instead:

- place them in a designated fallback ribbon at one side or lower edge of the curved map installation,
- mark them visually as “unplaced” presentation items,
- keep them clickable and stylistically consistent.

This avoids mixing two incompatible spatial grammars.

---

## Interaction Model

Keep interaction simple in v1:

- drag to orbit camera,
- wheel / pinch to zoom within constrained bounds,
- click on card to open modal,
- hover lift or emissive boost is optional,
- no map editing,
- no map click-to-focus in first version.

The camera target should remain fixed near the center of the curved map surface.

---

## Material / Asset Strategy

The gallery scene should not depend on live MapLibre tiles.

Use one of:

- a pre-generated static map texture,
- a project-local rasterized artwork,
- or a stylized vector-outline texture baked into the repo.

First version recommendation:

- one base diffuse texture,
- one optional alpha/outline overlay,
- one lightweight glow treatment in shader or additive mesh.

This is enough to establish the spatial concept without introducing tile-streaming complexity.

---

## File Responsibilities

### New Files

- `apps/web/src/components/gallery/GalleryExperience.tsx`
- `apps/web/src/components/gallery/CurvedMapSurface.tsx`
- `apps/web/src/components/gallery/GeoMediaLayer.tsx`
- `apps/web/src/features/gallery/useCurvedMapProjection.ts`
- `apps/web/src/features/gallery/gallerySceneMath.ts`
- `apps/web/src/features/gallery/gallerySceneMath.test.ts`
- `apps/web/src/features/gallery/useCurvedMapProjection.test.ts`
- `apps/web/src/components/gallery/CurvedMapSurface.test.tsx`
- `apps/web/src/components/gallery/GeoMediaLayer.test.tsx`

### Files To Modify

- [`apps/web/src/app/routes/gallery/GalleryHome.tsx`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\app\routes\gallery\GalleryHome.tsx)
- [`apps/web/src/components/site/SkyBackground.tsx`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\components\site\SkyBackground.tsx) only if scene integration requires small hooks
- [`apps/web/src/styles/index.css`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\styles\index.css) for any gallery overlay adjustments

### Files To De-emphasize

- [`apps/web/src/components/gallery/GalleryMapBase.tsx`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\components\gallery\GalleryMapBase.tsx)
- [`apps/web/src/features/gallery/useGalleryProjection.ts`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\features\gallery\useGalleryProjection.ts)
- [`apps/web/src/components/gallery/GalleryScene.tsx`](D:\VS vibe coding files\trace-scope-platform\apps\web\src\components\gallery\GalleryScene.tsx)

They may remain temporarily for migration, but should no longer define the final gallery architecture.

---

## Testing Strategy

Test the math and component seams first.

### Unit Tests

- `gallerySceneMath.test.ts`
  - lng/lat to UV mapping,
  - UV to curved world point,
  - normal orientation,
  - fallback placement grouping.

- `useCurvedMapProjection.test.ts`
  - coordinate-bearing media become anchored placements,
  - missing-coordinate media become fallback placements,
  - out-of-range coordinates clamp or reject consistently.

### Component Tests

- `CurvedMapSurface.test.tsx`
  - sampler is created,
  - scene object exists,
  - texture failure degrades safely.

- `GeoMediaLayer.test.tsx`
  - number of cards matches inputs,
  - card metadata survives for click selection,
  - fallback placements render distinctly.

Avoid pixel-perfect WebGL screenshot testing in the first pass.

---

## Risks

### Risk 1: Over-coupling geometry and content

If card placement logic lives inside the map mesh component, weak models will produce fragile edits. Keep sampler and card layer separate.

### Risk 2: Visual success with broken geographic semantics

A curved installation can look impressive while silently drifting from real geographic anchoring. Pure math tests are mandatory.

### Risk 3: Legacy layout leakage

If the old ring-based randomization survives in the new code path, the scene will feel inconsistent. The old orbital layout should not drive anchored cards.

### Risk 4: Performance regressions

Too many individual materials or textures can hurt performance. Reuse geometry where possible and keep material count controlled.

---

## Scope Limits

This design intentionally excludes:

- global map support,
- live tile streaming,
- complex GIS interactions,
- merging gallery with spin360 viewer logic,
- introducing new domain entities,
- converting the gallery into a generic dashboard map product.

---

## Success Criteria

The design is successful when:

- the gallery page renders as a single coherent Three.js installation,
- star sky and map coexist in the same scene,
- media cards with coordinates visibly sit above correct map regions,
- the scene still feels orbital and cinematic at a macro level,
- the route stays thin,
- geometry math is isolated enough for weak agents to implement step-by-step.

---

## 实现状态记录 - 2026-05-25

在 gallery 首页复查过程中，发现当前实现已经偏离本设计：

- `GalleryExperience` 仍在渲染 DOM MapLibre 地图面板。
- 对应测试明确断言 `flat-paper` 布局。
- Three.js 曲面地图 mesh 虽然存在，但只有 MapLibre 失败时才显示。

当前修正状态：

- gallery 路由已从 `PublicLayout` 中拆出。
- loader 已从 `GalleryHome` 挂载。
- `GalleryExperience` 不再使用 gallery 专用 MapLibre 面板。
- Three.js 曲面 mesh 默认可见，并已加入旋转场景 pivot。
- 补丁后聚焦测试和生产构建均通过。

待验证：

- 最新曲面场景补丁后还未重新截图。
- 下一次会话应进行视觉确认：页面非空、地图呈现为曲面 Three.js 装置、媒体卡片可见且可点击。
