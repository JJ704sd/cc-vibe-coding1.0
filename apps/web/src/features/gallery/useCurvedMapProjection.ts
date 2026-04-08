import { useMemo } from 'react';
import type { MediaImage } from '@/types/domain';
import { lngLatToUv } from './gallerySceneMath';

export interface AnchoredMediaPlacement {
  mediaImage: MediaImage;
  u: number;
  v: number;
}

export interface FallbackMediaPlacement {
  mediaImage: MediaImage;
  fallbackIndex: number;
}

export function useCurvedMapProjection({
  mediaImages,
}: {
  mediaImages: MediaImage[];
}) {
  return useMemo(() => {
    const anchored: AnchoredMediaPlacement[] = [];
    const fallback: FallbackMediaPlacement[] = [];

    mediaImages.forEach((mediaImage) => {
      if (
        mediaImage.longitude !== undefined &&
        mediaImage.latitude !== undefined
      ) {
        const { u, v } = lngLatToUv(mediaImage.longitude, mediaImage.latitude);
        anchored.push({ mediaImage, u, v });
        return;
      }

      fallback.push({
        mediaImage,
        fallbackIndex: fallback.length,
      });
    });

    return { anchored, fallback };
  }, [mediaImages]);
}
