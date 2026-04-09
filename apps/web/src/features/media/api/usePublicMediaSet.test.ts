import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePublicMediaSet } from './usePublicMediaSet';

describe('usePublicMediaSet', () => {
  it('loads media set from the public API', async () => {
    const mockData = {
      id: 'ms-1',
      type: 'gallery' as const,
      title: 'Test Gallery',
      description: 'desc',
      coverImage: null,
      locationId: null,
      isFeatured: false,
      images: [],
    };
    const fetcher = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => usePublicMediaSet({ mediaSetId: 'ms-1', fetcher }));

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(fetcher).toHaveBeenCalledWith('/public/media-sets/ms-1');
    expect(result.current.data?.title).toBe('Test Gallery');
  });

  it('returns loading=false when no mediaSetId provided', () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() => usePublicMediaSet({ mediaSetId: '', fetcher }));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns error on fetch failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Not found'));
    const { result } = renderHook(() => usePublicMediaSet({ mediaSetId: 'notfound', fetcher }));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.loading).toBe(false);
  });
});
