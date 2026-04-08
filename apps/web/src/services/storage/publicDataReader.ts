import type { Location, MediaImage, MediaSet, Project, RouteEntity } from '@/types/domain';
import type { AdminDataState, createAdminDataStore } from '@/services/storage/adminDataStore';

export type AdminDataStore = ReturnType<typeof createAdminDataStore>;

export function createPublicDataReader(store: AdminDataStore, snapshot?: AdminDataState) {
  function getState() {
    return snapshot ?? store.getState();
  }

  function getPublishedProjectsFromState(state: AdminDataState): Project[] {
    return state.projects.filter((project) => project.status === 'published');
  }

  function getPublishedProjectIdsFromState(state: AdminDataState) {
    return new Set(getPublishedProjectsFromState(state).map((project) => project.id));
  }

  function getAllPublishedMediaImagesFromState(state: AdminDataState): MediaImage[] {
    const publishedProjectIds = getPublishedProjectIdsFromState(state);
    const publishedMediaSets = state.mediaSets.filter(
      (ms) => publishedProjectIds.has(ms.projectId),
    );
    const mediaSetIds = new Set(publishedMediaSets.map((ms) => ms.id));
    return state.mediaImages.filter((img) => mediaSetIds.has(img.mediaSetId));
  }

  return {
    getState,
    getPublishedProjects(): Project[] {
      return getPublishedProjectsFromState(getState());
    },
    getPublishedLocations(): Location[] {
      const state = getState();
      const publishedProjectIds = getPublishedProjectIdsFromState(state);
      return state.locations.filter((location) => publishedProjectIds.has(location.projectId));
    },
    getPublishedRoutes(): RouteEntity[] {
      const state = getState();
      const publishedProjectIds = getPublishedProjectIdsFromState(state);
      return state.routes.filter((route) => publishedProjectIds.has(route.projectId));
    },
    getPublishedMapRelationshipSource() {
      const state = getState();
      const publishedProjectIds = getPublishedProjectIdsFromState(state);
      const mediaSets = state.mediaSets.filter((mediaSet) => publishedProjectIds.has(mediaSet.projectId));
      const mediaSetIds = new Set(mediaSets.map((mediaSet) => mediaSet.id));

      return {
        projects: getPublishedProjectsFromState(state),
        locations: state.locations.filter((location) => publishedProjectIds.has(location.projectId)),
        mediaSets,
        mediaImages: state.mediaImages.filter((image) => mediaSetIds.has(image.mediaSetId)),
        routes: state.routes.filter((route) => publishedProjectIds.has(route.projectId)),
      };
    },
    getMediaSetById(mediaSetId: string): MediaSet | null {
      const state = getState();
      const publishedProjectIds = getPublishedProjectIdsFromState(state);
      return (
        state.mediaSets.find(
          (mediaSet) => mediaSet.id === mediaSetId && publishedProjectIds.has(mediaSet.projectId),
        ) ?? null
      );
    },
    getMediaSetImages(mediaSetId: string): MediaImage[] {
      const state = getState();
      const publishedProjectIds = getPublishedProjectIdsFromState(state);
      const mediaSet = state.mediaSets.find(
        (currentMediaSet) =>
          currentMediaSet.id === mediaSetId && publishedProjectIds.has(currentMediaSet.projectId),
      );

      if (!mediaSet) {
        return [];
      }

      return state.mediaImages.filter((image) => image.mediaSetId === mediaSet.id);
    },
    getAllPublishedMediaImages(): MediaImage[] {
      return getAllPublishedMediaImagesFromState(getState());
    },
  };
}
