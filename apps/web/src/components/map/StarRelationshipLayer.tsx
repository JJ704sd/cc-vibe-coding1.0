import type { ProjectedMapEdge, ProjectedMapNode } from './types';

interface StarRelationshipLayerProps {
  nodes: ProjectedMapNode[];
  edges: ProjectedMapEdge[];
  activeProjectId: string | null;
  activeLocationId: string | null;
  onLocationSelect: (locationId: string) => void;
}

export function StarRelationshipLayer({
  nodes,
  edges,
  activeProjectId,
  activeLocationId,
  onLocationSelect,
}: StarRelationshipLayerProps) {
  return (
    <div className="map-star-layer">
      {/* SVG layer for edges */}
      <svg className="map-star-layer__svg">
        {edges.map((edge) => (
          <path
            key={edge.id}
            d={edge.path}
            stroke={edge.originalEdge.color}
            strokeWidth={1.5}
            strokeOpacity={edge.isVisible ? 0.6 : 0}
            fill="none"
          />
        ))}
      </svg>

      {/* DOM layer for node buttons */}
      {nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          className="map-star-node"
          style={{
            position: 'absolute',
            left: node.x,
            top: node.y,
            transform: 'translate(-50%, -50%)',
            opacity: node.isVisible ? 1 : 0,
            pointerEvents: node.isVisible ? 'auto' : 'none',
          }}
          data-project-id={node.originalNode.projectId}
          data-active={String(node.id === activeLocationId)}
          data-location-id={node.id}
          onClick={() => onLocationSelect(node.id)}
        >
          {node.originalNode.title}
        </button>
      ))}
    </div>
  );
}
