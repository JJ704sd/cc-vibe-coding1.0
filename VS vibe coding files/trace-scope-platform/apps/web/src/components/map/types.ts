import type { MapRelationshipEdge, MapStarNode } from '@/features/map/model/mapViewModel';

export interface ProjectedMapNode {
  id: string;
  x: number;
  y: number;
  isVisible: boolean;
  originalNode: MapStarNode;
}

export interface ProjectedMapEdge {
  id: string;
  path: string;
  isVisible: boolean;
  originalEdge: MapRelationshipEdge;
}

export interface ProjectedMapGraph {
  nodes: ProjectedMapNode[];
  edges: ProjectedMapEdge[];
}

export interface MapProjector {
  project: (lng: number, lat: number) => { x: number; y: number };
}

export interface ProjectMapGraphOptions {
  project: MapProjector['project'];
  width?: number;
  height?: number;
}
