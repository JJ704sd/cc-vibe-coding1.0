import type { StyleSpecification } from 'maplibre-gl';

export const MAP_PROVIDER_OPTIONS = ['maplibre-tianditu', 'tianditu', 'amap'] as const;

export type MapProvider = (typeof MAP_PROVIDER_OPTIONS)[number];

// Open/free-first China map route:
// use MapLibre as the open-source rendering layer with Tianditu as the China map source.
export const DEFAULT_MAP_PROVIDER: MapProvider = 'maplibre-tianditu';

export const MAP_CAMERA_DEFAULTS = {
  pitch: 55,
  zoom: 4.2,
  center: [104.1954, 35.8617] as const,
};

export const STAR_LAYER_DEFAULTS = {
  nodeBaseRadius: 6,
  nodeGlowRadius: 18,
  edgeOpacity: 0.35,
  clusterOrbitRadius: 44,
};

export const MAP_ENV_KEYS = {
  tiandituToken: 'VITE_TIANDITU_TOKEN',
  amapKey: 'VITE_AMAP_KEY',
} as const;

function buildTiandituWmtsUrl(layer: 'img' | 'cia', token: string) {
  return `https://t0.tianditu.gov.cn/${layer}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${token}`;
}

export function buildTiandituRasterStyle(token: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      tiandituBase: {
        type: 'raster',
        tiles: [buildTiandituWmtsUrl('img', token)],
        tileSize: 256,
      },
      tiandituLabels: {
        type: 'raster',
        tiles: [buildTiandituWmtsUrl('cia', token)],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: 'tianditu-base',
        type: 'raster',
        source: 'tiandituBase',
      },
      {
        id: 'tianditu-labels',
        type: 'raster',
        source: 'tiandituLabels',
      },
    ],
  };
}
