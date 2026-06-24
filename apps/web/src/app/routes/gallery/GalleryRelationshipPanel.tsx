import type { MediaImage } from '@/types/domain';
import { MapRelationshipPanel } from '@/components/map/MapRelationshipPanel';

export interface GalleryRelationshipPanelProps {
  /** Day/night mode drives the glass card color tokens. */
  nightMode: boolean;
  /**
   * When the bottom media rail is visible, the relationship panel shrinks
   * to avoid overlapping it. The shell uses this to pick the maxHeight.
   */
  showMediaRail: boolean;
  /** Heading shown at the top of the inner MapRelationshipPanel. */
  title: string;
  /** Body copy shown beneath the title. */
  summary: string;
  /**
   * Optional inline media thumbnails inside the panel. Pass undefined
   * when the bottom media rail is the canonical place to render them.
   */
  images: MediaImage[] | undefined;
  /** While images are loading, pass true to show the inline skeleton. */
  loadingImages: boolean;
  /** Close-button handler. */
  onClose: () => void;
  /** Click handler for any inline thumbnail inside the panel. */
  onImageSelect: (image: MediaImage) => void;
}

/**
 * Right-side overlay that wraps the existing MapRelationshipPanel with the
 * gallery's floating glass shell. Hosts the canonical
 * `data-testid="gallery-relationship-shell"` so the page-level integration
 * tests can still find it.
 *
 * Positioning (fixed top/right, width 360px, safe-area aware) and the
 * glass card wrapper (blur(20px), translucent background, 24px radius)
 * are owned here because the underlying MapRelationshipPanel is shared
 * with the map page and only the gallery page needs this shell.
 */
export function GalleryRelationshipPanel({
  nightMode,
  showMediaRail,
  title,
  summary,
  images,
  loadingImages,
  onClose,
  onImageSelect,
}: GalleryRelationshipPanelProps) {
  return (
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
          title={title}
          summary={summary}
          onClose={onClose}
          images={images}
          loadingImages={loadingImages}
          onImageSelect={onImageSelect}
        />
      </div>
    </div>
  );
}