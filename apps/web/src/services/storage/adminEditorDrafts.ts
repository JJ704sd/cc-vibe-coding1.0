import type { Location, MediaImage, MediaSet, Project, RouteEntity } from '@/types/domain';

export interface ProjectDraft {
  title: string;
  summary: string;
  description: string;
  status: Project['status'];
  tagsText: string;
}

export interface LocationDraft {
  projectId: string;
  name: string;
  description: string;
  latitudeText: string;
  longitudeText: string;
  addressText: string;
  visitOrderText: string;
}

export interface MediaSetDraft {
  projectId: string;
  locationId: string;
  type: MediaSet['type'];
  title: string;
  description: string;
  isFeatured: boolean;
}

export interface RouteDraft {
  projectId: string;
  name: string;
  description: string;
  locationIdsText: string;
  lineStyle: RouteEntity['lineStyle'];
  color: string;
  isFeatured: boolean;
}

export function createProjectDraft(project?: Project): ProjectDraft {
  return {
    title: project?.title ?? '',
    summary: project?.summary ?? '',
    description: project?.description ?? '',
    status: project?.status ?? 'draft',
    tagsText: project?.tags.join(', ') ?? '',
  };
}

export function createLocationDraft(location?: Location): LocationDraft {
  return {
    projectId: location?.projectId ?? '',
    name: location?.name ?? '',
    description: location?.description ?? '',
    latitudeText: location ? String(location.latitude) : '31.23',
    longitudeText: location ? String(location.longitude) : '121.47',
    addressText: location?.addressText ?? '',
    visitOrderText: location?.visitOrder == null ? '' : String(location.visitOrder),
  };
}

export function createMediaSetDraft(mediaSet?: MediaSet): MediaSetDraft {
  return {
    projectId: mediaSet?.projectId ?? '',
    locationId: mediaSet?.locationId ?? '',
    type: mediaSet?.type ?? 'gallery',
    title: mediaSet?.title ?? '',
    description: mediaSet?.description ?? '',
    isFeatured: mediaSet?.isFeatured ?? false,
  };
}

export function createMediaImageDraft(data?: Partial<MediaImage>) {
  return {
    id: data?.id ?? '',
    mediaSetId: data?.mediaSetId ?? '',
    url: data?.url ?? '',
    thumbnailUrl: data?.thumbnailUrl ?? '',
    altText: data?.altText ?? '',
    caption: data?.caption ?? '',
    sortOrder: data?.sortOrder ?? 0,
    latitude: data?.latitude,
    longitude: data?.longitude,
    createdAt: data?.createdAt ?? '',
  };
}

export function createRouteDraft(route?: RouteEntity): RouteDraft {
  return {
    projectId: route?.projectId ?? '',
    name: route?.name ?? '',
    description: route?.description ?? '',
    locationIdsText: route?.locationIds.join(', ') ?? '',
    lineStyle: route?.lineStyle ?? 'solid',
    color: route?.color ?? '#72e3d2',
    isFeatured: route?.isFeatured ?? false,
  };
}
