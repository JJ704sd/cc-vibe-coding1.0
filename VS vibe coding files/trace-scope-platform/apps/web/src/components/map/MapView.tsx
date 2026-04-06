import { useEffect, useMemo, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { Location, RouteEntity } from '@/types/domain';
import { getLocationBounds, hasMapboxToken, MAPBOX_ACCESS_TOKEN } from '@/services/map/mapConfig';
import { shouldInitializeInteractiveMap } from '@/services/map/mapRuntimeState';

export function MapView({
  locations,
  routes,
  selectedLocationId,
  selectedRouteId,
  onLocationSelect,
}: {
  locations: Location[];
  routes: RouteEntity[];
  selectedLocationId?: string | null;
  selectedRouteId?: string | null;
  onLocationSelect?: (locationId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  const bounds = useMemo(() => getLocationBounds(locations), [locations]);
  const tokenReady = hasMapboxToken();

  useEffect(() => {
    let disposed = false;

    async function initializeMap() {
      if (!shouldInitializeInteractiveMap({
        hasContainer: Boolean(containerRef.current),
        tokenReady,
        hasMapInstance: Boolean(mapRef.current),
      })) {
        return;
      }

      const { createInteractiveMap, loadMapboxModule } = await import('@/services/map/mapRuntime');
      const mapboxModule = await loadMapboxModule();
      if (!containerRef.current || disposed) {
        return;
      }

      const map = createInteractiveMap({
        mapboxgl: mapboxModule,
        container: containerRef.current,
        accessToken: MAPBOX_ACCESS_TOKEN,
      });

      map.addControl(new mapboxModule.default.NavigationControl(), 'top-right');
      map.on('load', () => {
        if (disposed) {
          return;
        }
        setMapReady(true);
        if (bounds) {
          map.fitBounds(bounds, { padding: 72, duration: 0 });
        }
      });

      mapRef.current = map;
    }

    initializeMap();

    return () => {
      disposed = true;
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [bounds, tokenReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    if (bounds) {
      map.fitBounds(bounds, { padding: 72, duration: 800 });
    }
  }, [bounds, mapReady]);

  useEffect(() => {
    let cancelled = false;

    async function updateRuntimeLayers() {
      const map = mapRef.current;
      if (!map || !mapReady) {
        return;
      }

      const { loadMapboxModule, syncInteractiveMap } = await import('@/services/map/mapRuntime');
      const mapboxModule = await loadMapboxModule();
      if (cancelled) {
        return;
      }

      syncInteractiveMap({
        mapboxgl: mapboxModule,
        map,
        locations,
        routes,
        selectedLocationId,
        selectedRouteId,
        onLocationSelect,
        markerRefs: markerRefs.current,
      });
    }

    updateRuntimeLayers();

    return () => {
      cancelled = true;
    };
  }, [locations, routes, selectedLocationId, selectedRouteId, onLocationSelect, mapReady]);

  return (
    <div className="glass" style={{ minHeight: '420px', padding: '24px', display: 'grid', gap: '16px' }}>
      <div>
        <h2 className="section-title">地图主区域</h2>
        <p className="muted">{tokenReady ? 'Mapbox 已接入。当前地图运行时代码按需加载，只有进入地图相关页面后才会请求地图核心依赖。' : '尚未检测到 VITE_MAPBOX_ACCESS_TOKEN。当前保留地图容器和交互边界，配置 Token 后即可显示真实地图。'}</p>
      </div>
      <div ref={containerRef} style={{ minHeight: '320px', borderRadius: '20px', overflow: 'hidden', background: 'rgba(0,0,0,0.06)' }} />
      <div className="muted" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div>地点数量：{locations.length}</div>
        <div>轨迹数量：{routes.length}</div>
        <div>地图状态：{tokenReady ? (mapReady ? '已加载' : '加载中') : '等待 Token'}</div>
      </div>
    </div>
  );
}
