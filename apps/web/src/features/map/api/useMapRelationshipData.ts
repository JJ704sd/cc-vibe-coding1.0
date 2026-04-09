import { useEffect, useMemo, useState } from 'react';
import { buildMapRelationshipViewModel, type MapRelationshipViewModel, type BuildMapRelationshipViewModelInput } from '@/features/map/model/mapViewModel';
import { fetchMapRelationshipData } from './fetchMapRelationshipData';

const EMPTY_SOURCE: BuildMapRelationshipViewModelInput = {
  projects: [],
  locations: [],
  mediaSets: [],
  routes: [],
};

export function useMapRelationshipData(): MapRelationshipViewModel {
  const [source, setSource] = useState<BuildMapRelationshipViewModelInput>(EMPTY_SOURCE);

  useEffect(() => {
    fetchMapRelationshipData()
      .then((next) => {
        setSource(next as BuildMapRelationshipViewModelInput);
      })
      .catch(() => {
        // Keep empty source on error
      });
  }, []);

  return useMemo(() => buildMapRelationshipViewModel(source), [source]);
}
