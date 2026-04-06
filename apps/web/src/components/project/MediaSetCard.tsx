import { Link } from 'react-router-dom';
import type { MediaSet } from '@/types/domain';

export function MediaSetCard({ mediaSet }: { mediaSet: MediaSet }) {
  const href = mediaSet.type === 'spin360' ? `/spin/${mediaSet.id}` : `/gallery/${mediaSet.id}`;
  return (
    <Link to={href} className="panel" style={{ display: 'block', padding: '16px' }}>
      <p className="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.16em' }}>{mediaSet.type}</p>
      <h3 style={{ marginBottom: '8px' }}>{mediaSet.title}</h3>
      <p className="muted">{mediaSet.description}</p>
    </Link>
  );
}
