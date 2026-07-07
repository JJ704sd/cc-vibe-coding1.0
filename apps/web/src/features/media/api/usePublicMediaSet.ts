import { useCallback, useEffect, useState } from 'react';
import { httpJson } from '@/services/api/httpClient';
import type { MediaImage } from '@/types/domain';

export type PublicMediaSet = {
  id: string;
  type: 'spin360' | 'gallery';
  title: string;
  description: string;
  coverImage: string | null;
  locationId: string | null;
  projectId: string;
  isFeatured: boolean;
  images: MediaImage[];
};

export function usePublicMediaSet({
  mediaSetId,
  fetcher: fetcherProp,
}: {
  mediaSetId: string;
  fetcher?: (url: string) => Promise<PublicMediaSet>;
}) {
  // Default fetcher must be stable across renders; otherwise the effect
  // refires on every parent re-render (Vite HMR, any state update).
  const defaultFetcher = useCallback(
    (url: string) => httpJson<PublicMediaSet>(url),
    [],
  );
  const fetcher = fetcherProp ?? defaultFetcher;

  const [data, setData] = useState<PublicMediaSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!mediaSetId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    // BUG-023: reset data to null when mediaSetId changes so consumers
    // don't briefly render the previous set's images while the new
    // fetch is in flight (perceptual "flash" of stale content).
    setData(null);
    setLoading(true);
    setError(null);

    fetcher(`/public/media-sets/${mediaSetId}`)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mediaSetId, fetcher]);

  return { data, loading, error };
}
