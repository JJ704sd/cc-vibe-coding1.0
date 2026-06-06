import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMapRelationshipData } from './useMapRelationshipData';
import { fetchMapRelationshipData } from './fetchMapRelationshipData';

vi.mock('./fetchMapRelationshipData', () => ({
  fetchMapRelationshipData: vi.fn(),
}));

const fetchMock = vi.mocked(fetchMapRelationshipData);

describe('useMapRelationshipData', () => {
  it('exposes loading=true and an empty view model before the fetch resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMapRelationshipData());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.projectGroups).toEqual([]);
    expect(result.current.mediaClusters).toEqual([]);
  });

  it('returns the resolved relationship view model and clears loading', async () => {
    fetchMock.mockResolvedValue({
      projects: [{ id: 'p-1', title: 'P1', slug: 'p-1', summary: '', description: '', coverImage: '', status: 'published' as const, tags: [], locationIds: [], mediaSetIds: [], routeIds: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }],
      locations: [],
      mediaSets: [],
      routes: [],
    });

    const { result } = renderHook(() => useMapRelationshipData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.projectGroups).toHaveLength(1);
  });

  it('captures the error and stops loading when the fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('Network down'));

    const { result } = renderHook(() => useMapRelationshipData());

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.loading).toBe(false);
    expect(result.current.error?.message).toBe('Network down');
    expect(result.current.nodes).toEqual([]);
  });
});
