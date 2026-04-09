import { httpJson } from '@/services/api/httpClient';
import type { BuildMapRelationshipViewModelInput } from '@/features/map/model/mapViewModel';

export type MapRelationshipSource = BuildMapRelationshipViewModelInput;

export async function fetchMapRelationshipData(
  fetcher: (url: string) => Promise<unknown> = (url) => httpJson<MapRelationshipSource>(url)
): Promise<MapRelationshipSource> {
  return fetcher('/public/map-relationship') as Promise<MapRelationshipSource>;
}
