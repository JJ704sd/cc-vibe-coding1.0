import type { MapMediaCluster } from '@/features/map/model/mapViewModel';
import type { ProjectedMapNode } from './types';

interface MediaClusterLayerProps {
  cluster: MapMediaCluster | null;
  anchor: ProjectedMapNode | null;
}

export function MediaClusterLayer({ cluster, anchor }: MediaClusterLayerProps) {
  if (!cluster || !anchor || !anchor.isVisible) {
    return null;
  }

  return (
    <div
      className="map-media-cluster-layer"
      data-location-id={cluster.locationId ?? 'project'}
      style={{
        position: 'absolute',
        left: anchor.x,
        top: anchor.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="map-media-cluster-count">
        {cluster.mediaSetIds.length} media sets
      </div>
    </div>
  );
}
