import type { MapRelationshipEdge, MapStarNode } from '@/features/map/model/mapViewModel';

interface StarRelationshipLayerProps {
  nodes: MapStarNode[];
  edges: MapRelationshipEdge[];
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
      {edges.map((edge) => (
        <div
          key={edge.id}
          className="map-star-edge"
          data-project-id={edge.projectId}
          data-active={String(edge.projectId === activeProjectId)}
          data-route-id={edge.routeId}
        />
      ))}

      {nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          className="map-star-node"
          data-project-id={node.projectId}
          data-active={String(node.id === activeLocationId)}
          data-location-id={node.locationId}
          onClick={() => onLocationSelect(node.id)}
        >
          {node.title}
        </button>
      ))}
    </div>
  );
}
