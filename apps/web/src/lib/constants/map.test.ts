import { describe, expect, it } from 'vitest';
import {
  buildTiandituRasterStyle,
  DEFAULT_MAP_PROVIDER,
  MAP_CAMERA_DEFAULTS,
  MAP_ENV_KEYS,
  MAP_PROVIDER_OPTIONS,
  STAR_LAYER_DEFAULTS,
} from '@/lib/constants/map';

describe('map constants', () => {
  it('defines an open/free-first China map provider default and supported options', () => {
    expect(DEFAULT_MAP_PROVIDER).toBe('maplibre-tianditu');
    expect(MAP_PROVIDER_OPTIONS).toEqual(['maplibre-tianditu', 'tianditu', 'amap']);
  });

  it('defines stable camera defaults for the China 3D map substrate', () => {
    expect(MAP_CAMERA_DEFAULTS).toEqual({
      pitch: 55,
      zoom: 4.2,
      center: [104.1954, 35.8617],
    });
  });

  it('defines star layer visual defaults and env key names', () => {
    expect(STAR_LAYER_DEFAULTS).toEqual({
      nodeBaseRadius: 6,
      nodeGlowRadius: 18,
      edgeOpacity: 0.35,
      clusterOrbitRadius: 44,
    });
    expect(MAP_ENV_KEYS).toEqual({
      tiandituToken: 'VITE_TIANDITU_TOKEN',
      amapKey: 'VITE_AMAP_KEY',
    });
  });

  it('builds a Tianditu-backed MapLibre style with raster base and label sources', () => {
    const style = buildTiandituRasterStyle('demo-token');

    expect(style.version).toBe(8);
    expect(style.sources).toMatchObject({
      tiandituBase: {
        type: 'raster',
        tiles: [
          'https://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=demo-token',
        ],
        tileSize: 256,
      },
      tiandituLabels: {
        type: 'raster',
        tiles: [
          'https://t0.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=demo-token',
        ],
        tileSize: 256,
      },
    });
    expect(style.layers.map((layer) => layer.id)).toEqual(['tianditu-base', 'tianditu-labels']);
  });
});
