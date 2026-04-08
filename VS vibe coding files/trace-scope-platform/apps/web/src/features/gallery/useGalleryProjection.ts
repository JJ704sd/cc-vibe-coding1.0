import { useMemo } from 'react';
import type { MediaImage } from '@/types/domain';

const LNG_MIN = 73;
const LNG_MAX = 135;
const LAT_MIN = 18;
const LAT_MAX = 54;

export interface ProjectedImage {
  mediaImage: MediaImage;
  x: number;
  isProjected: boolean;
}

interface UseGalleryProjectionOptions {
  mediaImages: MediaImage[];
  stageWidth: number;
  stageHeight: number; // not currently used; y-position comes from ring layout
}

export function useGalleryProjection({
  mediaImages,
  stageWidth,
  stageHeight,
}: UseGalleryProjectionOptions): { projectedImages: ProjectedImage[] } {
  const projectedImages = useMemo(() => {
    return mediaImages.map((mediaImage) => {
      if (
        mediaImage.latitude !== undefined &&
        mediaImage.longitude !== undefined
      ) {
        const x = ((mediaImage.longitude - LNG_MIN) / (LNG_MAX - LNG_MIN)) * stageWidth;
        return { mediaImage, x, isProjected: true };
      }
      return { mediaImage, x: 0, isProjected: false };
    });
  }, [mediaImages, stageWidth]); // stageHeight removed - not used in projection

  return { projectedImages };
}
