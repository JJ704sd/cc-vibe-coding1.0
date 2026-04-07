import { describe, expect, it, vi } from 'vitest';
import { StarRelationshipLayer } from '@/components/map/StarRelationshipLayer';

describe('StarRelationshipLayer', () => {
  it('exports a relationship layer component', () => {
    expect(StarRelationshipLayer).toBeTypeOf('function');
  });

  it('accepts the planned interaction props shape', () => {
    const onLocationSelect = vi.fn();

    const element = StarRelationshipLayer({
      nodes: [
        {
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
      ],
      edges: [
        {
          id: 'edge-1',
          projectId: 'project-1',
          routeId: 'route-1',
          sourceLocationId: 'location-1',
          targetLocationId: 'location-2',
          sourceNodeId: 'location-1',
          targetNodeId: 'location-2',
          lineStyle: 'solid',
          color: '#72e3d2',
        },
      ],
      activeProjectId: 'project-1',
      activeLocationId: 'location-1',
      onLocationSelect,
    });

    expect(element).toBeTruthy();
  });
});
