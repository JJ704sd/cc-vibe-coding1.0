import { useMemo } from 'react';
import { adminDataStore } from '@/services/storage/adminDataStore';
import { createPublicDataReader } from '@/services/storage/publicDataReader';

export function usePublicData() {
  const store = useMemo(() => adminDataStore, []);
  return useMemo(() => createPublicDataReader(store), [store]);
}
