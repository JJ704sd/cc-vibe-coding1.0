import { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { Link } from 'react-router-dom';
import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  MapBase3DView,
  MapRelationshipPanel,
  MediaClusterLayer,
  MapProjectionOverlay,
} from '@/components/map';
import { GalleryExperience } from '@/components/gallery/GalleryExperience';
import { useMapRelationshipData } from '@/features/map/api/useMapRelationshipData';
import { useProjectedMapGraph } from '@/features/map/projection/useProjectedMapGraph';
import { httpJson } from '@/services/api/httpClient';
import type { MediaImage } from '@/types/domain';

interface PublicMediaImage extends MediaImage {
  url: string;
  mimeType?: string;
}

interface MediaSetWithImages {
  id: string;
  type: string;
  title: string;
  description: string;
  coverImage: string | null;
  locationId: string | null;
  isFeatured: boolean;
  images: Array<{
    id: string;
    caption: string;
    sortOrder: number;
    url: string | null;
    mimeType: string | null;
  }>;
}

async function fetchLocationImages(
  locationId: string,
  nodes: Array<{ id: string; mediaSetIds: string[] }>,
): Promise<PublicMediaImage[]> {
  const location = nodes.find((node) => node.id === locationId);
  if (!location) return [];

  const images: PublicMediaImage[] = [];

  for (const mediaSetId of location.mediaSetIds) {
    try {
      const response = await httpJson<MediaSetWithImages>(`/public/media-sets/${mediaSetId}`);

      for (const image of response.images) {
        if (!image.url) continue;

        images.push({
          id: image.id,
          mediaSetId,
          url: image.url,
          thumbnailUrl: image.url,
          altText: image.caption,
          caption: image.caption,
          sortOrder: image.sortOrder,
          latitude: undefined,
          longitude: undefined,
          createdAt: '',
        });
      }
    } catch {
      // Skip media sets that fail to load so the rest of the location can still render.
    }
  }

  return images;
}

export function GalleryHome() {
  const [viewMode, setViewMode] = useState<'gallery' | 'map'>('gallery');
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<MediaImage | null>(null);
  const [showGalleryPanel, setShowGalleryPanel] = useState(false);
  const [locationImages, setLocationImages] = useState<Map<string, PublicMediaImage[]>>(new Map());
  const [loadingImages, setLoadingImages] = useState(false);
  const [bootstrappingGallery, setBootstrappingGallery] = useState(false);
  const [nightMode, setNightMode] = useState(() => {
    const hours = new Date().getHours() + new Date().getMinutes() / 60;
    return hours < 5.5 || hours > 18.5;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [mapInstance, setMapInstance] = useState<MaplibreMap | null>(null);

  const relationshipData = useMapRelationshipData();
  const activeProjectId = relationshipData.projectGroups[0]?.projectId ?? null;
  const isMapMode = viewMode === 'map';
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    const interval = setInterval(() => {
      const hours = new Date().getHours() + new Date().getMinutes() / 60;
      setNightMode(hours < 5.5 || hours > 18.5);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (viewMode !== 'map') {
      setShowSearch(false);
    }
  }, [viewMode]);

  const fetchLocationImagesMemo = useCallback(async (locationId: string) => {
    if (locationImages.has(locationId)) return;

    setLoadingImages(true);

    try {
      const images = await fetchLocationImages(locationId, relationshipData.nodes);
      setLocationImages((previous) => new Map(previous).set(locationId, images));
    } catch {
      // Ignore fetch failures and allow another attempt on the next selection.
    } finally {
      setLoadingImages(false);
    }
  }, [relationshipData.nodes, locationImages]);

  useEffect(() => {
    if (!isMapMode || !activeLocationId) return;
    fetchLocationImagesMemo(activeLocationId);
  }, [activeLocationId, fetchLocationImagesMemo, isMapMode]);

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
      relationshipData.mediaClusters.find((cluster) => cluster.locationId === activeLocationId) ?? null,
    [activeLocationId, relationshipData.mediaClusters],
  );

  const activeProject = useMemo(
    () => relationshipData.projectGroups.find((group) => group.projectId === activeProjectId) ?? null,
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

    return currentImages.filter((image) =>
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

  const showMediaRail = isMapMode && (
    Boolean(activeLocationId) ||
    loadingImages ||
    filteredRailImages.length > 0
  );

  const handleImageSelect = useCallback((image: MediaImage) => {
    setSelectedImage(image);
  }, []);

  const handleMapLocationSelect = useCallback((locationId: string) => {
    setActiveLocationId(locationId);
    setShowGalleryPanel(true);
  }, []);

  const handleViewModeToggle = useCallback(() => {
    setViewMode((current) => {
      const next = current === 'gallery' ? 'map' : 'gallery';
      if (next === 'gallery') {
        setShowGalleryPanel(false);
      }
      return next;
    });
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: nightMode
          ? 'linear-gradient(180deg, #0a0a1a 0%, #1a1f3a 100%)'
          : 'linear-gradient(180deg, #87CEEB 0%, #FFD9DA 55%, #f85a4e 100%)',
        transition: 'background 2s ease',
      }}
    >
      {viewMode === 'gallery' && (
        <GalleryExperience
          mediaImages={allCurrentImages as MediaImage[]}
          nightMode={nightMode}
          onImageSelect={handleImageSelect}
        />
      )}

      {isMapMode && (
        <>
          <div className="map-page-stage" style={{ position: 'absolute', inset: 0 }}>
            <MapBase3DView
              className="map-page-base"
              onMapReady={setMapInstance}
            />
            <MapProjectionOverlay
              width={projected.width}
              height={projected.height}
              nodes={projected.nodes}
              edges={projected.edges}
              activeProjectId={activeProjectId}
              activeLocationId={activeLocationId}
              onLocationSelect={handleMapLocationSelect}
            />
            <MediaClusterLayer cluster={activeCluster} anchor={activeAnchor} />
          </div>

          {showMediaRail && (
            <div
              data-testid="gallery-media-rail"
              style={{
                position: 'fixed',
                left: '50%',
                bottom: '28px',
                transform: 'translateX(-50%)',
                width: 'min(960px, calc(100vw - 48px))',
                zIndex: 35,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  pointerEvents: 'auto',
                  borderRadius: '24px',
                  padding: '18px 18px 16px',
                  background: nightMode ? 'rgba(7, 10, 20, 0.72)' : 'rgba(255,255,255,0.82)',
                  border: `1px solid ${nightMode ? 'rgba(160,190,255,0.18)' : 'rgba(15,23,42,0.08)'}`,
                  boxShadow: nightMode
                    ? '0 24px 60px rgba(0,0,0,0.34)'
                    : '0 24px 48px rgba(38,57,88,0.16)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: nightMode ? 'rgba(190,205,255,0.62)' : 'rgba(63,79,110,0.55)',
                        fontFamily: "'Work Sans', sans-serif",
                      }}
                    >
                      Selected Media
                    </div>
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: '1.2rem',
                        color: nightMode ? 'rgba(255,255,255,0.92)' : 'rgba(18,24,39,0.88)',
                      }}
                    >
                      {activeNode?.title ?? 'Select a location'}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: nightMode ? 'rgba(210,220,255,0.64)' : 'rgba(55,65,81,0.62)',
                      fontFamily: "'Work Sans', sans-serif",
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {loadingImages
                      ? 'Loading images...'
                      : `${filteredRailImages.length} item${filteredRailImages.length === 1 ? '' : 's'}`}
                  </div>
                </div>

                {loadingImages ? (
                  <div
                    style={{
                      padding: '18px 12px',
                      borderRadius: '18px',
                      color: nightMode ? 'rgba(220,230,255,0.68)' : 'rgba(51,65,85,0.62)',
                      background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.52)',
                      fontFamily: "'Work Sans', sans-serif",
                      fontSize: '0.84rem',
                    }}
                  >
                    Loading the media strip for this location.
                  </div>
                ) : filteredRailImages.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridAutoFlow: 'column',
                      gridAutoColumns: 'minmax(168px, 1fr)',
                      gap: '12px',
                      overflowX: 'auto',
                      paddingBottom: '4px',
                      overscrollBehaviorX: 'contain',
                    }}
                  >
                    {filteredRailImages.map((image) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => handleImageSelect(image)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          padding: '10px',
                          borderRadius: '18px',
                          border: `1px solid ${nightMode ? 'rgba(160,190,255,0.12)' : 'rgba(15,23,42,0.08)'}`,
                          background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.62)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            aspectRatio: '4 / 3',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            background: nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(148,163,184,0.18)',
                          }}
                        >
                          {image.url ? (
                            <img
                              src={image.url}
                              alt={image.altText || image.caption || ''}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : null}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Work Sans', sans-serif",
                            fontSize: '0.8rem',
                            lineHeight: 1.45,
                            color: nightMode ? 'rgba(235,240,255,0.8)' : 'rgba(30,41,59,0.78)',
                          }}
                        >
                          {image.caption || image.altText || 'Untitled image'}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '18px 12px',
                      borderRadius: '18px',
                      color: nightMode ? 'rgba(220,230,255,0.68)' : 'rgba(51,65,85,0.62)',
                      background: nightMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.52)',
                      fontFamily: "'Work Sans', sans-serif",
                      fontSize: '0.84rem',
                    }}
                  >
                    {activeLocationId
                      ? 'No published images match the current search.'
                      : 'Select a location on the map to load its media.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div
        style={{
          position: 'fixed',
          top: 'max(24px, calc(env(safe-area-inset-top) + 12px))',
          left: 'max(16px, calc(env(safe-area-inset-left) + 16px))',
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(18px, 2.4vw, 22px)',
            fontWeight: 400,
            color: nightMode ? 'rgba(200,200,220,0.6)' : 'rgba(60,60,80,0.6)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            maxWidth: '40vw',
            transition: 'color 2s ease',
          }}
        >
          Trace Scope
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          top: 'max(16px, calc(env(safe-area-inset-top) + 4px))',
          right: 'max(16px, calc(env(safe-area-inset-right) + 16px))',
          zIndex: 50,
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          rowGap: '8px',
          maxWidth: 'min(780px, calc(100vw - 96px))',
        }}
      >
        {isMapMode && (
          <>
            <button
              type="button"
              aria-label={showSearch ? 'Hide map search' : 'Show map search'}
              title={showSearch ? 'Hide map search' : 'Show map search'}
              onClick={() => setShowSearch((current) => !current)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                background: showSearch
                  ? 'rgba(91,141,238,0.3)'
                  : nightMode
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.1)',
                border: `1px solid ${showSearch ? 'rgba(91,141,238,0.5)' : nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
                color: 'rgba(255,255,255,0.85)',
                fontSize: '1rem',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
              }}
            >
              Search
            </button>
            {showSearch && (
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Filter selected media…"
                aria-label="Filter selected media"
                name="selected-media-filter"
                autoComplete="off"
                style={{
                  width: 'min(200px, calc(100vw - 128px))',
                  padding: '8px 14px',
                  borderRadius: '14px',
                  background: nightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)',
                  border: `1px solid ${nightMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                  color: nightMode ? 'white' : 'black',
                  fontSize: '0.85rem',
                  outline: 'none',
                  backdropFilter: 'blur(12px)',
                  fontFamily: "'Work Sans', sans-serif",
                }}
              />
            )}
          </>
        )}

        <button
          type="button"
          aria-label={isMapMode ? 'Switch to gallery view' : 'Switch to map view'}
          title={isMapMode ? 'Switch to gallery view' : 'Switch to map view'}
          onClick={handleViewModeToggle}
          style={{
            minWidth: '40px',
            height: '40px',
            padding: '0 14px',
            borderRadius: '14px',
            background: isMapMode ? 'rgba(91,141,238,0.3)' : nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
            border: `1px solid ${isMapMode ? 'rgba(91,141,238,0.5)' : nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
            color: isMapMode ? '#7BA7FF' : 'rgba(255,255,255,0.85)',
            fontSize: '0.82rem',
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
          }}
        >
          {isMapMode ? 'Gallery' : 'Map'}
        </button>

        <button
          type="button"
          aria-label={nightMode ? 'Switch to day mode' : 'Switch to night mode'}
          title={nightMode ? 'Switch to day mode' : 'Switch to night mode'}
          onClick={() => setNightMode((current) => !current)}
          style={{
            minWidth: '40px',
            height: '40px',
            padding: '0 14px',
            borderRadius: '14px',
            background: nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
            border: `1px solid ${nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
            color: nightMode ? '#7BA7FF' : '#FFEEDD',
            fontSize: '0.82rem',
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
          }}
        >
          {nightMode ? 'Day' : 'Night'}
        </button>

        {[
          { to: '/map', label: 'Map' },
          { to: '/projects', label: 'Projects' },
          { to: '/admin', label: 'Admin' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            style={{
              padding: '8px 18px',
              borderRadius: '14px',
              fontSize: '0.8rem',
              fontWeight: 500,
              fontFamily: "'Work Sans', sans-serif",
              backdropFilter: 'blur(12px)',
              background: nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
              border: `1px solid ${nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
              color: 'rgba(255,255,255,0.85)',
              textDecoration: 'none',
              transition: 'background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease',
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {viewMode === 'gallery' && (
        <div
          style={{
            position: 'fixed',
            bottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))',
            left: 'max(16px, calc(env(safe-area-inset-left) + 16px))',
            zIndex: 30,
            fontSize: '11px',
            color: nightMode ? 'rgba(200,200,220,0.35)' : 'rgba(60,60,80,0.4)',
            letterSpacing: '0.06em',
            fontFamily: "'Work Sans', sans-serif",
            pointerEvents: 'none',
            maxWidth: 'min(420px, calc(100vw - 32px))',
          }}
        >
          {bootstrappingGallery
            ? 'Loading gallery media…'
            : 'Drag to rotate the view. Click a card to open the full image.'}
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          bottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))',
          right: 'max(16px, calc(env(safe-area-inset-right) + 16px))',
          zIndex: 30,
          fontSize: '11px',
          color: nightMode ? 'rgba(200,200,220,0.25)' : 'rgba(60,60,80,0.3)',
          letterSpacing: '0.04em',
          fontFamily: "'Work Sans', sans-serif",
          pointerEvents: 'none',
        }}
      >
        © 2026 Trace Scope
      </div>

      {isMapMode && showGalleryPanel && (
        <div
          data-testid="gallery-relationship-shell"
          style={{
            position: 'fixed',
            top: 'max(84px, calc(env(safe-area-inset-top) + 72px))',
            right: 'max(16px, calc(env(safe-area-inset-right) + 16px))',
            width: 'min(360px, calc(100vw - 32px))',
            maxHeight: showMediaRail ? 'calc(100vh - 320px)' : 'calc(100vh - 160px)',
            zIndex: 42,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              pointerEvents: 'auto',
              maxHeight: '100%',
              overflowY: 'auto',
              borderRadius: '24px',
              background: nightMode ? 'rgba(7, 10, 20, 0.72)' : 'rgba(255,255,255,0.82)',
              border: `1px solid ${nightMode ? 'rgba(160,190,255,0.18)' : 'rgba(15,23,42,0.08)'}`,
              boxShadow: nightMode
                ? '0 24px 60px rgba(0,0,0,0.34)'
                : '0 24px 48px rgba(38,57,88,0.16)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <MapRelationshipPanel
              title={activeNode?.title ?? activeProject?.title ?? 'Map relationships'}
              summary={activeNode?.description ?? activeProject?.summary ?? 'Select a node to inspect the connected media and location context.'}
              onClose={() => setShowGalleryPanel(false)}
              images={showMediaRail ? undefined : currentImages}
              loadingImages={showMediaRail ? false : loadingImages}
              onImageSelect={handleImageSelect}
            />
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={(selectedImage as PublicMediaImage).url || selectedImage.thumbnailUrl}
            alt={selectedImage.altText || ''}
            onClick={(event) => event.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              objectFit: 'contain',
            }}
          />
          {selectedImage.caption && (
            <p
              onClick={(event) => event.stopPropagation()}
              style={{
                position: 'absolute',
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.8)',
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '1.1rem',
                textAlign: 'center',
                maxWidth: '600px',
              }}
            >
              {selectedImage.caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
