import { useEffect, useRef } from 'react';
import { MAP_CAMERA_DEFAULTS } from '@/lib/constants/map';
import {
  buildTiandituRasterStyle,
  DEFAULT_MAP_PROVIDER,
  MAP_ENV_KEYS,
} from '@/lib/constants/map';

export function GalleryMapBase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);

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

      mapRef.current = map;

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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
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
