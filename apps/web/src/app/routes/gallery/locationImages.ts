import { httpJson } from '@/services/api/httpClient';
import type { MediaImage } from '@/types/domain';

/**
 * Public-renderable media image as returned by the gallery location fetch.
 * Extends the domain `MediaImage` with the renderable `url` and optional
 * `mimeType` fields that the public media-set endpoint exposes.
 */
export interface PublicMediaImage extends MediaImage {
  url: string;
  mimeType?: string;
}

interface MediaSetImageRecord {
  id: string;
  caption: string;
  sortOrder: number;
  url: string | null;
  mimeType: string | null;
}

interface MediaSetWithImages {
  id: string;
  type: string;
  title: string;
  description: string;
  coverImage: string | null;
  locationId: string | null;
  isFeatured: boolean;
  images: MediaSetImageRecord[];
}

interface MapGraphNode {
  id: string;
  mediaSetIds: string[];
}

/**
 * Fetches every image published under any media set owned by the given
 * location. Failures on individual media sets are swallowed so one broken
 * set doesn't blank the whole strip.
 *
 * Pure data layer: no React, no state. Lives next to the type so the
 * shape and the producer are colocated; GalleryHome just consumes the
 * result.
 */
export async function fetchLocationImages(
  locationId: string,
  nodes: MapGraphNode[],
): Promise<PublicMediaImage[]> {
  const location = nodes.find((node) => node.id === locationId);
  if (!location) return [];

  const images: PublicMediaImage[] = [];

  for (const mediaSetId of location.mediaSetIds) {
    try {
      const response = await httpJson<MediaSetWithImages>(`/public/media-sets/${mediaSetId}`);

      for (const image of response.images) {
        if (!image.url) continue;

        images.push({
          id: image.id,
          mediaSetId,
          url: image.url,
          thumbnailUrl: image.url,
          altText: image.caption,
          caption: image.caption,
          sortOrder: image.sortOrder,
          latitude: undefined,
          longitude: undefined,
          createdAt: '',
        });
      }
    } catch {
      // Skip media sets that fail to load so the rest of the location can still render.
    }
  }

  return images;
}