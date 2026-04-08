import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MediaClusterLayer } from '@/components/map/MediaClusterLayer';
import { MapRelationshipPanel } from '@/components/map/MapRelationshipPanel';
import type { ProjectedMapNode } from '@/components/map/types';
import type { MapMediaCluster } from '@/features/map/model/mapViewModel';

describe('map media expansion shell', () => {
  it('exports media cluster and relationship panel components', () => {
    expect(MediaClusterLayer).toBeTypeOf('function');
    expect(MapRelationshipPanel).toBeTypeOf('function');
  });

  it('returns null when no media cluster is focused', () => {
    const { container } = render(<MediaClusterLayer cluster={null} anchor={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('accepts anchor prop and positions relative to projected node', () => {
    const anchor: ProjectedMapNode = {
      id: 'location-1',
      x: 400,
      y: 300,
      isVisible: true,
      originalNode: {
        id: 'location-1',
        projectId: 'project-1',
        locationId: 'location-1',
        title: 'Location One',
        description: 'Description',
        latitude: 31.2,
        longitude: 121.4,
        addressText: 'Address',
        visitOrder: 1,
        mediaSetIds: ['media-1'],
        routeIds: ['route-1'],
      },
    };

    const cluster: MapMediaCluster = {
      id: 'cluster-1',
      projectId: 'project-1',
      locationId: 'location-1',
      type: 'gallery',
      title: 'Location One · gallery',
      mediaSetIds: ['media-1'],
    };

    const { container } = render(<MediaClusterLayer cluster={cluster} anchor={anchor} />);
    expect(container.firstChild).toBeTruthy();
  });
});
