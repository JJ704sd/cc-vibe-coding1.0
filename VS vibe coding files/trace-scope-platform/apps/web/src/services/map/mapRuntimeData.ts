import type { Feature, FeatureCollection, LineString } from 'geojson';
import type { Location, RouteEntity } from '@/types/domain';

export function buildRouteFeatureCollection(
  routes: RouteEntity[],
  locations: Location[],
  selectedRouteId?: string | null,
): FeatureCollection<LineString> {
  const locationMap = new Map(locations.map((location) => [location.id, location]));
  const features: Feature<LineString>[] = [];

  for (const route of routes) {
    const coordinates = route.locationIds
      .map((locationId) => locationMap.get(locationId))
      .filter((location): location is Location => Boolean(location))
      .map((location) => [location.longitude, location.latitude] as [number, number]);

    if (coordinates.length < 2) {
      continue;
    }

    features.push({
      type: 'Feature',
      properties: {
        id: route.id,
        color: route.color,
        width: route.id === selectedRouteId ? 5 : 3,
        opacity: route.id === selectedRouteId ? 1 : 0.45,
      },
      geometry: {
        type: 'LineString',
        coordinates,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
