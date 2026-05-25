import { useMemo, useState } from 'react';
import type { MediaImage } from '@/types/domain';

export function SpinViewer({ images }: { images: MediaImage[] }) {
  const orderedImages = useMemo(() => [...images].sort((a, b) => a.sortOrder - b.sortOrder), [images]);
  const [frameIndex, setFrameIndex] = useState(0);
  const currentImage = orderedImages[frameIndex] ?? orderedImages[0];
  const totalFrames = orderedImages.length;

  function move(delta: number) {
    if (totalFrames === 0) return;
    setFrameIndex((current) => (current + delta + totalFrames) % totalFrames);
  }

  if (totalFrames === 0) {
    return (
      <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
        <div className="empty-state-icon">◈</div>
        <p className="muted mt-4">当前媒体组没有可用图片</p>
      </div>
    );
  }

  return (
    <div className="glass animate-in" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="section-title-sm" style={{ margin: 0 }}>360° 序列查看器</h2>
          {totalFrames < 8 && (
            <p style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--accent-warm)' }}>
              当前图片数量 {totalFrames} 张，建议至少 8 张以获得流畅的旋转体验
            </p>
          )}
        </div>
        <div className="badge badge-accent" style={{ fontSize: '1rem', padding: '8px 16px' }}>
          {String(frameIndex + 1).padStart(2, '0')} / {String(totalFrames).padStart(2, '0')}
        </div>
      </div>

      <div style={{
        borderRadius: '24px',
        overflow: 'hidden',
        aspectRatio: '4/3',
        background: 'rgba(0,0,0,0.08)',
        marginBottom: '20px',
      }}>
        <img
          src={currentImage?.url}
          alt={currentImage?.altText ?? '旋转帧'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <button
          onClick={() => move(-1)}
          style={{ padding: '12px 32px', fontSize: '0.95rem', borderRadius: '16px' }}
        >
          ◀ 上一帧
        </button>
        <button
          onClick={() => move(1)}
          className="btn-accent"
          style={{ padding: '12px 32px', fontSize: '0.95rem', borderRadius: '16px' }}
        >
          下一帧 ▶
        </button>
      </div>

      {totalFrames > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
          {orderedImages.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setFrameIndex(idx)}
              style={{
                width: '52px',
                height: '38px',
                padding: 0,
                borderRadius: '10px',
                overflow: 'hidden',
                border: idx === frameIndex
                  ? '2px solid var(--accent)'
                  : '2px solid var(--glass-border)',
                opacity: idx === frameIndex ? 1 : 0.5,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
            >
              <img
                src={img.thumbnailUrl}
                alt={img.altText}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
