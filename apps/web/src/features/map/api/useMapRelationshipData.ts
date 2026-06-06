import { useEffect, useMemo, useState } from 'react';
import { buildMapRelationshipViewModel, type MapRelationshipViewModel, type BuildMapRelationshipViewModelInput } from '@/features/map/model/mapViewModel';
import { fetchMapRelationshipData } from './fetchMapRelationshipData';

const EMPTY_SOURCE: BuildMapRelationshipViewModelInput = {
  projects: [],
  locations: [],
  mediaSets: [],
  routes: [],
};

export interface MapRelationshipDataState extends MapRelationshipViewModel {
  loading: boolean;
  error: Error | null;
}

export function useMapRelationshipData(): MapRelationshipDataState {
  const [source, setSource] = useState<BuildMapRelationshipViewModelInput>(EMPTY_SOURCE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMapRelationshipData()
      .then((next) => {
        if (cancelled) return;
        setSource(next as BuildMapRelationshipViewModelInput);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const viewModel = useMemo(() => buildMapRelationshipViewModel(source), [source]);
  return { ...viewModel, loading, error };
}
