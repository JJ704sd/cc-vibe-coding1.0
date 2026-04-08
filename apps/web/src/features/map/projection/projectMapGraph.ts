import type { MapRelationshipViewModel } from '@/features/map/model/mapViewModel';
import type { ProjectedMapGraph, ProjectMapGraphOptions } from '@/components/map/types';

/**
 * Transforms map relationship nodes and edges into projected screen-space coordinates.
 *
 * @param viewModel - The map relationship view model containing nodes and edges
 * @param options - Projection options including the project function and viewport dimensions
 * @returns Projected graph with nodes having x/y/isVisible and edges having SVG path/isVisible
 */
export function projectMapGraph(
  viewModel: Pick<MapRelationshipViewModel, 'nodes' | 'edges'>,
  options: ProjectMapGraphOptions,
): ProjectedMapGraph {
  const { width = 800, height = 600 } = options;
  const { project } = options;

  // Project all nodes
  const projectedNodes = viewModel.nodes.map((node) => {
    const { x, y } = project(node.longitude, node.latitude);
    const isVisible = x >= 0 && x <= width && y >= 0 && y <= height;

    return {
      id: node.id,
      x,
      y,
      isVisible,
      originalNode: node,
    };
  });

  // Build a lookup for projected nodes by id
  const nodeMap = new Map(projectedNodes.map((n) => [n.id, n]));

  // Project all edges
  const projectedEdges = viewModel.edges
    .map((edge) => {
      const sourceNode = nodeMap.get(edge.sourceNodeId);
      const targetNode = nodeMap.get(edge.targetNodeId);

      if (!sourceNode || !targetNode) {
        return null;
      }

      const isVisible = sourceNode.isVisible && targetNode.isVisible;
      const path = `M ${sourceNode.x} ${sourceNode.y} L ${targetNode.x} ${targetNode.y}`;

      return {
        id: edge.id,
        path,
        isVisible,
        originalEdge: edge,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return {
    nodes: projectedNodes,
    edges: projectedEdges,
  };
}
