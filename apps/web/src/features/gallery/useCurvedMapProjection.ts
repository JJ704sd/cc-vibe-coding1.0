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

    mediaImages.forEach((mediaImage, index) => {
      if (
        mediaImage.longitude !== undefined &&
        mediaImage.latitude !== undefined
      ) {
        const { u, v } = lngLatToUv(mediaImage.longitude, mediaImage.latitude);
        anchored.push({ mediaImage, u, v });
        return;
      }

      // Give fallback images scattered positions on the map
      const u = ((index * 137.5) % 100) / 100; // Golden ratio scatter
      const v = ((index * 97.3) % 100) / 100;
      anchored.push({ mediaImage, u, v });
    });

    return { anchored, fallback };
  }, [mediaImages]);
}
