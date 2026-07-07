import { useMemo, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useMapRelationshipData, type MapRelationshipDataState } from '@/features/map/api/useMapRelationshipData';
import { useProjectedMapGraph, type ProjectedMapGraphState } from '@/features/map/projection/useProjectedMapGraph';

export interface MapPageController {
  // --- state ---
  mapInstance: MaplibreMap | null;
  /** Captured once on first render from the leading project group — never updated. */
  activeProjectId: string | null;
  activeLocationId: string | null;

  // --- derived ---
  projected: ProjectedMapGraphState;
  activeAnchor: ProjectedMapGraphState['nodes'][number] | null;
  activeCluster: MapRelationshipDataState['mediaClusters'][number] | null;
  activeProject: MapRelationshipDataState['projectGroups'][number] | null;
  activeNode: MapRelationshipDataState['nodes'][number] | null;

  /**
   * Full upstream state — page needs `error` and `loading` for inline banners
   * and skeletons. Re-exposed so the page does not have to call the upstream
   * hook a second time.
   */
  relationshipData: MapRelationshipDataState;

  // --- actions ---
  setMapInstance: (map: MaplibreMap | null) => void;
  setActiveLocationId: (locationId: string | null) => void;
}

/**
 * BUG-014 — encapsulates MapPage state and projection logic so the route
 * component only renders JSX. Owns:
 *   - map instance handle (MaplibreMap | null)
 *   - active project / location selection (captured once on first render)
 *   - useProjectedMapGraph derivation
 *   - active anchor / cluster / project / node selectors
 *
 * The page is free to read `relationshipData.error` / `.loading` directly
 * for inline banners and skeletons without calling the upstream hook twice.
 */
export function useMapPageController(): MapPageController {
  const [mapInstance, setMapInstance] = useState<MaplibreMap | null>(null);
  const relationshipData = useMapRelationshipData();

  // activeProjectId is captured once — subsequent refetches of project groups
  // do not change which project is highlighted on the page.
  const [activeProjectId] = useState<string | null>(
    relationshipData.projectGroups[0]?.projectId ?? null,
  );

  const [activeLocationId, setActiveLocationId] = useState<string | null>(
    relationshipData.nodes[0]?.id ?? null,
  );

  // Project nodes and edges against the live map instance.
  const projected = useProjectedMapGraph({
    map: mapInstance,
    viewModel: {
      nodes: relationshipData.nodes,
      edges: relationshipData.edges,
    },
  });

  const activeAnchor = useMemo(
    () => projected.nodes.find((node) => node.id === activeLocationId) ?? null,
    [activeLocationId, projected.nodes],
  );

  const activeCluster = useMemo(
    () =>
      relationshipData.mediaClusters.find((cluster) => cluster.locationId === activeLocationId) ??
      null,
    [activeLocationId, relationshipData.mediaClusters],
  );

  const activeProject = useMemo(
    () => relationshipData.projectGroups.find((group) => group.projectId === activeProjectId) ?? null,
    [activeProjectId, relationshipData.projectGroups],
  );

  const activeNode = useMemo(
    () => relationshipData.nodes.find((node) => node.id === activeLocationId) ?? null,
    [activeLocationId, relationshipData.nodes],
  );

  return {
    // state
    mapInstance,
    activeProjectId,
    activeLocationId,

    // derived
    projected,
    activeAnchor,
    activeCluster,
    activeProject,
    activeNode,

    // upstream passthrough
    relationshipData,

    // actions
    setMapInstance,
    setActiveLocationId,
  };
}