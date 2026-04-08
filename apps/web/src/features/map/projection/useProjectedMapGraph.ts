import { useCallback, useEffect, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { projectMapGraph } from './projectMapGraph';
import type { ProjectedMapGraph } from '@/components/map/types';
import type { MapRelationshipViewModel } from '@/features/map/model/mapViewModel';

export interface UseProjectedMapGraphOptions {
  map: MaplibreMap | null;
  viewModel: Pick<MapRelationshipViewModel, 'nodes' | 'edges'>;
}

export interface ProjectedMapGraphState extends ProjectedMapGraph {
  width: number;
  height: number;
  isReady: boolean;
}

const MAP_EVENTS = ['load', 'move', 'zoom', 'rotate', 'pitch', 'resize'] as const;

export function useProjectedMapGraph({
  map,
  viewModel,
}: UseProjectedMapGraphOptions): ProjectedMapGraphState {
  const [state, setState] = useState<ProjectedMapGraphState>({
    nodes: [],
    edges: [],
    width: 0,
    height: 0,
    isReady: false,
  });

  const recompute = useCallback(() => {
    if (!map) return;

    const container = map.getContainer();
    const width = container.clientWidth;
    const height = container.clientHeight;

    const projector = {
      project: (lng: number, lat: number) => {
        const point = map.project([lng, lat]);
        return { x: point.x, y: point.y };
      },
    };

    const graph = projectMapGraph(viewModel, {
      project: projector.project,
      width,
      height,
    });

    setState({
      ...graph,
      width,
      height,
      isReady: true,
    });
  }, [map, viewModel]);

  useEffect(() => {
    if (!map) return;

    // Set up event listeners for camera changes
    MAP_EVENTS.forEach((event) => {
      map.on(event, recompute);
    });

    // Initial computation after a short delay to ensure map is ready
    const frameId = requestAnimationFrame(() => {
      recompute();
    });

    return () => {
      MAP_EVENTS.forEach((event) => {
        map.off(event, recompute);
      });
      cancelAnimationFrame(frameId);
    };
  }, [map, recompute]);

  return state;
}
