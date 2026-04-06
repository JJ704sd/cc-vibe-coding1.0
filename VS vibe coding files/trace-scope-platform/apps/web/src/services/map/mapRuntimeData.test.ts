import { describe, expect, it } from 'vitest';
import type { Location, RouteEntity } from '@/types/domain';
import { buildRouteFeatureCollection } from '@/services/map/mapRuntimeData';

const locations: Location[] = [
  { id: 'a', projectId: 'p', name: 'A', slug: 'a', description: '', latitude: 10, longitude: 20, addressText: '', mediaSetIds: [], visitOrder: 1, createdAt: '', updatedAt: '' },
  { id: 'b', projectId: 'p', name: 'B', slug: 'b', description: '', latitude: 11, longitude: 21, addressText: '', mediaSetIds: [], visitOrder: 2, createdAt: '', updatedAt: '' },
  { id: 'c', projectId: 'p', name: 'C', slug: 'c', description: '', latitude: 12, longitude: 22, addressText: '', mediaSetIds: [], visitOrder: 3, createdAt: '', updatedAt: '' },
];

const routes: RouteEntity[] = [
  { id: 'route-1', projectId: 'p', name: 'R1', description: '', locationIds: ['a', 'b', 'c'], lineStyle: 'solid', color: '#fff', isFeatured: true, createdAt: '', updatedAt: '' },
  { id: 'route-2', projectId: 'p', name: 'R2', description: '', locationIds: ['a'], lineStyle: 'solid', color: '#000', isFeatured: false, createdAt: '', updatedAt: '' },
];

describe('buildRouteFeatureCollection', () => {
  it('builds geojson features only for routes that have at least two valid locations', () => {
    const result = buildRouteFeatureCollection(routes, locations, 'route-1');

    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties?.id).toBe('route-1');
    expect(result.features[0].properties?.width).toBe(5);
    expect(result.features[0].geometry.coordinates).toEqual([
      [20, 10],
      [21, 11],
      [22, 12],
    ]);
  });
});
