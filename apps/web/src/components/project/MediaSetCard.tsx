import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { MediaSet } from '@/types/domain';

export function MediaSetCard({ mediaSet }: { mediaSet: MediaSet }) {
  const href = mediaSet.type === 'spin360' ? `/spin/${mediaSet.id}` : `/gallery/${mediaSet.id}`;
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={href}
      className="glass glass-interactive"
      data-testid="media-set-card"
      data-media-type={mediaSet.type}
      data-hovered={hovered ? 'true' : 'false'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'block',
        padding: '20px',
        textDecoration: 'none',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', position: 'relative' }}>
        <span className={mediaSet.type === 'spin360' ? 'badge badge-warm' : 'badge badge-accent'}>
          {mediaSet.type}
        </span>
      </div>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '1.05rem',
        fontWeight: 600,
        marginBottom: '8px',
        color: 'var(--text-primary)',
        position: 'relative',
      }}>
        {mediaSet.title}
      </h3>
      <p className="muted" style={{ fontSize: '0.875rem', position: 'relative' }}>{mediaSet.description}</p>
    </Link>
  );
}
