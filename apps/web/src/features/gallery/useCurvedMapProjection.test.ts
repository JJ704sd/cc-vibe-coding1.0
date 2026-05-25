import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCurvedMapProjection } from './useCurvedMapProjection';

const baseImage = {
  mediaSetId: 'set-1',
  url: 'https://example.com/test.jpg',
  thumbnailUrl: '',
  altText: 'test',
  caption: 'test',
  sortOrder: 1,
  createdAt: '2026-04-08T00:00:00.000Z',
};

describe('useCurvedMapProjection', () => {
  it('anchors images with coordinates', () => {
    const { result } = renderHook(() =>
      useCurvedMapProjection({
        mediaImages: [
          { ...baseImage, id: 'img-1', latitude: 31.2401, longitude: 121.4903 },
        ],
      }),
    );
    expect(result.current.anchored.length).toBe(1);
    expect(result.current.fallback.length).toBe(0);
  });

  it('moves images without coordinates into fallback placements', () => {
    const { result } = renderHook(() =>
      useCurvedMapProjection({
        mediaImages: [{ ...baseImage, id: 'img-2' }],
      }),
    );
    expect(result.current.anchored.length).toBe(0);
    expect(result.current.fallback.length).toBe(1);
  });
});
