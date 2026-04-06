import type mapboxgl from 'mapbox-gl';
import type { Location, RouteEntity } from '@/types/domain';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_STYLE, DEFAULT_MAP_ZOOM } from '@/services/map/mapConfig';
import { buildRouteFeatureCollection } from '@/services/map/mapRuntimeData';

const ROUTE_SOURCE_ID = 'trace-scope-routes';
const ROUTE_LAYER_ID = 'trace-scope-routes-layer';

export type MapboxModule = typeof import('mapbox-gl');

export async function loadMapboxModule(): Promise<MapboxModule> {
  return import('mapbox-gl');
}

export function createInteractiveMap(args: {
  mapboxgl: MapboxModule;
  container: HTMLDivElement;
  accessToken: string;
}) {
  const { mapboxgl, container, accessToken } = args;
  mapboxgl.default.accessToken = accessToken;

  return new mapboxgl.default.Map({
    container,
    style: DEFAULT_MAP_STYLE,
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
  });
}

export function syncLocationMarkers(args: {
  mapboxgl: MapboxModule;
  map: mapboxgl.Map;
  locations: Location[];
  selectedLocationId?: string | null;
  onLocationSelect?: (locationId: string) => void;
  markerRefs: Map<string, mapboxgl.Marker>;
}) {
  const { mapboxgl, map, locations, selectedLocationId, onLocationSelect, markerRefs } = args;
  const activeIds = new Set(locations.map((location) => location.id));

  for (const [locationId, marker] of markerRefs.entries()) {
    if (!activeIds.has(locationId)) {
      marker.remove();
      markerRefs.delete(locationId);
    }
  }

  for (const location of locations) {
    let marker = markerRefs.get(location.id);
    let element = marker?.getElement() as HTMLButtonElement | undefined;

    if (!marker || !element) {
      element = document.createElement('button');
      element.type = 'button';
      element.setAttribute('aria-label', `选择地点 ${location.name}`);
      element.style.width = '18px';
      element.style.height = '18px';
      element.style.borderRadius = '999px';
      element.style.border = '2px solid rgba(255,255,255,0.9)';
      element.style.background = '#72e3d2';
      element.style.boxShadow = '0 0 0 6px rgba(114, 227, 210, 0.18)';
      element.style.cursor = 'pointer';
      element.addEventListener('click', () => onLocationSelect?.(location.id));

      marker = new mapboxgl.default.Marker({ element })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map);

      markerRefs.set(location.id, marker);
    } else {
      marker.setLngLat([location.longitude, location.latitude]);
    }

    element.style.background = location.id === selectedLocationId ? '#ff9b67' : '#72e3d2';
    element.style.boxShadow = location.id === selectedLocationId
      ? '0 0 0 8px rgba(255, 155, 103, 0.20)'
      : '0 0 0 6px rgba(114, 227, 210, 0.18)';
  }
}

export function syncRoutePolylines(args: {
  map: mapboxgl.Map;
  routes: RouteEntity[];
  locations: Location[];
  selectedRouteId?: string | null;
}) {
  const { map, routes, locations, selectedRouteId } = args;
  const data = buildRouteFeatureCollection(routes, locations, selectedRouteId);

  const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }

  map.addSource(ROUTE_SOURCE_ID, {
    type: 'geojson',
    data,
  });

  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: ROUTE_SOURCE_ID,
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['get', 'width'],
      'line-opacity': ['get', 'opacity'],
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
  });
}

export function syncInteractiveMap(args: {
  mapboxgl: MapboxModule;
  map: mapboxgl.Map;
  locations: Location[];
  routes: RouteEntity[];
  selectedLocationId?: string | null;
  selectedRouteId?: string | null;
  onLocationSelect?: (locationId: string) => void;
  markerRefs: Map<string, mapboxgl.Marker>;
}) {
  const { mapboxgl, map, locations, routes, selectedLocationId, selectedRouteId, onLocationSelect, markerRefs } = args;

  syncLocationMarkers({
    mapboxgl,
    map,
    locations,
    selectedLocationId,
    onLocationSelect,
    markerRefs,
  });

  syncRoutePolylines({
    map,
    routes,
    locations,
    selectedRouteId,
  });
}
