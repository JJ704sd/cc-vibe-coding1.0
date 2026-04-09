import { useEffect, useState } from 'react';
import { httpJson } from '@/services/api/httpClient';
import type { Project } from '@/types/domain';

export type PublicProjectCard = Pick<Project, 'id' | 'title' | 'slug' | 'summary' | 'coverImage' | 'tags' | 'status'>;

export function usePublicProjects({
  fetcher = (url: string) => httpJson<{ items: PublicProjectCard[] }>(url),
}: {
  fetcher?: (url: string) => Promise<{ items: PublicProjectCard[] }>;
} = {}) {
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
