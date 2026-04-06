import type { LngLatBoundsLike } from 'mapbox-gl';
import type { Location } from '@/types/domain';

export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? '';
export const DEFAULT_MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';
export const DEFAULT_MAP_CENTER: [number, number] = [121.4835, 31.2304];
export const DEFAULT_MAP_ZOOM = 11;

export function hasMapboxToken() {
  return MAPBOX_ACCESS_TOKEN.trim().length > 0;
}

export function getLocationBounds(locations: Location[]): LngLatBoundsLike | null {
  if (locations.length === 0) {
    return null;
  }

  const bounds: [[number, number], [number, number]] = [
    [locations[0].longitude, locations[0].latitude],
    [locations[0].longitude, locations[0].latitude],
  ];

  for (const location of locations) {
    bounds[0][0] = Math.min(bounds[0][0], location.longitude);
    bounds[0][1] = Math.min(bounds[0][1], location.latitude);
    bounds[1][0] = Math.max(bounds[1][0], location.longitude);
    bounds[1][1] = Math.max(bounds[1][1], location.latitude);
  }

  return bounds;
}
