import { useCallback, useEffect, useMemo, useState, useDeferredValue } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { fetchLocationImages, type PublicMediaImage } from '@/app/routes/gallery/locationImages';
import { useMapRelationshipData } from '@/features/map/api/useMapRelationshipData';
import { useProjectedMapGraph } from '@/features/map/projection/useProjectedMapGraph';
import type { MediaImage } from '@/types/domain';

export type GalleryHomeViewMode = 'gallery' | 'map';

export interface GalleryHomeController {
  // --- state ---
  viewMode: GalleryHomeViewMode;
  activeLocationId: string | null;
  selectedImage: MediaImage | null;
  showGalleryPanel: boolean;
  showLoadingScreen: boolean;
  nightMode: boolean;
  showSearch: boolean;
  searchQuery: string;
  mapInstance: MaplibreMap | null;
  loadingImages: boolean;
  bootstrappingGallery: boolean;

  // --- derived ---
  isMapMode: boolean;
  activeProjectId: string | null;
  activeAnchor: ReturnType<typeof useProjectedMapGraph>['nodes'][number] | null;
  activeCluster: ReturnType<typeof useMapRelationshipData>['mediaClusters'][number] | null;
  activeProject: ReturnType<typeof useMapRelationshipData>['projectGroups'][number] | null;
  activeNode: ReturnType<typeof useMapRelationshipData>['nodes'][number] | null;
  currentImages: PublicMediaImage[];
  filteredRailImages: PublicMediaImage[];
  allCurrentImages: PublicMediaImage[];
  showMediaRail: boolean;
  projected: ReturnType<typeof useProjectedMapGraph>;

  // --- actions ---
  handleImageSelect: (image: MediaImage) => void;
  handleMapLocationSelect: (locationId: string) => void;
  handleViewModeToggle: () => void;
  handleLoadingComplete: () => void;
  handleCloseGalleryPanel: () => void;
  handleCloseImageModal: () => void;
  toggleSearch: () => void;
  toggleNightMode: () => void;
  setSearchQuery: (query: string) => void;
  setMapInstance: (map: MaplibreMap | null) => void;
}

function isNightHours(date: Date): boolean {
  const hours = date.getHours() + date.getMinutes() / 60;
  return hours < 5.5 || hours > 18.5;
}

/**
 * BUG-014 — encapsulates GalleryHome page state and side effects so the route
 * component only renders JSX. Owns:
 *   - 11 useState buckets (view / loading / night mode / search / map instance / ...)
 *   - the night-mode setInterval (refresh once a minute)
 *   - the location-image preload effect (map mode + gallery bootstrap)
 *   - memoized active anchor / cluster / project / node selectors
 *   - search-debounced filtered rail images
 *
 * All api / data hooks (useMapRelationshipData, useProjectedMapGraph) are
 * consumed here so the page stays purely presentational.
 */
export function useGalleryHomeController(): GalleryHomeController {
  const [viewMode, setViewMode] = useState<GalleryHomeViewMode>('gallery');
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<MediaImage | null>(null);
  const [showGalleryPanel, setShowGalleryPanel] = useState(false);
  const [locationImages, setLocationImages] = useState<Map<string, PublicMediaImage[]>>(
    () => new Map(),
  );
  const [loadingImages, setLoadingImages] = useState(false);
  const [bootstrappingGallery, setBootstrappingGallery] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [nightMode, setNightMode] = useState<boolean>(() => isNightHours(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [mapInstance, setMapInstance] = useState<MaplibreMap | null>(null);

  const relationshipData = useMapRelationshipData();
  const activeProjectId = relationshipData.projectGroups[0]?.projectId ?? null;
  const isMapMode = viewMode === 'map';
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Refresh night mode every minute (sunset / sunrise transition).
  useEffect(() => {
    const interval = setInterval(() => {
      setNightMode(isNightHours(new Date()));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Search overlay only makes sense in map mode.
  useEffect(() => {
    if (viewMode !== 'map') {
      setShowSearch(false);
    }
  }, [viewMode]);

  const fetchLocationImagesFor = useCallback(
    async (locationId: string) => {
      if (locationImages.has(locationId)) return;
      setLoadingImages(true);
      try {
        const images = await fetchLocationImages(locationId, relationshipData.nodes);
        setLocationImages((previous) => new Map(previous).set(locationId, images));
      } catch {
        // Allow another attempt on the next selection — surface in console for debug.
        // eslint-disable-next-line no-console
        console.warn('[GalleryHome] failed to fetch location images', locationId);
      } finally {
        setLoadingImages(false);
      }
    },
    [locationImages, relationshipData.nodes],
  );

  // Map mode: fetch images for the currently active location.
  useEffect(() => {
    if (!isMapMode || !activeLocationId) return;
    void fetchLocationImagesFor(activeLocationId);
  }, [activeLocationId, fetchLocationImagesFor, isMapMode]);

  // Gallery mode: preload every missing node's images in parallel.
  useEffect(() => {
    if (viewMode !== 'gallery') return;

    const missingNodes = relationshipData.nodes.filter((node) => !locationImages.has(node.id));
    if (missingNodes.length === 0) return;

    let cancelled = false;
    setBootstrappingGallery(true);

    void Promise.all(
      missingNodes.map(async (node) => ({
        id: node.id,
        images: await fetchLocationImages(node.id, relationshipData.nodes),
      })),
    )
      .then((results) => {
        if (cancelled) return;
        setLocationImages((previous) => {
          const next = new Map(previous);
          results.forEach(({ id, images }) => {
            if (!next.has(id)) {
              next.set(id, images);
            }
          });
          return next;
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Surface the failure in the console without escalating to an
        // unhandled rejection. The gallery renders empty for missing
        // locations — there is no toast surface in this route.
        // eslint-disable-next-line no-console
        console.error('[GalleryHome] failed to preload gallery media', error);
      })
      .finally(() => {
        if (!cancelled) {
          setBootstrappingGallery(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locationImages, relationshipData.nodes, viewMode]);

  const projected = useProjectedMapGraph({
    map: mapInstance,
    viewModel: {
      nodes: relationshipData.nodes,
      edges: relationshipData.edges,
    },
  });

  const activeAnchor = useMemo(
    () => projected.nodes.find((node) => node.id === activeLocationId) ?? null,
    [activeLocationId, projected.nodes],
  );

  const activeCluster = useMemo(
    () =>
      relationshipData.mediaClusters.find((cluster) => cluster.locationId === activeLocationId) ??
      null,
    [activeLocationId, relationshipData.mediaClusters],
  );

  const activeProject = useMemo(
    () =>
      relationshipData.projectGroups.find((group) => group.projectId === activeProjectId) ?? null,
    [activeProjectId, relationshipData.projectGroups],
  );

  const activeNode = useMemo(
    () => relationshipData.nodes.find((node) => node.id === activeLocationId) ?? null,
    [activeLocationId, relationshipData.nodes],
  );

  const currentImages = activeLocationId ? (locationImages.get(activeLocationId) ?? []) : [];

  const filteredRailImages = useMemo(() => {
    if (!deferredSearchQuery.trim()) return currentImages;

    const query = deferredSearchQuery.toLowerCase();
    return currentImages.filter(
      (image) =>
        image.caption?.toLowerCase().includes(query) ||
        image.altText?.toLowerCase().includes(query),
    );
  }, [currentImages, deferredSearchQuery]);

  const allCurrentImages = useMemo(() => {
    if (isMapMode) return currentImages;

    const allImages: PublicMediaImage[] = [];
    relationshipData.nodes.forEach((node) => {
      const images = locationImages.get(node.id);
      if (images) allImages.push(...images);
    });
    return allImages;
  }, [currentImages, isMapMode, locationImages, relationshipData.nodes]);

  const showMediaRail =
    isMapMode && (Boolean(activeLocationId) || loadingImages || filteredRailImages.length > 0);

  const handleImageSelect = useCallback((image: MediaImage) => {
    setSelectedImage(image);
  }, []);

  const handleMapLocationSelect = useCallback((locationId: string) => {
    setActiveLocationId(locationId);
    setShowGalleryPanel(true);
  }, []);

  const handleViewModeToggle = useCallback(() => {
    setViewMode((current) => {
      const next: GalleryHomeViewMode = current === 'gallery' ? 'map' : 'gallery';
      if (next === 'gallery') {
        setShowGalleryPanel(false);
      }
      return next;
    });
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setShowLoadingScreen(false);
  }, []);

  const handleCloseGalleryPanel = useCallback(() => {
    setShowGalleryPanel(false);
  }, []);

  const handleCloseImageModal = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const toggleSearch = useCallback(() => {
    setShowSearch((current) => !current);
  }, []);

  const toggleNightMode = useCallback(() => {
    setNightMode((current) => !current);
  }, []);

  return {
    // state
    viewMode,
    activeLocationId,
    selectedImage,
    showGalleryPanel,
    showLoadingScreen,
    nightMode,
    showSearch,
    searchQuery,
    mapInstance,
    loadingImages,
    bootstrappingGallery,

    // derived
    isMapMode,
    activeProjectId,
    activeAnchor,
    activeCluster,
    activeProject,
    activeNode,
    currentImages,
    filteredRailImages,
    allCurrentImages,
    showMediaRail,
    projected,

    // actions
    handleImageSelect,
    handleMapLocationSelect,
    handleViewModeToggle,
    handleLoadingComplete,
    handleCloseGalleryPanel,
    handleCloseImageModal,
    toggleSearch,
    toggleNightMode,
    setSearchQuery,
    setMapInstance,
  };
}