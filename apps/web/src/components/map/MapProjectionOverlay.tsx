import type { ProjectedMapNode, ProjectedMapEdge } from './types';

interface MapProjectionOverlayProps {
  width: number;
  height: number;
  nodes: ProjectedMapNode[];
  edges: ProjectedMapEdge[];
  activeProjectId: string | null;
  activeLocationId: string | null;
  onLocationSelect: (locationId: string) => void;
}

export function MapProjectionOverlay({
  width,
  height,
  nodes,
  edges,
  activeProjectId,
  activeLocationId,
  onLocationSelect,
}: MapProjectionOverlayProps) {
  return (
    <div className="map-projection-overlay">
      {/* SVG layer for edges and decorative glows */}
      <svg
        className="map-projection-overlay__svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        {edges.map((edge) => (
          <path
            key={edge.id}
            d={edge.path}
            strokeWidth={1.5}
            strokeOpacity={0.6}
            fill="none"
          />
        ))}
      </svg>

      {/* DOM layer for nodes, buttons, hit areas */}
      <div className="map-projection-overlay__dom">
        {nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            className="map-star-layer__nodes"
            style={{
              position: 'absolute',
              left: node.x,
              top: node.y,
              transform: 'translate(-50%, -50%)',
              opacity: node.isVisible ? 1 : 0,
            }}
            data-location-id={node.id}
            data-active={String(node.id === activeLocationId)}
            data-project-id={node.originalNode.projectId}
            onClick={() => onLocationSelect(node.id)}
          >
            {node.originalNode.title}
          </button>
        ))}
      </div>
    </div>
  );
}
