import { useMemo } from 'react';
import { buildMapRelationshipViewModel } from '@/features/map/model/mapViewModel';
import { usePublicData } from '@/services/storage/usePublicData';

export function useMapRelationshipData() {
  const reader = usePublicData();

  return useMemo(() => {
    const source = reader.getPublishedMapRelationshipSource();
    return buildMapRelationshipViewModel(source);
  }, [reader]);
}
