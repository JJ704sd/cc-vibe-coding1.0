import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { StarRelationshipLayer } from '@/components/map/StarRelationshipLayer';
import type { ProjectedMapNode, ProjectedMapEdge } from '@/components/map/types';

describe('StarRelationshipLayer', () => {
  it('exports a relationship layer component', () => {
    expect(StarRelationshipLayer).toBeTypeOf('function');
  });

  it('accepts projected nodes with x, y, and isVisible', () => {
    const onLocationSelect = vi.fn();
    const projectedNodes: ProjectedMapNode[] = [
      {
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
      },
    ];

    const projectedEdges: ProjectedMapEdge[] = [
      {
        id: 'edge-1',
        path: 'M 400 300 L 320 240',
        isVisible: true,
        originalEdge: {
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
      },
    ];

    const { container } = render(
      <StarRelationshipLayer
        nodes={projectedNodes}
        edges={projectedEdges}
        activeProjectId="project-1"
        activeLocationId="location-1"
        onLocationSelect={onLocationSelect}
      />,
    );

    expect(container.querySelectorAll('button[data-location-id]')).toHaveLength(1);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders SVG paths for visible edges', () => {
    const onLocationSelect = vi.fn();
    const projectedNodes: ProjectedMapNode[] = [
      {
        id: 'node-a',
        x: 100,
        y: 100,
        isVisible: true,
        originalNode: {
          id: 'node-a',
          projectId: 'project-1',
          locationId: 'node-a',
          title: 'Node A',
          description: '',
          latitude: 31.2,
          longitude: 121.4,
          addressText: '',
          visitOrder: 1,
          mediaSetIds: [],
          routeIds: [],
        },
      },
      {
        id: 'node-b',
        x: 200,
        y: 200,
        isVisible: true,
        originalNode: {
          id: 'node-b',
          projectId: 'project-1',
          locationId: 'node-b',
          title: 'Node B',
          description: '',
          latitude: 30.5,
          longitude: 120.9,
          addressText: '',
          visitOrder: 2,
          mediaSetIds: [],
          routeIds: [],
        },
      },
    ];

    const projectedEdges: ProjectedMapEdge[] = [
      {
        id: 'edge-ab',
        path: 'M 100 100 L 200 200',
        isVisible: true,
        originalEdge: {
          id: 'edge-ab',
          projectId: 'project-1',
          routeId: 'route-1',
          sourceLocationId: 'node-a',
          targetLocationId: 'node-b',
          sourceNodeId: 'node-a',
          targetNodeId: 'node-b',
          lineStyle: 'solid',
          color: '#72e3d2',
        },
      },
    ];

    const { container } = render(
      <StarRelationshipLayer
        nodes={projectedNodes}
        edges={projectedEdges}
        activeProjectId="project-1"
        activeLocationId="node-a"
        onLocationSelect={onLocationSelect}
      />,
    );

    const path = container.querySelector('path');
    expect(path).toBeTruthy();
    expect(path?.getAttribute('d')).toBe('M 100 100 L 200 200');
  });
});
