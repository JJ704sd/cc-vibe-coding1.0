import type { MediaImage } from '@/types/domain';

export interface GalleryImageModalProps {
  /** Selected media image; null renders nothing. */
  image: MediaImage | null;
  /** Close handler; triggered when the user clicks the backdrop. */
  onClose: () => void;
}

/**
 * Full-screen overlay that previews a single selected media image.
 *
 * Pure presentational component. Renders nothing when `image` is null so the
 * parent can pass the current selection state directly without an extra guard.
 */
export function GalleryImageModal({ image, onClose }: GalleryImageModalProps) {
  if (!image) return null;

  // The gallery sometimes attaches a renderable `url` field to MediaImage via
  // a public-images fetch. Fall back to `thumbnailUrl` when it is missing.
  const directUrl = (image as MediaImage & { url?: string }).url;

  return (
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
      onClick={onClose}
    >
      <img
        src={directUrl || image.thumbnailUrl}
        alt={image.altText || ''}
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          objectFit: 'contain',
        }}
      />
      {image.caption && (
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
          {image.caption}
        </p>
      )}
    </div>
  );
}