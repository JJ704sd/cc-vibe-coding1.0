import { useMemo, useState, useCallback } from 'react';
import type { Location, MediaImage, MediaSet, Project, RouteEntity } from '@/types/domain';
import { adminDataStore } from '@/services/storage/adminDataStore';

export function useAdminData() {
  const store = useMemo(() => adminDataStore, []);
  const [state, setState] = useState(() => store.getState());

  const refresh = useCallback(() => {
    setState(store.getState());
  }, [store]);

  return {
    state,
    saveProject(project: Project) {
      store.saveProject(project);
      refresh();
    },
    deleteProject(projectId: string) {
      store.deleteProject(projectId);
      refresh();
    },
    saveLocation(location: Location) {
      store.saveLocation(location);
      refresh();
    },
    deleteLocation(locationId: string) {
      store.deleteLocation(locationId);
      refresh();
    },
    saveMediaSet(mediaSet: MediaSet) {
      store.saveMediaSet(mediaSet);
      refresh();
    },
    deleteMediaSet(mediaSetId: string) {
      store.deleteMediaSet(mediaSetId);
      refresh();
    },
    saveRoute(route: RouteEntity) {
      store.saveRoute(route);
      refresh();
    },
    deleteRoute(routeId: string) {
      store.deleteRoute(routeId);
      refresh();
    },
    saveMediaImage(image: MediaImage) {
      store.saveMediaImage(image);
      refresh();
    },
    deleteMediaImage(imageId: string) {
      store.deleteMediaImage(imageId);
      refresh();
    },
    reorderMediaImages(mediaSetId: string, orderedImageIds: string[]) {
      store.reorderMediaImages(mediaSetId, orderedImageIds);
      refresh();
    },
    reset() {
      store.reset();
      refresh();
    },
  };
}
