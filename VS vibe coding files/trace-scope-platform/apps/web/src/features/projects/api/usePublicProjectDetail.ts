import { useEffect, useState } from 'react';
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
  fetcher = (url: string) => httpJson<PublicProjectDetail>(url),
}: {
  projectIdOrSlug: string;
  fetcher?: (url: string) => Promise<PublicProjectDetail>;
}) {
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
