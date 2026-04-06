import type { Location, MediaImage, MediaSet, Project, RouteEntity } from '@/types/domain';
import type { AdminDataState, createAdminDataStore } from '@/services/storage/adminDataStore';

export type AdminDataStore = ReturnType<typeof createAdminDataStore>;

export function createPublicDataReader(store: AdminDataStore, snapshot?: AdminDataState) {
  function getState() {
    return snapshot ?? store.getState();
  }

  function getPublishedProjects(): Project[] {
    return getState().projects.filter((project) => project.status === 'published');
  }

  function getPublishedProjectIds() {
    return new Set(getPublishedProjects().map((project) => project.id));
  }

  return {
    getState,
    getPublishedProjects,
    getPublishedLocations(): Location[] {
      const publishedProjectIds = getPublishedProjectIds();
      return getState().locations.filter((location) => publishedProjectIds.has(location.projectId));
    },
    getPublishedRoutes(): RouteEntity[] {
      const publishedProjectIds = getPublishedProjectIds();
      return getState().routes.filter((route) => publishedProjectIds.has(route.projectId));
    },
    getMediaSetById(mediaSetId: string): MediaSet | null {
      return getState().mediaSets.find((mediaSet) => mediaSet.id === mediaSetId) ?? null;
    },
    getMediaSetImages(mediaSetId: string): MediaImage[] {
      return getState().mediaImages.filter((image) => image.mediaSetId === mediaSetId);
    },
  };
}
