import type { Location } from '@/types/domain';

export function LocationDetailPanel({ location }: { location: Location | null }) {
  if (!location) {
    return <aside className="panel" style={{ padding: '20px' }}>请先选择一个地点。后续接入地图交互后，地图点位点击也必须驱动这里的内容更新。</aside>;
  }

  return (
    <aside className="panel" style={{ padding: '20px' }}>
      <p className="muted" style={{ textTransform: 'uppercase', letterSpacing: '0.18em' }}>当前选中地点</p>
      <h3>{location.name}</h3>
      <p className="muted">{location.addressText}</p>
      <p>{location.description}</p>
    </aside>
  );
}
