import { useCallback, useEffect, useState } from 'react';
import { httpJson } from '@/services/api/httpClient';
import type { Location, MediaSet, RouteEntity } from '@/types/domain';

export type PublicProjectDetail = {
  project: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    description: string;
    coverImage: string | null;
    tags: string[];
    status: 'published';
  };
  locations: Location[];
  mediaSets: MediaSet[];
  routes: RouteEntity[];
};

export function usePublicProjectDetail({
  projectIdOrSlug,
  fetcher: fetcherProp,
}: {
  projectIdOrSlug: string;
  fetcher?: (url: string) => Promise<PublicProjectDetail>;
}) {
  // Default fetcher must be stable across renders; otherwise the effect
  // refires on every parent re-render (Vite HMR, any state update).
  const defaultFetcher = useCallback(
    (url: string) => httpJson<PublicProjectDetail>(url),
    [],
  );
  const fetcher = fetcherProp ?? defaultFetcher;

  const [data, setData] = useState<PublicProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!projectIdOrSlug) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher(`/public/projects/${projectIdOrSlug}`)
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
  }, [projectIdOrSlug, fetcher]);

  return { data, loading, error };
}
