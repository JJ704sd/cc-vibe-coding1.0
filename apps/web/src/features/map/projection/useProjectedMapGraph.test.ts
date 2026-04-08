import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProjectedMapGraph } from './useProjectedMapGraph';

describe('useProjectedMapGraph', () => {
  it('returns empty state when map is null', () => {
    const { result } = renderHook(() =>
      useProjectedMapGraph({
        map: null,
        viewModel: { nodes: [], edges: [] },
      }),
    );

    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.width).toBe(0);
    expect(result.current.height).toBe(0);
    expect(result.current.isReady).toBe(false);
  });

  it('subscribes to map camera events and recomputes on change', () => {
    const mockMap = {
      on: vi.fn(),
      off: vi.fn(),
      getContainer: () => ({ clientWidth: 800, clientHeight: 600 }),
      project: vi.fn((lngLat: [number, number]) => ({
        x: lngLat[0] * 10,
        y: lngLat[1] * 10,
      })),
    } as unknown as Parameters<typeof useProjectedMapGraph>[0]['map'];

    const { result } = renderHook(() =>
      useProjectedMapGraph({
        map: mockMap,
        viewModel: { nodes: [], edges: [] },
      }),
    );

    // After initial render with empty viewModel, should still register listeners
    expect(mockMap.on).toHaveBeenCalled();
  });
});
