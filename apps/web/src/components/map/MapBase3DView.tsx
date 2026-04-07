import { useEffect, useRef, useState } from 'react';
import {
  buildTiandituRasterStyle,
  DEFAULT_MAP_PROVIDER,
  MAP_CAMERA_DEFAULTS,
  MAP_ENV_KEYS,
} from '@/lib/constants/map';

interface MapBase3DViewProps {
  className?: string;
  onReady?: () => void;
}

type MapRuntimeStatus = 'idle' | 'missing-token' | 'ready' | 'error';

export function MapBase3DView({ className, onReady }: MapBase3DViewProps) {
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
        const maplibre = await import('maplibre-gl');

        if (disposed || !containerRef.current) {
          return;
        }

        const map = new maplibre.Map({
          container: containerRef.current,
          style: buildTiandituRasterStyle(tiandituToken),
          center: [...MAP_CAMERA_DEFAULTS.center],
          zoom: MAP_CAMERA_DEFAULTS.zoom,
          pitch: MAP_CAMERA_DEFAULTS.pitch,
          attributionControl: false,
        });

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
        });

        map.on('error', () => {
          if (!disposed) {
            setStatus('error');
          }
        });

        mapInstance = map;
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
