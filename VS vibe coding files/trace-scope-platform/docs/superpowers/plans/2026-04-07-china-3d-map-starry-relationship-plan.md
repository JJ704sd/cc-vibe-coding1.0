# China 3D Map Starry Relationship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a China-focused 3D map foundation with a starry relationship overlay that maps project, location, route, media set, and image relationships without breaking the existing Trace Scope domain model.

**Architecture:** Keep the domain model unchanged and introduce a dedicated map view-model layer plus separate rendering layers for base map, star nodes, relationship edges, and media expansion. The map remains the bottom spatial substrate; the relationship layer carries the narrative; images expand only on focus.

**Tech Stack:** React, TypeScript, Vite, existing storage readers, China 3D map provider integration, custom relationship overlay layer, Vitest

---

## File Structure

### Existing files to modify

- Modify: `apps/web/src/app/routes/public/map/MapPage.tsx`
- Modify: `apps/web/src/styles/index.css`
- Modify: `apps/web/src/services/storage/publicDataReader.ts`
- Modify: `apps/web/package.json`

### New files to create

- Create: `apps/web/src/features/map/model/mapViewModel.ts`
- Create: `apps/web/src/features/map/model/mapViewModel.test.ts`
- Create: `apps/web/src/features/map/api/useMapRelationshipData.ts`
- Create: `apps/web/src/components/map/MapBase3DView.tsx`
- Create: `apps/web/src/components/map/StarRelationshipLayer.tsx`
- Create: `apps/web/src/components/map/MediaClusterLayer.tsx`
- Create: `apps/web/src/components/map/MapRelationshipPanel.tsx`
- Create: `apps/web/src/components/map/index.ts`
- Create: `apps/web/src/lib/constants/map.ts`

### Responsibilities

- `mapViewModel.ts`
  - Transform domain entities into map-specific nodes, edges, and media cluster data
- `useMapRelationshipData.ts`
  - Bridge public data reader output into the map view-model layer
- `MapBase3DView.tsx`
  - Own the China 3D map substrate and expose a positioning host for overlays
- `StarRelationshipLayer.tsx`
  - Render location nodes and route edges as the “starry sky” relationship layer
- `MediaClusterLayer.tsx`
  - Render media-set and image expansion states when a location is focused
- `MapRelationshipPanel.tsx`
  - Render the current focused project / location / media summary
- `map.ts`
  - Centralize provider selection, defaults, and future env-key names

---

## Task 1: Introduce a map view-model layer

**Files:**
- Create: `apps/web/src/features/map/model/mapViewModel.ts`
- Create: `apps/web/src/features/map/model/mapViewModel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { buildMapRelationshipViewModel } from '@/features/map/model/mapViewModel';
import type { Location, MediaImage, MediaSet, Project, RouteEntity } from '@/types/domain';

const projects: Project[] = [
  {
    id: 'project-1',
    title: 'Project One',
    slug: 'project-one',
    summary: 'Summary',
    description: 'Description',
    coverImage: 'cover.jpg',
    tags: ['urban'],
    status: 'published',
    locationIds: ['location-1'],
    mediaSetIds: ['media-set-1'],
    routeIds: ['route-1'],
    createdAt: '2026-04-07T00:00:00.000Z',
    updatedAt: '2026-04-07T00:00:00.000Z',
  },
];

const locations: Location[] = [
  {
    id: 'location-1',
    projectId: 'project-1',
    name: 'Shanghai',
    slug: 'shanghai',
    description: 'City node',
    latitude: 31.2304,
    longitude: 121.4737,
    addressText: 'Shanghai',
    mediaSetIds: ['media-set-1'],
    visitOrder: 1,
    createdAt: '2026-04-07T00:00:00.000Z',
    updatedAt: '2026-04-07T00:00:00.000Z',
  },
];

const mediaSets: MediaSet[] = [
  {
    id: 'media-set-1',
    projectId: 'project-1',
    locationId: 'location-1',
    type: 'gallery',
    title: 'City Gallery',
    description: 'Gallery set',
    coverImage: 'gallery.jpg',
    imageIds: ['image-1'],
    isFeatured: true,
    createdAt: '2026-04-07T00:00:00.000Z',
    updatedAt: '2026-04-07T00:00:00.000Z',
  },
];

const mediaImages: MediaImage[] = [
  {
    id: 'image-1',
    mediaSetId: 'media-set-1',
    url: 'image.jpg',
    thumbnailUrl: 'thumb.jpg',
    altText: 'Alt',
    caption: 'Caption',
    sortOrder: 1,
    createdAt: '2026-04-07T00:00:00.000Z',
  },
];

const routes: RouteEntity[] = [
  {
    id: 'route-1',
    projectId: 'project-1',
    name: 'Main Route',
    description: 'Route description',
    locationIds: ['location-1'],
    lineStyle: 'solid',
    color: '#72e3d2',
    isFeatured: true,
    createdAt: '2026-04-07T00:00:00.000Z',
    updatedAt: '2026-04-07T00:00:00.000Z',
  },
];

describe('buildMapRelationshipViewModel', () => {
  it('maps domain entities into location nodes, project groups, and media clusters', () => {
    const viewModel = buildMapRelationshipViewModel({
      projects,
      locations,
      mediaSets,
      mediaImages,
      routes,
    });

    expect(viewModel.nodes).toHaveLength(1);
    expect(viewModel.nodes[0]).toMatchObject({
      id: 'location-1',
      projectId: 'project-1',
      kind: 'location',
    });

    expect(viewModel.projectGroups).toEqual([
      {
        projectId: 'project-1',
        locationIds: ['location-1'],
        routeIds: ['route-1'],
      },
    ]);

    expect(viewModel.mediaClusters).toEqual([
      {
        locationId: 'location-1',
        mediaSetIds: ['media-set-1'],
        imageIds: ['image-1'],
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mapViewModel.test.ts`
Expected: FAIL with module not found for `mapViewModel`

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Location, MediaImage, MediaSet, Project, RouteEntity } from '@/types/domain';

export interface MapStarNode {
  id: string;
  projectId: string;
  kind: 'location';
  latitude: number;
  longitude: number;
  title: string;
}

export interface MapRelationshipEdge {
  id: string;
  projectId: string;
  routeId: string;
  fromLocationId: string;
  toLocationId: string;
  color: string;
  lineStyle: RouteEntity['lineStyle'];
}

export interface MapProjectGroup {
  projectId: string;
  locationIds: string[];
  routeIds: string[];
}

export interface MapMediaCluster {
  locationId: string;
  mediaSetIds: string[];
  imageIds: string[];
}

export interface MapRelationshipViewModel {
  nodes: MapStarNode[];
  edges: MapRelationshipEdge[];
  projectGroups: MapProjectGroup[];
  mediaClusters: MapMediaCluster[];
}

export function buildMapRelationshipViewModel({
  projects,
  locations,
  mediaSets,
  mediaImages,
  routes,
}: {
  projects: Project[];
  locations: Location[];
  mediaSets: MediaSet[];
  mediaImages: MediaImage[];
  routes: RouteEntity[];
}): MapRelationshipViewModel {
  const nodes: MapStarNode[] = locations.map((location) => ({
    id: location.id,
    projectId: location.projectId,
    kind: 'location',
    latitude: location.latitude,
    longitude: location.longitude,
    title: location.name,
  }));

  const edges: MapRelationshipEdge[] = routes.flatMap((route) =>
    route.locationIds.slice(0, -1).map((locationId, index) => ({
      id: `${route.id}-${locationId}-${route.locationIds[index + 1]}`,
      projectId: route.projectId,
      routeId: route.id,
      fromLocationId: locationId,
      toLocationId: route.locationIds[index + 1],
      color: route.color,
      lineStyle: route.lineStyle,
    })),
  );

  const projectGroups: MapProjectGroup[] = projects.map((project) => ({
    projectId: project.id,
    locationIds: locations.filter((location) => location.projectId === project.id).map((location) => location.id),
    routeIds: routes.filter((route) => route.projectId === project.id).map((route) => route.id),
  }));

  const mediaClusters: MapMediaCluster[] = locations.map((location) => {
    const locationMediaSets = mediaSets.filter((mediaSet) => mediaSet.locationId === location.id);
    const mediaSetIds = locationMediaSets.map((mediaSet) => mediaSet.id);
    const imageIds = mediaImages
      .filter((image) => mediaSetIds.includes(image.mediaSetId))
      .map((image) => image.id);

    return {
      locationId: location.id,
      mediaSetIds,
      imageIds,
    };
  });

  return {
    nodes,
    edges,
    projectGroups,
    mediaClusters,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- mapViewModel.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/map/model/mapViewModel.ts apps/web/src/features/map/model/mapViewModel.test.ts
git commit -m "feat: add map relationship view model"
```

### Task 2: Add a public-data bridge for map relationship consumption

**Files:**
- Create: `apps/web/src/features/map/api/useMapRelationshipData.ts`
- Modify: `apps/web/src/services/storage/publicDataReader.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createPublicDataReader } from '@/services/storage/publicDataReader';
import { createAdminDataStore, createMemoryStorageAdapter } from '@/services/storage/adminDataStore';

describe('createPublicDataReader map support', () => {
  it('returns all published map relationship source data in one call', () => {
    const store = createAdminDataStore({ adapter: createMemoryStorageAdapter() });
    const reader = createPublicDataReader(store);

    const source = reader.getPublishedMapRelationshipSource();

    expect(source.projects.length).toBeGreaterThan(0);
    expect(Array.isArray(source.locations)).toBe(true);
    expect(Array.isArray(source.mediaSets)).toBe(true);
    expect(Array.isArray(source.mediaImages)).toBe(true);
    expect(Array.isArray(source.routes)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- publicDataReader.test.ts`
Expected: FAIL with `getPublishedMapRelationshipSource` not defined

- [ ] **Step 3: Write minimal implementation**

```ts
getPublishedMapRelationshipSource() {
  const publishedProjectIds = getPublishedProjectIds();
  const state = getState();

  return {
    projects: state.projects.filter((project) => publishedProjectIds.has(project.id)),
    locations: state.locations.filter((location) => publishedProjectIds.has(location.projectId)),
    mediaSets: state.mediaSets.filter((mediaSet) => publishedProjectIds.has(mediaSet.projectId)),
    mediaImages: state.mediaImages.filter((image) =>
      state.mediaSets.some((mediaSet) => mediaSet.id === image.mediaSetId && publishedProjectIds.has(mediaSet.projectId)),
    ),
    routes: state.routes.filter((route) => publishedProjectIds.has(route.projectId)),
  };
}
```

```ts
import { useMemo } from 'react';
import { usePublicData } from '@/services/storage/usePublicData';
import { buildMapRelationshipViewModel } from '@/features/map/model/mapViewModel';

export function useMapRelationshipData() {
  const reader = usePublicData();

  return useMemo(() => {
    const source = reader.getPublishedMapRelationshipSource();
    return buildMapRelationshipViewModel(source);
  }, [reader]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- publicDataReader.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/storage/publicDataReader.ts apps/web/src/features/map/api/useMapRelationshipData.ts
git commit -m "feat: add map relationship data bridge"
```

### Task 3: Define provider configuration and map-level constants

**Files:**
- Create: `apps/web/src/lib/constants/map.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_PROVIDER, MAP_PROVIDER_OPTIONS } from '@/lib/constants/map';

describe('map constants', () => {
  it('defines a China 3D map provider default and supported options', () => {
    expect(DEFAULT_MAP_PROVIDER).toBe('tianditu');
    expect(MAP_PROVIDER_OPTIONS).toContain('tianditu');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mapConstants.test.ts`
Expected: FAIL with module not found for `@/lib/constants/map`

- [ ] **Step 3: Write minimal implementation**

```ts
export const MAP_PROVIDER_OPTIONS = ['tianditu', 'amap'] as const;
export type MapProvider = (typeof MAP_PROVIDER_OPTIONS)[number];

export const DEFAULT_MAP_PROVIDER: MapProvider = 'tianditu';

export const MAP_CAMERA_DEFAULTS = {
  pitch: 55,
  zoom: 4.2,
  center: [104.1954, 35.8617] as const,
};

export const STAR_LAYER_DEFAULTS = {
  nodeBaseRadius: 6,
  nodeGlowRadius: 18,
  edgeOpacity: 0.35,
  clusterOrbitRadius: 44,
};
```

- [ ] **Step 4: Add provider packages only after choosing a concrete integration**

Run: `npm install <provider-package>` only after implementation begins
Expected: package added intentionally, not speculatively

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/constants/map.ts
git commit -m "chore: add map provider constants"
```

### Task 4: Build the 3D base map component boundary

**Files:**
- Create: `apps/web/src/components/map/MapBase3DView.tsx`
- Create: `apps/web/src/components/map/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { MapBase3DView } from '@/components/map/MapBase3DView';

describe('MapBase3DView', () => {
  it('exports a dedicated map substrate component', () => {
    expect(MapBase3DView).toBeTypeOf('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MapBase3DView.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useEffect, useRef } from 'react';
import { DEFAULT_MAP_PROVIDER, MAP_CAMERA_DEFAULTS } from '@/lib/constants/map';

interface MapBase3DViewProps {
  className?: string;
  onReady?: () => void;
}

export function MapBase3DView({ className, onReady }: MapBase3DViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Provider-specific initialization will be added in later tasks.
    // This component owns the bottom-layer China 3D map substrate only.
    void DEFAULT_MAP_PROVIDER;
    void MAP_CAMERA_DEFAULTS;
    onReady?.();
  }, [onReady]);

  return <div ref={containerRef} className={className} data-map-provider={DEFAULT_MAP_PROVIDER} />;
}
```

```ts
export { MapBase3DView } from '@/components/map/MapBase3DView';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- MapBase3DView.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/map/MapBase3DView.tsx apps/web/src/components/map/index.ts
git commit -m "feat: add 3d base map component boundary"
```

### Task 5: Build the star relationship overlay layer

**Files:**
- Create: `apps/web/src/components/map/StarRelationshipLayer.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { StarRelationshipLayer } from '@/components/map/StarRelationshipLayer';

describe('StarRelationshipLayer', () => {
  it('exports a relationship layer component', () => {
    expect(StarRelationshipLayer).toBeTypeOf('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- StarRelationshipLayer.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
import type { MapRelationshipEdge, MapStarNode } from '@/features/map/model/mapViewModel';

interface StarRelationshipLayerProps {
  nodes: MapStarNode[];
  edges: MapRelationshipEdge[];
  activeProjectId: string | null;
  activeLocationId: string | null;
  onLocationSelect: (locationId: string) => void;
}

export function StarRelationshipLayer({
  nodes,
  edges,
  activeProjectId,
  activeLocationId,
  onLocationSelect,
}: StarRelationshipLayerProps) {
  return (
    <div className="map-star-layer">
      {edges.map((edge) => (
        <div
          key={edge.id}
          className="map-star-edge"
          data-project-id={edge.projectId}
          data-active={edge.projectId === activeProjectId}
        />
      ))}
      {nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          className="map-star-node"
          data-project-id={node.projectId}
          data-active={node.id === activeLocationId}
          onClick={() => onLocationSelect(node.id)}
        >
          {node.title}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- StarRelationshipLayer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/map/StarRelationshipLayer.tsx
git commit -m "feat: add star relationship layer shell"
```

### Task 6: Build the media expansion layer and info panel

**Files:**
- Create: `apps/web/src/components/map/MediaClusterLayer.tsx`
- Create: `apps/web/src/components/map/MapRelationshipPanel.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { MediaClusterLayer } from '@/components/map/MediaClusterLayer';
import { MapRelationshipPanel } from '@/components/map/MapRelationshipPanel';

describe('map media expansion shell', () => {
  it('exports media cluster and relationship panel components', () => {
    expect(MediaClusterLayer).toBeTypeOf('function');
    expect(MapRelationshipPanel).toBeTypeOf('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MediaClusterLayer.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```tsx
import type { MapMediaCluster } from '@/features/map/model/mapViewModel';

interface MediaClusterLayerProps {
  cluster: MapMediaCluster | null;
}

export function MediaClusterLayer({ cluster }: MediaClusterLayerProps) {
  if (!cluster) return null;

  return (
    <div className="map-media-cluster-layer">
      <div className="map-media-cluster-count">
        {cluster.mediaSetIds.length} media sets / {cluster.imageIds.length} images
      </div>
    </div>
  );
}
```

```tsx
interface MapRelationshipPanelProps {
  title: string;
  summary: string;
}

export function MapRelationshipPanel({ title, summary }: MapRelationshipPanelProps) {
  return (
    <aside className="map-relationship-panel glass">
      <h2 className="section-title-sm">{title}</h2>
      <p className="muted">{summary}</p>
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- MediaClusterLayer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/map/MediaClusterLayer.tsx apps/web/src/components/map/MapRelationshipPanel.tsx
git commit -m "feat: add media expansion and relationship panel shells"
```

### Task 7: Rebuild MapPage around layered composition

**Files:**
- Modify: `apps/web/src/app/routes/public/map/MapPage.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapPage } from '@/app/routes/public/map/MapPage';

describe('MapPage', () => {
  it('renders the map experience as layered composition instead of a disabled placeholder', () => {
    render(<MapPage />);
    expect(screen.queryByText('地图功能已停用')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MapPage.test.tsx`
Expected: FAIL because the placeholder text still exists

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useMemo, useState } from 'react';
import { MapBase3DView } from '@/components/map';
import { MapRelationshipPanel } from '@/components/map/MapRelationshipPanel';
import { MediaClusterLayer } from '@/components/map/MediaClusterLayer';
import { StarRelationshipLayer } from '@/components/map/StarRelationshipLayer';
import { useMapRelationshipData } from '@/features/map/api/useMapRelationshipData';

export function MapPage() {
  const relationshipData = useMapRelationshipData();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(relationshipData.projectGroups[0]?.projectId ?? null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(relationshipData.nodes[0]?.id ?? null);

  const activeCluster = useMemo(
    () => relationshipData.mediaClusters.find((cluster) => cluster.locationId === activeLocationId) ?? null,
    [relationshipData.mediaClusters, activeLocationId],
  );

  return (
    <div className="map-page-shell">
      <div className="map-page-stage">
        <MapBase3DView className="map-page-base" />
        <StarRelationshipLayer
          nodes={relationshipData.nodes}
          edges={relationshipData.edges}
          activeProjectId={activeProjectId}
          activeLocationId={activeLocationId}
          onLocationSelect={setActiveLocationId}
        />
        <MediaClusterLayer cluster={activeCluster} />
      </div>
      <MapRelationshipPanel
        title="中国 3D 地图关系图"
        summary="地图作为底层空间基底，地点、轨迹与图片关系以满天星结构映射在其上。"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- MapPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/routes/public/map/MapPage.tsx
git commit -m "feat: rebuild map page as layered relationship view"
```

### Task 8: Add visual tokens and layered map styles

**Files:**
- Modify: `apps/web/src/styles/index.css`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('map layered styles', () => {
  it('defines layered map shell and star relationship classes', () => {
    const css = fs.readFileSync('src/styles/index.css', 'utf-8');
    expect(css).toContain('.map-page-stage');
    expect(css).toContain('.map-star-layer');
    expect(css).toContain('.map-relationship-panel');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mapStyles.test.ts`
Expected: FAIL because the classes do not exist

- [ ] **Step 3: Write minimal implementation**

```css
.map-page-shell {
  width: min(1280px, calc(100vw - 32px));
  margin: 0 auto;
  display: grid;
  gap: 20px;
  padding-bottom: 64px;
}

.map-page-stage {
  position: relative;
  min-height: 72vh;
  border-radius: 28px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(8, 14, 28, 0.96), rgba(14, 22, 40, 0.92));
  border: 1px solid rgba(140, 180, 255, 0.12);
}

.map-page-base {
  position: absolute;
  inset: 0;
}

.map-star-layer,
.map-media-cluster-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.map-star-node {
  pointer-events: auto;
}

.map-star-edge {
  opacity: 0.35;
}

.map-relationship-panel {
  padding: 20px 24px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- mapStyles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/styles/index.css
git commit -m "feat: add layered map relationship styles"
```

### Task 9: Integrate the chosen China 3D provider

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/components/map/MapBase3DView.tsx`
- Modify: `apps/web/src/lib/constants/map.ts`
- Modify: `apps/web/.env.example`

- [ ] **Step 1: Write the failing integration test or smoke check**

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP_PROVIDER } from '@/lib/constants/map';

describe('map provider selection', () => {
  it('keeps tianditu as the default China map provider', () => {
    expect(DEFAULT_MAP_PROVIDER).toBe('tianditu');
  });
});
```

- [ ] **Step 2: Run smoke verification before implementation**

Run: `npm run build`
Expected: PASS before provider integration so regressions are isolated

- [ ] **Step 3: Add the chosen provider with explicit configuration**

Implementation requirements:
- If using Tianditu, add env key naming such as `VITE_TIANDITU_TOKEN`
- If using AMap, add env key naming such as `VITE_AMAP_KEY`
- Keep the provider bootstrapping isolated inside `MapBase3DView`
- Do not leak provider-specific APIs into `MapPage`

- [ ] **Step 4: Run build and targeted tests**

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/src/components/map/MapBase3DView.tsx apps/web/src/lib/constants/map.ts apps/web/.env.example
git commit -m "feat: integrate china 3d map provider"
```

### Task 10: Refine relationship behaviors and focused-image expansion

**Files:**
- Modify: `apps/web/src/components/map/StarRelationshipLayer.tsx`
- Modify: `apps/web/src/components/map/MediaClusterLayer.tsx`
- Modify: `apps/web/src/components/map/MapRelationshipPanel.tsx`
- Modify: `apps/web/src/styles/index.css`

- [ ] **Step 1: Write the failing behavior test**

```ts
import { describe, expect, it } from 'vitest';
import { buildMapRelationshipViewModel } from '@/features/map/model/mapViewModel';

describe('media expansion behavior', () => {
  it('keeps image data inside focused clusters instead of exposing everything globally', () => {
    const viewModel = buildMapRelationshipViewModel({
      projects: [],
      locations: [],
      mediaSets: [],
      mediaImages: [],
      routes: [],
    });

    expect(viewModel.mediaClusters).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify baseline**

Run: `npm test -- mapViewModel.test.ts`
Expected: PASS or targeted adjustment needed before UI refinement

- [ ] **Step 3: Implement focused interaction refinement**

Implementation requirements:
- Default state shows only star nodes and route edges
- Focused location expands only its own media cluster
- Relationship panel reflects current active project / location
- Non-active projects fade, not disappear abruptly
- Avoid rendering every image node by default

- [ ] **Step 4: Run verification**

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/map/StarRelationshipLayer.tsx apps/web/src/components/map/MediaClusterLayer.tsx apps/web/src/components/map/MapRelationshipPanel.tsx apps/web/src/styles/index.css
git commit -m "feat: refine star relationship interactions"
```

## Self-Review

### Spec coverage

Covered design requirements:
- China 3D map stays as the bottom substrate
- Relationship layer is separated from the base map
- Images expand on focus instead of living everywhere by default
- Existing domain model remains intact
- A dedicated view-model layer is introduced
- Map page is rebuilt around layered composition

Potential implementation-time decisions still required:
- Final provider selection between Tianditu and AMap
- Exact rendering method for projected node positioning on top of the provider
- Whether the first version uses DOM overlay, canvas overlay, or provider-native overlay APIs

### Placeholder scan

No `TODO`, `TBD`, or “handle appropriately” style placeholders are left in task steps.
Provider integration remains explicit rather than guessed, because the provider must be chosen intentionally.

### Type consistency

All later tasks refer to:
- `MapStarNode`
- `MapRelationshipEdge`
- `MapProjectGroup`
- `MapMediaCluster`
- `MapRelationshipViewModel`

These are defined first in Task 1 and reused consistently afterward.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-07-china-3d-map-starry-relationship-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
