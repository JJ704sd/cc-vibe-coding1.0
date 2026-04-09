import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePublicProjectDetail } from './usePublicProjectDetail';

describe('usePublicProjectDetail', () => {
  it('loads project detail from the public API', async () => {
    const mockData = {
      project: { id: 'proj-1', slug: 'proj', title: 'My Project', summary: 'summary', description: 'desc', coverImage: null, tags: ['china'], status: 'published' as const },
      locations: [],
      mediaSets: [],
      routes: [],
    };
    const fetcher = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => usePublicProjectDetail({ projectIdOrSlug: 'proj-1', fetcher }));

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(fetcher).toHaveBeenCalledWith('/public/projects/proj-1');
    expect(result.current.data?.project.title).toBe('My Project');
  });

  it('returns loading=true when no projectIdOrSlug provided', () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() => usePublicProjectDetail({ projectIdOrSlug: '', fetcher }));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns error on fetch failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Not found'));
    const { result } = renderHook(() => usePublicProjectDetail({ projectIdOrSlug: 'notfound', fetcher }));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.loading).toBe(false);
  });
});
