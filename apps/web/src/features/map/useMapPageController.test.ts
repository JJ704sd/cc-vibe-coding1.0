import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMapPageController } from './useMapPageController';

vi.mock('@/features/map/api/fetchMapRelationshipData', () => ({
  fetchMapRelationshipData: vi.fn().mockResolvedValue({
    projects: [],
    locations: [],
    mediaSets: [],
    routes: [],
  }),
}));

vi.mock('@/features/map/projection/projectMapGraph', () => ({
  projectMapGraph: vi.fn(() => ({
    nodes: [],
    edges: [],
  })),
}));

describe('useMapPageController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the documented state, derived, actions, and passthrough surface', () => {
    const { result } = renderHook(() => useMapPageController());

    // state
    expect(result.current.mapInstance).toBeNull();
    expect(result.current.activeProjectId).toBeNull();
    expect(result.current.activeLocationId).toBeNull();

    // derived (all null when no data)
    expect(result.current.projected).toEqual({
      nodes: [],
      edges: [],
      width: 0,
      height: 0,
      isReady: false,
    });
    expect(result.current.activeAnchor).toBeNull();
    expect(result.current.activeCluster).toBeNull();
    expect(result.current.activeProject).toBeNull();
    expect(result.current.activeNode).toBeNull();

    // passthrough
    expect(result.current.relationshipData).toBeDefined();
    expect(result.current.relationshipData.error).toBeNull();
    expect(Array.isArray(result.current.relationshipData.projectGroups)).toBe(true);
    expect(Array.isArray(result.current.relationshipData.nodes)).toBe(true);
    expect(Array.isArray(result.current.relationshipData.edges)).toBe(true);
    expect(Array.isArray(result.current.relationshipData.mediaClusters)).toBe(true);

    // actions
    expect(typeof result.current.setMapInstance).toBe('function');
    expect(typeof result.current.setActiveLocationId).toBe('function');
  });

  it('setActiveLocationId updates the active location id', () => {
    const { result } = renderHook(() => useMapPageController());

    expect(result.current.activeLocationId).toBeNull();

    act(() => result.current.setActiveLocationId('loc-42'));
    expect(result.current.activeLocationId).toBe('loc-42');

    act(() => result.current.setActiveLocationId(null));
    expect(result.current.activeLocationId).toBeNull();
  });

  it('captures activeProjectId once on first render and never updates it', () => {
    // First render with empty upstream → activeProjectId stays null for the
    // entire lifetime of the hook, even if relationshipData.projectGroups
    // later populated. The MapPage relies on this so a refetched project
    // list does not deselect the current map highlight.
    const { result } = renderHook(() => useMapPageController());
    const initial = result.current.activeProjectId;
    expect(initial).toBeNull();

    // Subsequent state updates elsewhere must not change activeProjectId.
    act(() => result.current.setActiveLocationId('loc-99'));
    expect(result.current.activeProjectId).toBe(initial);
  });
});