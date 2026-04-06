import { useMemo, useState } from 'react';
import { MapView } from '@/components/map/MapView';
import { LocationMarkerLayer } from '@/components/map/LocationMarkerLayer';
import { RoutePolylineLayer } from '@/components/map/RoutePolylineLayer';
import { usePublicData } from '@/services/storage/usePublicData';

export function MapPage() {
  const reader = usePublicData();
  const locations = reader.getPublishedLocations();
  const routes = reader.getPublishedRoutes();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(locations[0]?.id ?? null);
  const [selectedRouteId] = useState<string | null>(routes[0]?.id ?? null);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId],
  );
  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  if (locations.length === 0) {
    return (
      <div className="page-shell" style={{ paddingBottom: '48px' }}>
        <div className="panel" style={{ padding: '48px', textAlign: 'center' }}>
          <div className="empty-state-icon" style={{ fontSize: '3rem' }}>🗺️</div>
          <h1 className="section-title mt-4">暂无可展示地图数据</h1>
          <p className="muted mt-2">请先在后台创建并发布项目，再为项目补充地点和轨迹。</p>
          <a href="/admin" className="badge badge-accent mt-4" style={{ display: 'inline-flex', padding: '12px 24px' }}>前往后台</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ display: 'grid', gap: '24px', paddingBottom: '48px' }}>
      <div className="panel" style={{ padding: '28px' }}>
        <h1 className="section-title">地图探索</h1>
        <p className="muted mt-2">
          共 {locations.length} 个地点，{routes.length} 条轨迹
          {selectedLocation && ` · 当前选中: ${selectedLocation.name}`}
        </p>
      </div>
      <MapView
        locations={locations}
        routes={routes}
        selectedLocationId={selectedLocationId}
        selectedRouteId={selectedRouteId}
        onLocationSelect={setSelectedLocationId}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <LocationMarkerLayer locations={locations} selectedLocationName={selectedLocation?.name ?? null} />
        <RoutePolylineLayer routes={routes} selectedRouteName={selectedRoute?.name ?? null} />
      </div>
    </div>
  );
}
