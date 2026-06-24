import { useCallback, useEffect, useState } from 'react';
import { httpJson } from '@/services/api/httpClient';
import type { Project } from '@/types/domain';

export type PublicProjectCard = Pick<Project, 'id' | 'title' | 'slug' | 'summary' | 'coverImage' | 'tags' | 'status'>;

export function usePublicProjects({
  fetcher: fetcherProp,
}: {
  fetcher?: (url: string) => Promise<{ items: PublicProjectCard[] }>;
} = {}) {
  // Default fetcher must be stable across renders; otherwise every parent
  // re-render (Vite HMR, any state update) hands the effect a new reference
  // and refires the request. Combined with React StrictMode that can blow
  // past the API rate limit within seconds of opening /projects in dev.
  const defaultFetcher = useCallback(
    (url: string) => httpJson<{ items: PublicProjectCard[] }>(url),
    [],
  );
  const fetcher = fetcherProp ?? defaultFetcher;

  const [projects, setProjects] = useState<PublicProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher('/public/projects')
      .then((data) => {
        if (!cancelled) {
          setProjects(data.items);
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
  }, [fetcher]);

  return { projects, loading, error };
}
