import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import {
  MapBase3DView,
  MediaClusterLayer,
  MapProjectionOverlay,
} from '@/components/map';
import { GalleryExperience } from '@/components/gallery/GalleryExperience';
import { LoadingScreen } from '@/components/gallery/LoadingScreen';
import { GalleryImageModal } from './GalleryImageModal';
import { GalleryMediaRail } from './GalleryMediaRail';
import { GalleryTopBar } from './GalleryTopBar';
import { GalleryRelationshipPanel } from './GalleryRelationshipPanel';
import { useGalleryHomeController } from '@/features/gallery/useGalleryHomeController';
import type { MediaImage } from '@/types/domain';

export function GalleryHome() {
  const controller = useGalleryHomeController();
  const isMobileViewport = useMediaQuery('(max-width: 760px)');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: controller.nightMode
          ? 'linear-gradient(180deg, #0a0a1a 0%, #1a1f3a 100%)'
          : 'linear-gradient(180deg, #87CEEB 0%, #FFD9DA 55%, #f85a4e 100%)',
        transition: 'background 2s ease',
      }}
    >
      {controller.showLoadingScreen && (
        <LoadingScreen nightMode={controller.nightMode} onComplete={controller.handleLoadingComplete} />
      )}

      {controller.viewMode === 'gallery' && (
        <GalleryExperience
          mediaImages={controller.allCurrentImages as MediaImage[]}
          nightMode={controller.nightMode}
          onImageSelect={controller.handleImageSelect}
        />
      )}

      {controller.isMapMode && (
        <>
          <div className="map-page-stage" style={{ position: 'absolute', inset: 0 }}>
            <MapBase3DView
              className="map-page-base"
              onMapReady={controller.setMapInstance}
            />
            <MapProjectionOverlay
              width={controller.projected.width}
              height={controller.projected.height}
              nodes={controller.projected.nodes}
              edges={controller.projected.edges}
              activeProjectId={controller.activeProjectId}
              activeLocationId={controller.activeLocationId}
              onLocationSelect={controller.handleMapLocationSelect}
            />
            <MediaClusterLayer cluster={controller.activeCluster} anchor={controller.activeAnchor} />
          </div>

          {controller.showMediaRail && (
            <GalleryMediaRail
              nightMode={controller.nightMode}
              activeNodeTitle={controller.activeNode?.title ?? 'Select a location'}
              activeLocationId={controller.activeLocationId}
              loadingImages={controller.loadingImages}
              images={controller.filteredRailImages}
              onImageSelect={controller.handleImageSelect}
            />
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
            color: controller.nightMode ? 'rgba(200,200,220,0.6)' : 'rgba(60,60,80,0.6)',
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
        <GalleryTopBar
          nightMode={controller.nightMode}
          isMapMode={controller.isMapMode}
          showSearch={controller.showSearch}
          searchQuery={controller.searchQuery}
          onSearchToggle={controller.toggleSearch}
          onSearchChange={controller.setSearchQuery}
          onViewModeToggle={controller.handleViewModeToggle}
          onNightModeToggle={controller.toggleNightMode}
        />
      </div>

      {controller.viewMode === 'gallery' && (
        <div
          style={{
            position: 'fixed',
            bottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))',
            left: 'max(16px, calc(env(safe-area-inset-left) + 16px))',
            zIndex: 30,
            fontSize: '11px',
            color: controller.nightMode ? 'rgba(200,200,220,0.35)' : 'rgba(60,60,80,0.4)',
            letterSpacing: '0.06em',
            fontFamily: "'Work Sans', sans-serif",
            pointerEvents: 'none',
            maxWidth: 'min(420px, calc(100vw - 32px))',
          }}
        >
          {controller.bootstrappingGallery
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
          color: controller.nightMode ? 'rgba(200,200,220,0.25)' : 'rgba(60,60,80,0.3)',
          letterSpacing: '0.04em',
          fontFamily: "'Work Sans', sans-serif",
          pointerEvents: 'none',
        }}
      >
        © 2026 Trace Scope
      </div>

      {controller.isMapMode && controller.showGalleryPanel && (
        <GalleryRelationshipPanel
          nightMode={controller.nightMode}
          showMediaRail={controller.showMediaRail}
          title={controller.activeNode?.title ?? controller.activeProject?.title ?? 'Map relationships'}
          summary={
            controller.activeNode?.description ??
            controller.activeProject?.summary ??
            'Select a node to inspect the connected media and location context.'
          }
          images={controller.showMediaRail ? undefined : controller.currentImages}
          loadingImages={controller.showMediaRail ? false : controller.loadingImages}
          onClose={controller.handleCloseGalleryPanel}
          onImageSelect={controller.handleImageSelect}
          isMobile={isMobileViewport}
        />
      )}

      {controller.selectedImage && (
        <GalleryImageModal
          image={controller.selectedImage}
          onClose={controller.handleCloseImageModal}
        />
      )}
    </div>
  );
}