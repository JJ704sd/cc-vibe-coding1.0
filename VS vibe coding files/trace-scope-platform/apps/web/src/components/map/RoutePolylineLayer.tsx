import type { RouteEntity } from '@/types/domain';

export function RoutePolylineLayer({
  routes,
  selectedRouteName,
}: {
  routes: RouteEntity[];
  selectedRouteName?: string | null;
}) {
  return (
    <div className="panel" style={{ padding: '20px' }}>
      <h3>轨迹层状态</h3>
      <p className="muted">该组件现在只保留展示职责。真实地图轨迹运行时逻辑已经迁移到地图运行时服务中。</p>
      <p className="muted">当前轨迹数量：{routes.length}</p>
      <p className="muted">当前高亮轨迹：{selectedRouteName ?? '未选择'}</p>
    </div>
  );
}
