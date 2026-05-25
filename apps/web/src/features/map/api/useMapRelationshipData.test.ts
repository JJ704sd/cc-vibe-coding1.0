import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMapRelationshipData } from './useMapRelationshipData';

vi.mock('./fetchMapRelationshipData', () => ({
  fetchMapRelationshipData: vi.fn(),
}));

describe('useMapRelationshipData', () => {
  it('returns empty view model when fetch returns empty source', async () => {
    const { fetchMapRelationshipData } = await import('./fetchMapRelationshipData');
    (fetchMapRelationshipData as ReturnType<typeof vi.fn>).mockResolvedValue({
      projects: [],
      locations: [],
      mediaSets: [],
      mediaImages: [],
      routes: [],
    });

    const { result } = renderHook(() => useMapRelationshipData());

    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.projectGroups).toEqual([]);
    expect(result.current.mediaClusters).toEqual([]);
  });

  it('calls fetchMapRelationshipData on mount', async () => {
    const { fetchMapRelationshipData } = await import('./fetchMapRelationshipData');
    (fetchMapRelationshipData as ReturnType<typeof vi.fn>).mockResolvedValue({
      projects: [],
      locations: [],
      mediaSets: [],
      mediaImages: [],
      routes: [],
    });

    renderHook(() => useMapRelationshipData());

    expect(fetchMapRelationshipData).toHaveBeenCalled();
  });
});
