import { useMemo, useState } from 'react';
import type { MediaImage } from '@/types/domain';

export function GalleryViewer({ images }: { images: MediaImage[] }) {
  const orderedImages = useMemo(() => [...images].sort((a, b) => a.sortOrder - b.sortOrder), [images]);
  const [activeId, setActiveId] = useState(orderedImages[0]?.id ?? '');
  const activeImage = orderedImages.find((image) => image.id === activeId) ?? orderedImages[0];

  if (orderedImages.length === 0) {
    return (
      <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
        <div className="empty-state-icon">◇</div>
        <p className="muted mt-4">当前媒体组没有可用图片</p>
      </div>
    );
  }

  return (
    <div className="glass animate-in" style={{ padding: '28px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 className="section-title-sm" style={{ margin: 0 }}>图集查看器</h2>
        <p className="muted mt-2" style={{ margin: 0 }}>共 {orderedImages.length} 张图片</p>
      </div>

      <div style={{
        borderRadius: '24px',
        overflow: 'hidden',
        aspectRatio: '4/3',
        background: 'rgba(0,0,0,0.06)',
        marginBottom: '16px',
      }}>
        <img
          src={activeImage?.url}
          alt={activeImage?.altText ?? '图集图片'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {activeImage?.caption && (
        <p className="muted" style={{ textAlign: 'center', marginBottom: '16px', fontStyle: 'italic' }}>
          {activeImage.caption}
        </p>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {orderedImages.map((image) => (
          <button
            key={image.id}
            onClick={() => setActiveId(image.id)}
            style={{
              width: '64px',
              height: '48px',
              padding: 0,
              borderRadius: '12px',
              overflow: 'hidden',
              border: image.id === activeId
                ? '2px solid var(--accent)'
                : '2px solid var(--glass-border)',
              opacity: image.id === activeId ? 1 : 0.5,
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
          >
            <img
              src={image.thumbnailUrl}
              alt={image.altText}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
