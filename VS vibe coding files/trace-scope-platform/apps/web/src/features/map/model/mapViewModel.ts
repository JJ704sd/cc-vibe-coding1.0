import type { Location, MediaSet, Project, RouteEntity } from '@/types/domain';

export interface MapStarNode {
  id: string;
  projectId: string;
  locationId: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  addressText: string;
  visitOrder: number | null;
  mediaSetIds: string[];
  routeIds: string[];
}

export interface MapRelationshipEdge {
  id: string;
  projectId: string;
  routeId: string;
  sourceLocationId: string;
  targetLocationId: string;
  sourceNodeId: string;
  targetNodeId: string;
  lineStyle: RouteEntity['lineStyle'];
  color: string;
}

export interface MapProjectGroup {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  locationIds: string[];
  routeIds: string[];
  edgeIds: string[];
  mediaClusterIds: string[];
}

export interface MapMediaCluster {
  id: string;
  projectId: string;
  locationId: string | null;
  type: MediaSet['type'];
  title: string;
  mediaSetIds: string[];
}

export interface MapRelationshipViewModel {
  nodes: MapStarNode[];
  edges: MapRelationshipEdge[];
  projectGroups: MapProjectGroup[];
  mediaClusters: MapMediaCluster[];
}

export interface BuildMapRelationshipViewModelInput {
  projects: readonly Project[];
  locations: readonly Location[];
  mediaSets: readonly MediaSet[];
  routes: readonly RouteEntity[];
}

function createMediaClusterId(projectId: string, locationId: string | null, type: MediaSet['type']) {
  return JSON.stringify({ projectId, locationId, type });
}

function createMediaClusterTitle(projectTitle: string, locationName: string | null, type: MediaSet['type']) {
  const typeLabel = type === 'spin360' ? '360' : 'gallery';
  return locationName ? `${locationName} · ${typeLabel}` : `${projectTitle} · ${typeLabel}`;
}

function getOwnedLocationForMediaSet(locationLookup: Map<string, Location>, mediaSet: MediaSet): Location | null {
  if (!mediaSet.locationId) {
    return null;
  }

  const location = locationLookup.get(mediaSet.locationId);
  if (!location || location.projectId !== mediaSet.projectId) {
    return null;
  }

  return location;
}

export function buildMapRelationshipViewModel(
  input: BuildMapRelationshipViewModelInput,
): MapRelationshipViewModel {
  const locationRouteIds = new Map<string, string[]>();
  const locationMediaSetIds = new Map<string, string[]>();
  const locationLookup = new Map(input.locations.map((location) => [location.id, location]));
  const projectLookup = new Map(input.projects.map((project) => [project.id, project]));
  const projectBuckets = new Map<
    string,
    {
      locationIds: string[];
      routeIds: string[];
      edgeIds: string[];
      mediaClusterIds: string[];
    }
  >();

  for (const location of input.locations) {
    locationRouteIds.set(location.id, []);
    locationMediaSetIds.set(location.id, []);
    const bucket = projectBuckets.get(location.projectId) ?? {
      locationIds: [],
      routeIds: [],
      edgeIds: [],
      mediaClusterIds: [],
    };
    bucket.locationIds.push(location.id);
    projectBuckets.set(location.projectId, bucket);
  }

  for (const mediaSet of input.mediaSets) {
    const ownedLocation = getOwnedLocationForMediaSet(locationLookup, mediaSet);
    if (!ownedLocation) {
      continue;
    }

    locationMediaSetIds.set(ownedLocation.id, [...(locationMediaSetIds.get(ownedLocation.id) ?? []), mediaSet.id]);
  }

  const edges: MapRelationshipEdge[] = [];
  const mediaClusters = new Map<string, MapMediaCluster>();

  for (const route of input.routes) {
    const routeProjectBucket = projectBuckets.get(route.projectId) ?? {
      locationIds: [],
      routeIds: [],
      edgeIds: [],
      mediaClusterIds: [],
    };
    if (!routeProjectBucket.routeIds.includes(route.id)) {
      routeProjectBucket.routeIds.push(route.id);
    }
    projectBuckets.set(route.projectId, routeProjectBucket);

    for (const locationId of route.locationIds) {
      const location = locationLookup.get(locationId);
      if (!location || location.projectId !== route.projectId) {
        continue;
      }

      const routeIds = locationRouteIds.get(locationId);
      if (routeIds && !routeIds.includes(route.id)) {
        locationRouteIds.set(locationId, [...routeIds, route.id]);
      }
    }

    for (let index = 0; index < route.locationIds.length - 1; index += 1) {
      const sourceLocationId = route.locationIds[index];
      const targetLocationId = route.locationIds[index + 1];
      const sourceLocation = locationLookup.get(sourceLocationId);
      const targetLocation = locationLookup.get(targetLocationId);

      if (
        !sourceLocation ||
        !targetLocation ||
        sourceLocation.projectId !== route.projectId ||
        targetLocation.projectId !== route.projectId
      ) {
        continue;
      }

      const edgeId = `${route.id}:${sourceLocationId}->${targetLocationId}`;
      edges.push({
        id: edgeId,
        projectId: route.projectId,
        routeId: route.id,
        sourceLocationId,
        targetLocationId,
        sourceNodeId: sourceLocation.id,
        targetNodeId: targetLocation.id,
        lineStyle: route.lineStyle,
        color: route.color,
      });

      const routeBucket = projectBuckets.get(route.projectId);
      if (routeBucket && !routeBucket.edgeIds.includes(edgeId)) {
        routeBucket.edgeIds.push(edgeId);
      }
    }
  }

  const nodes: MapStarNode[] = input.locations.map((location) => ({
    id: location.id,
    projectId: location.projectId,
    locationId: location.id,
    title: location.name,
    description: location.description,
    latitude: location.latitude,
    longitude: location.longitude,
    addressText: location.addressText,
    visitOrder: location.visitOrder,
    mediaSetIds: locationMediaSetIds.get(location.id) ?? [],
    routeIds: locationRouteIds.get(location.id) ?? [],
  }));

  for (const mediaSet of input.mediaSets) {
    const ownedLocation = getOwnedLocationForMediaSet(locationLookup, mediaSet);
    if (mediaSet.locationId && !ownedLocation) {
      continue;
    }

    const clusterKey = createMediaClusterId(mediaSet.projectId, mediaSet.locationId, mediaSet.type);
    const cluster = mediaClusters.get(clusterKey);
    const project = projectLookup.get(mediaSet.projectId);
    const locationName = ownedLocation?.name ?? null;
    const projectBucket = projectBuckets.get(mediaSet.projectId) ?? {
      locationIds: [],
      routeIds: [],
      edgeIds: [],
      mediaClusterIds: [],
    };

    if (cluster) {
      cluster.mediaSetIds.push(mediaSet.id);
      continue;
    }

    mediaClusters.set(clusterKey, {
      id: clusterKey,
      projectId: mediaSet.projectId,
      locationId: mediaSet.locationId,
      type: mediaSet.type,
      title: createMediaClusterTitle(project?.title ?? mediaSet.projectId, locationName, mediaSet.type),
      mediaSetIds: [mediaSet.id],
    });

    if (!projectBucket.mediaClusterIds.includes(clusterKey)) {
      projectBucket.mediaClusterIds.push(clusterKey);
    }
    projectBuckets.set(mediaSet.projectId, projectBucket);
  }

  const projectGroups: MapProjectGroup[] = input.projects.map((project) => {
    const bucket = projectBuckets.get(project.id) ?? {
      locationIds: [],
      routeIds: [],
      edgeIds: [],
      mediaClusterIds: [],
    };

    return {
      id: project.id,
      projectId: project.id,
      title: project.title,
      summary: project.summary,
      locationIds: bucket.locationIds,
      routeIds: bucket.routeIds,
      edgeIds: bucket.edgeIds,
      mediaClusterIds: bucket.mediaClusterIds,
    };
  });

  return {
    nodes,
    edges,
    projectGroups,
    mediaClusters: [...mediaClusters.values()],
  };
}
