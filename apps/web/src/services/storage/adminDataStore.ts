import type { Location, MediaImage, MediaSet, Project, RouteEntity } from '@/types/domain';
import { locations, mediaImages, mediaSets, projects, routes } from '@/services/api/mock-data';

export interface AdminDataState {
  projects: Project[];
  locations: Location[];
  mediaSets: MediaSet[];
  mediaImages: MediaImage[];
  routes: RouteEntity[];
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  subscribeExternal?(key: string, listener: () => void): () => void;
}

const STORAGE_KEY = 'trace-scope-admin-data';

const defaultSeed: AdminDataState = {
  projects,
  locations,
  mediaSets,
  mediaImages,
  routes,
};

export function createMemoryStorageAdapter(): StorageAdapter & { setExternalItem(key: string, value: string): void } {
  const store = new Map<string, string>();
  const listeners = new Map<string, Set<() => void>>();

  function emit(key: string) {
    listeners.get(key)?.forEach((listener) => listener());
  }

  return {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    subscribeExternal(key, listener) {
      const keyListeners = listeners.get(key) ?? new Set<() => void>();
      keyListeners.add(listener);
      listeners.set(key, keyListeners);
      return () => {
        keyListeners.delete(listener);
      };
    },
    setExternalItem(key, value) {
      store.set(key, value);
      emit(key);
    },
  };
}

export function createBrowserStorageAdapter(): StorageAdapter {
  return {
    getItem(key) {
      if (typeof window === 'undefined') {
        return null;
      }
      return window.localStorage.getItem(key);
    },
    setItem(key, value) {
      if (typeof window === 'undefined') {
        return;
      }
      window.localStorage.setItem(key, value);
    },
    subscribeExternal(key, listener) {
      if (typeof window === 'undefined') {
        return () => {};
      }

      const handleStorage = (event: StorageEvent) => {
        if (event.key === key) {
          listener();
        }
      };

      window.addEventListener('storage', handleStorage);
      return () => {
        window.removeEventListener('storage', handleStorage);
      };
    },
  };
}

export function createAdminDataStore({
  adapter = createBrowserStorageAdapter(),
  seed = defaultSeed,
}: {
  adapter?: StorageAdapter;
  seed?: AdminDataState;
} = {}) {
  const listeners = new Set<() => void>();

  function readState(): AdminDataState {
    const raw = adapter.getItem(STORAGE_KEY);
    if (!raw) {
      adapter.setItem(STORAGE_KEY, JSON.stringify(seed));
      return structuredClone(seed);
    }

    return JSON.parse(raw) as AdminDataState;
  }

  function emitChange() {
    listeners.forEach((listener) => listener());
  }

  const unsubscribeExternal = adapter.subscribeExternal?.(STORAGE_KEY, emitChange);

  function writeState(nextState: AdminDataState) {
    adapter.setItem(STORAGE_KEY, JSON.stringify(nextState));
    emitChange();
  }

  function upsertById<T extends { id: string }>(items: T[], nextItem: T) {
    const existingIndex = items.findIndex((item) => item.id === nextItem.id);
    if (existingIndex === -1) {
      return [...items, nextItem];
    }

    const clone = [...items];
    clone[existingIndex] = nextItem;
    return clone;
  }

  return {
    getState() {
      return readState();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          unsubscribeExternal?.();
        }
      };
    },
    saveProject(project: Project) {
      const state = readState();
      writeState({ ...state, projects: upsertById(state.projects, project) });
    },
    deleteProject(projectId: string) {
      const state = readState();
      writeState({ ...state, projects: state.projects.filter((project) => project.id !== projectId) });
    },
    saveLocation(location: Location) {
      const state = readState();
      writeState({ ...state, locations: upsertById(state.locations, location) });
    },
    deleteLocation(locationId: string) {
      const state = readState();
      writeState({ ...state, locations: state.locations.filter((location) => location.id !== locationId) });
    },
    saveMediaSet(mediaSet: MediaSet) {
      const state = readState();
      writeState({ ...state, mediaSets: upsertById(state.mediaSets, mediaSet) });
    },
    deleteMediaSet(mediaSetId: string) {
      const state = readState();
      writeState({ ...state, mediaSets: state.mediaSets.filter((mediaSet) => mediaSet.id !== mediaSetId) });
    },
    saveRoute(route: RouteEntity) {
      const state = readState();
      writeState({ ...state, routes: upsertById(state.routes, route) });
    },
    deleteRoute(routeId: string) {
      const state = readState();
      writeState({ ...state, routes: state.routes.filter((route) => route.id !== routeId) });
    },
    saveMediaImage(image: MediaImage) {
      const state = readState();
      const nextMediaSets = state.mediaSets.map((mediaSet) => {
        if (mediaSet.id !== image.mediaSetId || mediaSet.imageIds.includes(image.id)) {
          return mediaSet;
        }

        return {
          ...mediaSet,
          imageIds: [...mediaSet.imageIds, image.id],
        };
      });

      writeState({
        ...state,
        mediaImages: upsertById(state.mediaImages, image),
        mediaSets: nextMediaSets,
      });
    },
    deleteMediaImage(imageId: string) {
      const state = readState();
      const image = state.mediaImages.find((img) => img.id === imageId);
      if (!image) return;
      writeState({
        ...state,
        mediaImages: state.mediaImages.filter((img) => img.id !== imageId),
        mediaSets: state.mediaSets.map((ms) =>
          ms.imageIds.includes(imageId) ? { ...ms, imageIds: ms.imageIds.filter((id) => id !== imageId) } : ms
        ),
      });
    },
    reorderMediaImages(mediaSetId: string, orderedImageIds: string[]) {
      const state = readState();
      const imageOrder = new Map(orderedImageIds.map((imageId, index) => [imageId, index + 1]));

      writeState({
        ...state,
        mediaSets: state.mediaSets.map((mediaSet) =>
          mediaSet.id === mediaSetId ? { ...mediaSet, imageIds: orderedImageIds } : mediaSet,
        ),
        mediaImages: state.mediaImages.map((image) =>
          image.mediaSetId === mediaSetId && imageOrder.has(image.id)
            ? { ...image, sortOrder: imageOrder.get(image.id)! }
            : image,
        ),
      });
    },
    reset() {
      writeState(structuredClone(seed));
    },
  };
}

export const adminDataStore = createAdminDataStore();
