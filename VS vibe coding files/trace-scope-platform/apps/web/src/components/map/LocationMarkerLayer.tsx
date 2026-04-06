import type { Location } from '@/types/domain';

export function LocationMarkerLayer({
  locations,
  selectedLocationName,
}: {
  locations: Location[];
  selectedLocationName?: string | null;
}) {
  return (
    <div className="panel" style={{ padding: '20px' }}>
      <h3>点位层状态</h3>
      <p className="muted">该组件现在只保留展示职责。真实地图点位运行时逻辑已经迁移到地图运行时服务中。</p>
      <p className="muted">当前点位数量：{locations.length}</p>
      <p className="muted">当前选中地点：{selectedLocationName ?? '未选择'}</p>
    </div>
  );
}
