import type { MediaImage } from '@/types/domain';
import type { PublicMediaImage } from './GalleryHome';

export interface GalleryMediaRailProps {
  /** Day/night mode drives all of the rail's color tokens. */
  nightMode: boolean;
  /** Title shown in the rail header; defaults to a placeholder when no node is selected. */
  activeNodeTitle: string;
  /**
   * Currently selected location id, used only for the "select a location"
   * empty-state copy vs the "no images match" copy.
   */
  activeLocationId: string | null;
  /** True while images for the active location are being fetched. */
  loadingImages: boolean;
  /** Filtered images to render as horizontal cards. */
  images: PublicMediaImage[];
  /** Click handler; called with the tapped image. */
  onImageSelect: (image: MediaImage) => void;
}

/**
 * Bottom media strip rendered when the map view is active and there is
 * either a selected location or images to display. Three internal states:
 *  - loading
 *  - grid of clickable image cards (filteredRailImages)
 *  - empty / "select a location" placeholder
 *
 * Pure presentational. Visibility is controlled by the parent so this
 * component can stay focused on rendering.
 */
export function GalleryMediaRail({
  nightMode,
  activeNodeTitle,
  activeLocationId,
  loadingImages,
  images,
  onImageSelect,
}: GalleryMediaRailProps) {
  return (
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
              {activeNodeTitle}
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
              : `${images.length} item${images.length === 1 ? '' : 's'}`}
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
        ) : images.length > 0 ? (
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
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => onImageSelect(image)}
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
  );
}