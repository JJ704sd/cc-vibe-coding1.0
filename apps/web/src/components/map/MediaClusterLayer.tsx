import type { MapMediaCluster } from '@/features/map/model/mapViewModel';

interface MediaClusterLayerProps {
  cluster: MapMediaCluster | null;
}

export function MediaClusterLayer({ cluster }: MediaClusterLayerProps) {
  if (!cluster) {
    return null;
  }

  return (
    <div className="map-media-cluster-layer" data-location-id={cluster.locationId ?? 'project'}>
      <div className="map-media-cluster-count">
        {cluster.mediaSetIds.length} media sets
      </div>
    </div>
  );
}
