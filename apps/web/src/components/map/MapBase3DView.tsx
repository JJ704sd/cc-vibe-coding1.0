import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  DEFAULT_MAP_PROVIDER,
  loadTiandituRasterStyle,
  MAP_CAMERA_DEFAULTS,
  MAP_ENV_KEYS,
} from '@/lib/constants/map';

interface MapBase3DViewProps {
  className?: string;
  onReady?: () => void;
  onMapReady?: (map: MaplibreMap) => void;
}

type MapRuntimeStatus = 'idle' | 'missing-token' | 'ready' | 'error';

export function MapBase3DView({ className, onReady, onMapReady }: MapBase3DViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<MapRuntimeStatus>('idle');

  useEffect(() => {
    let disposed = false;
    let mapInstance: { remove: () => void } | null = null;

    async function bootstrap() {
      if (!containerRef.current) {
        return;
      }

      if (DEFAULT_MAP_PROVIDER !== 'maplibre-tianditu') {
        setStatus('ready');
        onReady?.();
        return;
      }

      const tiandituToken = import.meta.env[MAP_ENV_KEYS.tiandituToken];

      if (!tiandituToken) {
        setStatus('missing-token');
        return;
      }

      try {
        const { maplibre, style } = await loadTiandituRasterStyle(tiandituToken);

        if (disposed || !containerRef.current) {
          return;
        }

        const map = new maplibre.Map({
          container: containerRef.current,
          style,
          center: [...MAP_CAMERA_DEFAULTS.center],
          zoom: MAP_CAMERA_DEFAULTS.zoom,
          pitch: MAP_CAMERA_DEFAULTS.pitch,
          attributionControl: false,
        });

        // BUG-024: assign mapInstance immediately after construction so
        // the cleanup callback (which fires if the component unmounts
        // between `new maplibre.Map(...)` and the addControl/on calls
        // below) can still reach the instance and call .remove().
        // Without this, a map created in a stale effect run leaks the
        // WebGL context — visible as canvas accumulation in DevTools
        // Memory tab when navigating /map rapidly.
        mapInstance = map;

        if (disposed || !containerRef.current) {
          map.remove();
          return;
        }

        map.addControl(
          new maplibre.NavigationControl({
            showCompass: true,
            visualizePitch: true,
          }),
          'top-right',
        );

        map.on('load', () => {
          if (disposed) {
            return;
          }

          setStatus('ready');
          onReady?.();
          onMapReady?.(map);
        });

        map.on('error', () => {
          if (!disposed) {
            setStatus('error');
          }
        });
      } catch {
        if (!disposed) {
          setStatus('error');
        }
      }
    }

    void bootstrap();

    return () => {
      disposed = true;
      mapInstance?.remove();
    };
  }, [onReady]);

  return (
    <div
      ref={containerRef}
      className={className}
      data-map-status={status}
      data-map-provider={DEFAULT_MAP_PROVIDER}
      data-map-center={MAP_CAMERA_DEFAULTS.center.join(',')}
      data-map-pitch={MAP_CAMERA_DEFAULTS.pitch}
      data-map-zoom={MAP_CAMERA_DEFAULTS.zoom}
    >
      {status === 'missing-token' ? (
        <div className="map-base-status map-base-status--missing">
          配置天地图 Key 后启用中国地图底图
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="map-base-status map-base-status--error">
          中国地图底图加载失败
        </div>
      ) : null}
    </div>
  );
}
