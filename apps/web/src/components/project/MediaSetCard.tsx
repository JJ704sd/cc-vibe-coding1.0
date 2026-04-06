import { Link } from 'react-router-dom';
import type { MediaSet } from '@/types/domain';

export function MediaSetCard({ mediaSet }: { mediaSet: MediaSet }) {
  const href = mediaSet.type === 'spin360' ? `/spin/${mediaSet.id}` : `/gallery/${mediaSet.id}`;
  return (
    <Link
      to={href}
      className="glass glass-interactive"
      style={{ display: 'block', padding: '20px', textDecoration: 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
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
      }}>
        {mediaSet.title}
      </h3>
      <p className="muted" style={{ fontSize: '0.875rem' }}>{mediaSet.description}</p>
    </Link>
  );
}
