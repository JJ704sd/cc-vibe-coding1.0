import { useState } from 'react';
import type { Location } from '@/types/domain';

export function LocationDetailPanel({ location }: { location: Location | null }) {
  const [hovered, setHovered] = useState(false);
  if (!location) {
    return (
      <aside
        className="glass"
        style={{
          padding: '24px',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          background: 'var(--glass-bg-strong)',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        <p className="muted" style={{ textAlign: 'center' }}>
          请先选择一个地点。后续接入地图交互后，地图点位点击也必须驱动这里的内容更新。
        </p>
      </aside>
    );
  }

  return (
    <aside
      className="glass animate-in"
      data-testid="location-detail-panel"
      data-location-id={location.id}
      data-hovered={hovered ? 'true' : 'false'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        padding: '24px',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        background: 'var(--glass-bg-strong)',
        transform: hovered ? 'translateY(-2px) scale(1.01)' : 'translateY(0) scale(1)',
        boxShadow: hovered ? 'var(--shadow-3)' : 'var(--shadow-2)',
        transition: 'transform var(--transition-med), box-shadow var(--transition-med), background-color var(--transition-fast), border-color var(--transition-fast)',
      }}
    >
      {hovered ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            borderRadius: 'inherit',
            background:
              'linear-gradient(135deg, var(--glass-border) 0%, transparent 35%, transparent 65%, var(--glass-border) 100%)',
            opacity: 0.35,
            transition: 'opacity var(--transition-fast)',
          }}
        />
      ) : null}
      <p className="muted" style={{
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        fontSize: '0.7rem',
        marginBottom: '8px',
        position: 'relative',
      }}>
        当前选中地点
      </p>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '1.3rem',
        marginBottom: '8px',
        position: 'relative',
      }}>
        {location.name}
      </h3>
      <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '12px', position: 'relative' }}>
        {location.addressText}
      </p>
      <p style={{ fontSize: '0.9rem', lineHeight: 1.6, position: 'relative' }}>{location.description}</p>
    </aside>
  );
}
