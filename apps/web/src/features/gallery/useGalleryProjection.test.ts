import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGalleryProjection } from './useGalleryProjection';

describe('useGalleryProjection', () => {
  it('marks images with lat/lng as projected', () => {
    const { result } = renderHook(() =>
      useGalleryProjection({
        mediaImages: [
          {
            id: 'img-1',
            mediaSetId: 'ms-1',
            url: 'https://example.com/1.jpg',
            thumbnailUrl: '',
            altText: '',
            caption: '',
            sortOrder: 1,
            latitude: 31.2401,
            longitude: 121.4903,
            createdAt: '',
          },
        ],
        stageWidth: 1280,
        stageHeight: 720,
      }),
    );
    expect(result.current.projectedImages[0].isProjected).toBe(true);
    expect(result.current.projectedImages[0].x).toBeGreaterThan(0);
  });

  it('marks images without coordinates as not projected', () => {
    const { result } = renderHook(() =>
      useGalleryProjection({
        mediaImages: [
          {
            id: 'img-2',
            mediaSetId: 'ms-1',
            url: 'https://example.com/2.jpg',
            thumbnailUrl: '',
            altText: '',
            caption: '',
            sortOrder: 2,
            createdAt: '',
          },
        ],
        stageWidth: 1280,
        stageHeight: 720,
      }),
    );
    expect(result.current.projectedImages[0].isProjected).toBe(false);
  });
});
