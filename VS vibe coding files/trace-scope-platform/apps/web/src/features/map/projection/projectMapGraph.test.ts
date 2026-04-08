import { describe, expect, it } from 'vitest';
import { projectMapGraph } from './projectMapGraph';
import type { MapProjector, ProjectedMapGraph } from '@/components/map/types';

describe('projectMapGraph', () => {
  it('projects nodes through the provided projector function', () => {
    // Arrange: two nodes with geographic coordinates
    const viewModel = {
      nodes: [
        {
          id: 'node-a',
          projectId: 'project-1',
          locationId: 'loc-a',
          title: 'Node A',
          description: '',
          latitude: 31.2,
          longitude: 121.4,
          addressText: '',
          visitOrder: 1,
          mediaSetIds: [],
          routeIds: [],
        },
        {
          id: 'node-b',
          projectId: 'project-1',
          locationId: 'loc-b',
          title: 'Node B',
          description: '',
          latitude: 30.5,
          longitude: 120.9,
          addressText: '',
          visitOrder: 2,
          mediaSetIds: [],
          routeIds: [],
        },
      ],
      edges: [
        {
          id: 'edge-ab',
          projectId: 'project-1',
          routeId: 'route-1',
          sourceLocationId: 'loc-a',
          targetLocationId: 'loc-b',
          sourceNodeId: 'node-a',
          targetNodeId: 'node-b',
          lineStyle: 'solid' as const,
          color: '#72e3d2',
        },
      ],
    };

    // Fake projector: maps lng/lat to screen coordinates
    const fakeProjector: MapProjector['project'] = (lng: number, lat: number) => {
      if (lng === 121.4 && lat === 31.2) return { x: 400, y: 300 };
      if (lng === 120.9 && lat === 30.5) return { x: 320, y: 240 };
      return { x: 0, y: 0 };
    };

    // Act
    const result: ProjectedMapGraph = projectMapGraph(viewModel, { project: fakeProjector });

    // Assert: nodes have projected x/y and visibility
    expect(result.nodes).toHaveLength(2);
    const nodeA = result.nodes.find((n) => n.id === 'node-a')!;
    const nodeB = result.nodes.find((n) => n.id === 'node-b')!;

    expect(nodeA.x).toBe(400);
    expect(nodeA.y).toBe(300);
    expect(nodeA.isVisible).toBe(true);

    expect(nodeB.x).toBe(320);
    expect(nodeB.y).toBe(240);
    expect(nodeB.isVisible).toBe(true);

    // Assert: edge has SVG path and visibility
    expect(result.edges).toHaveLength(1);
    const edge = result.edges[0];
    expect(edge.path).toBe('M 400 300 L 320 240');
    expect(edge.isVisible).toBe(true);
  });

  it('marks nodes as invisible when outside viewport bounds', () => {
    const viewModel = {
      nodes: [
        {
          id: 'outside',
          projectId: 'project-1',
          locationId: 'loc-out',
          title: 'Outside',
          description: '',
          latitude: 90,
          longitude: 180,
          addressText: '',
          visitOrder: 1,
          mediaSetIds: [],
          routeIds: [],
        },
      ],
      edges: [],
    };

    const fakeProjector: MapProjector['project'] = () => ({ x: 9999, y: 9999 });

    const result: ProjectedMapGraph = projectMapGraph(viewModel, {
      project: fakeProjector,
      width: 800,
      height: 600,
    });

    const node = result.nodes[0];
    expect(node.isVisible).toBe(false);
  });
});
