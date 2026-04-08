import { useMemo, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  MapBase3DView,
  MapRelationshipPanel,
  MediaClusterLayer,
  MapProjectionOverlay,
} from '@/components/map';
import { useMapRelationshipData } from '@/features/map/api/useMapRelationshipData';
import { useProjectedMapGraph } from '@/features/map/projection/useProjectedMapGraph';

export function MapPage() {
  const [mapInstance, setMapInstance] = useState<MaplibreMap | null>(null);
  const relationshipData = useMapRelationshipData();
  const [activeProjectId] = useState<string | null>(
    relationshipData.projectGroups[0]?.projectId ?? null,
  );
  const [activeLocationId, setActiveLocationId] = useState<string | null>(
    relationshipData.nodes[0]?.id ?? null,
  );

  // Project nodes and edges using the live map instance
  const projected = useProjectedMapGraph({
    map: mapInstance,
    viewModel: {
      nodes: relationshipData.nodes,
      edges: relationshipData.edges,
    },
  });

  // Derive the active anchor (projected node matching activeLocationId)
  const activeAnchor = useMemo(
    () => projected.nodes.find((n) => n.id === activeLocationId) ?? null,
    [projected.nodes, activeLocationId],
  );

  const activeCluster = useMemo(
    () =>
      relationshipData.mediaClusters.find(
        (cluster) => cluster.locationId === activeLocationId,
      ) ?? null,
    [relationshipData.mediaClusters, activeLocationId],
  );

  const activeProject =
    relationshipData.projectGroups.find((group) => group.projectId === activeProjectId) ?? null;
  const activeNode = relationshipData.nodes.find((node) => node.id === activeLocationId) ?? null;

  return (
    <div className="map-page-shell">
      <div className="map-page-stage">
        <MapBase3DView
          className="map-page-base"
          onMapReady={setMapInstance}
        />
        <MapProjectionOverlay
          width={projected.width}
          height={projected.height}
          nodes={projected.nodes}
          edges={projected.edges}
          activeProjectId={activeProjectId}
          activeLocationId={activeLocationId}
          onLocationSelect={setActiveLocationId}
        />
        <MediaClusterLayer cluster={activeCluster} anchor={activeAnchor} />
      </div>

      <MapRelationshipPanel
        title={activeNode?.title ?? activeProject?.title ?? '中国 3D 地图关系图'}
        summary={
          activeNode?.description ??
          activeProject?.summary ??
          '地图作为底层空间基底，地点、轨迹与图片关系以满天星结构映射在其上。'
        }
      />
    </div>
  );
}
