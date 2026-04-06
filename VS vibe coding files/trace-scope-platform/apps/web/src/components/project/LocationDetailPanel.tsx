import type { Location } from '@/types/domain';

export function LocationDetailPanel({ location }: { location: Location | null }) {
  if (!location) {
    return (
      <aside className="glass" style={{ padding: '24px' }}>
        <p className="muted" style={{ textAlign: 'center' }}>
          请先选择一个地点。后续接入地图交互后，地图点位点击也必须驱动这里的内容更新。
        </p>
      </aside>
    );
  }

  return (
    <aside className="glass animate-in" style={{ padding: '24px' }}>
      <p className="muted" style={{
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        fontSize: '0.7rem',
        marginBottom: '8px',
      }}>
        当前选中地点
      </p>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: '1.3rem',
        marginBottom: '8px',
      }}>
        {location.name}
      </h3>
      <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '12px' }}>
        {location.addressText}
      </p>
      <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{location.description}</p>
    </aside>
  );
}
