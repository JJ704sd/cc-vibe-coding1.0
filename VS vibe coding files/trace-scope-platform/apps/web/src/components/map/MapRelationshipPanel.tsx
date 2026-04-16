import type { MediaImage } from '@/types/domain';

interface MapRelationshipPanelProps {
  title: string;
  summary: string;
  images?: MediaImage[];
  loadingImages?: boolean;
  onImageSelect?: (img: MediaImage) => void;
  onClose?: () => void;
}

export function MapRelationshipPanel({
  title,
  summary,
  images,
  loadingImages,
  onImageSelect,
  onClose,
}: MapRelationshipPanelProps) {
  return (
    <aside className="map-relationship-panel glass">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <h2 className="section-title-sm">{title}</h2>
        {onClose && (
          <button
            type="button"
            aria-label="Close relationship panel"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(200,200,220,0.6)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              padding: '4px 8px',
            }}
          >
            Close
          </button>
        )}
      </div>
      <p className="muted" style={{ marginBottom: images && images.length > 0 ? '16px' : '0' }}>
        {summary}
      </p>
      {loadingImages && (
        <div
          style={{
            color: 'rgba(200,200,220,0.5)',
            fontSize: '0.8rem',
            padding: '8px 0',
          }}
        >
          Loading images...
        </div>
      )}
      {images && images.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginTop: '12px',
          }}
        >
          {images.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => onImageSelect?.(image)}
              style={{
                cursor: 'pointer',
                borderRadius: '8px',
                overflow: 'hidden',
                aspectRatio: '4/3',
                padding: 0,
                border: 'none',
                background: 'transparent',
              }}
            >
              <img
                src={(image as MediaImage & { url?: string }).url || image.thumbnailUrl}
                alt={image.altText || image.caption || ''}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '8px',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
