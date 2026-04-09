import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePublicProjects } from './usePublicProjects';

describe('usePublicProjects', () => {
  it('loads project cards from the public API', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      items: [{ id: 'project-1', slug: 'trace-scope', title: 'Trace Scope', summary: 'summary', coverImage: null, tags: [], status: 'published' }],
    });

    const { result } = renderHook(() => usePublicProjects({ fetcher }));

    await waitFor(() => expect(result.current.projects).toHaveLength(1));
    expect(fetcher).toHaveBeenCalledWith('/public/projects');
  });

  it('returns empty array and loading=true initially', () => {
    const fetcher = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePublicProjects({ fetcher }));

    expect(result.current.projects).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('returns error on fetch failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => usePublicProjects({ fetcher }));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.loading).toBe(false);
  });
});
