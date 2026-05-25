import { useEffect, useRef } from 'react';
import { MAP_CAMERA_DEFAULTS } from '@/lib/constants/map';
import {
  buildTiandituRasterStyle,
  DEFAULT_MAP_PROVIDER,
  MAP_ENV_KEYS,
} from '@/lib/constants/map';

// China center — shows full country at zoom 4
const CHINA_CENTER: [number, number] = [104.1954, 35.8617];

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
        center: CHINA_CENTER,
        zoom: 4,          // 显示全中国
        minZoom: 3,       // 允许缩小看更大范围
        maxZoom: 10,
        pitch: 0,          // 俯视全图，不用倾斜
        attributionControl: false,
      });

      mapRef.current = map;

      map.addControl(
        new maplibre.NavigationControl({
          showCompass: true,
          visualizePitch: true,
        }),
        'top-right',
      );

      // 显示缩放级别提示
      map.addControl(
        new maplibre.ScaleControl({ maxWidth: 120, unit: 'metric' }),
        'bottom-left',
      );
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
