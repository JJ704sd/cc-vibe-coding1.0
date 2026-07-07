import { Link } from 'react-router-dom';
import {
  MapBase3DView,
  MapRelationshipPanel,
  MediaClusterLayer,
  MapProjectionOverlay,
} from '@/components/map';
import { Skeleton, SkeletonStack } from '@/components/common/Skeleton';
import { ErrorState } from '@/components/common/EmptyState';
import { useMapPageController } from '@/features/map/useMapPageController';

export function MapPage() {
  const controller = useMapPageController();
  const { relationshipData } = controller;

  return (
    <div className="map-page-shell">
      {relationshipData.error && (
        <div
          data-testid="map-relationship-error"
          role="status"
          style={{
            position: 'fixed',
            top: 'max(16px, calc(env(safe-area-inset-top) + 8px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            padding: '10px 18px',
            borderRadius: '999px',
            background: 'rgba(127,29,29,0.85)',
            color: 'rgba(255,235,235,0.95)',
            fontFamily: "'Work Sans', sans-serif",
            fontSize: '0.82rem',
            boxShadow: 'var(--shadow-2)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            transition: 'all var(--transition-fast)',
          }}
        >
          地图关系数据加载失败：{relationshipData.error.message}
        </div>
      )}
      <div className="map-page-stage">
        <MapBase3DView
          className="map-page-base"
          onMapReady={controller.setMapInstance}
        />
        <MapProjectionOverlay
          width={controller.projected.width}
          height={controller.projected.height}
          nodes={controller.projected.nodes}
          edges={controller.projected.edges}
          activeProjectId={controller.activeProjectId}
          activeLocationId={controller.activeLocationId}
          onLocationSelect={controller.setActiveLocationId}
        />
        <MediaClusterLayer cluster={controller.activeCluster} anchor={controller.activeAnchor} />
        {relationshipData.loading ? (
          <div
            data-testid="map-relationship-loading"
            style={{
              position: 'absolute',
              top: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 4,
              padding: '14px 22px',
              borderRadius: '18px',
              background: 'var(--glass-bg-strong)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              boxShadow: 'var(--shadow-2)',
              color: 'rgba(234, 240, 255, 0.92)',
              minWidth: '220px',
            }}
          >
            <SkeletonStack count={2} gap={8}>
              <Skeleton variant="text" width="65%" height="0.95em" aria-label="加载标题" />
              <Skeleton variant="text" width="85%" aria-label="加载描述" />
            </SkeletonStack>
            <div style={{ marginTop: '10px', fontSize: '0.78rem' }}>地图关系数据加载中…</div>
          </div>
        ) : null}
      </div>

      {relationshipData.error ? (
        <ErrorState
          testId="map-relationship-panel-error"
          title="地图关系数据不可用"
          message={relationshipData.error.message}
          cta={
            <div className="flex gap-2 justify-center">
              <Link to="/projects" className="btn-accent" style={btnAccent}>
                浏览项目
              </Link>
            </div>
          }
        />
      ) : (
        <MapRelationshipPanel
          title={controller.activeNode?.title ?? controller.activeProject?.title ?? '中国 3D 地图关系图'}
          summary={
            controller.activeNode?.description ??
            controller.activeProject?.summary ??
            '地图作为底层空间基底，地点、轨迹与图片关系以满天星结构映射在其上。'
          }
          projectId={controller.activeProject?.projectId ?? controller.activeCluster?.projectId ?? null}
          mediaSetId={controller.activeCluster?.mediaSetIds?.[0] ?? null}
          mediaSetType={controller.activeCluster?.type ?? null}
        />
      )}
    </div>
  );
}

const btnAccent: React.CSSProperties = {
  display: 'inline-flex',
  padding: '10px 20px',
  textDecoration: 'none',
  borderRadius: '14px',
  transition: 'all var(--transition-fast)',
};