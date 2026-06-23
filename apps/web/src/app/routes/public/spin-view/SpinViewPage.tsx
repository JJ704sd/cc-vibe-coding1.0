import { Link, useParams } from 'react-router-dom';
import { SpinViewer } from '@/components/media/SpinViewer';
import { Skeleton, SkeletonStack } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import { usePublicMediaSet } from '@/features/media/api/usePublicMediaSet';

export function SpinViewPage() {
  const { mediaSetId } = useParams();
  const { data, loading, error } = usePublicMediaSet({
    mediaSetId: mediaSetId ?? '',
  });

  if (loading) {
    return (
      <div
        className="glass"
        data-testid="spin-view-loading"
        style={{
          padding: '64px 40px',
          margin: '40px auto',
          maxWidth: '720px',
          textAlign: 'center',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          background: 'var(--glass-bg-strong)',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        <SkeletonStack count={3} gap={14}>
          <Skeleton variant="text" width="45%" height="1.6em" aria-label="加载标题" />
          <Skeleton variant="text" width="80%" aria-label="加载描述" />
          <Skeleton variant="rect" height={360} radius={20} aria-label="加载 360 视图" />
        </SkeletonStack>
        <div className="muted" style={{ marginTop: '18px' }}>正在加载 360 视图…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px 24px' }}>
        <ErrorState
          testId="spin-view-error"
          title="暂无可展示的 360 媒体组"
          message={error?.message ?? '请先在后台为已发布项目创建 spin360 类型媒体组，并补充图片帧。'}
          cta={
            <div className="flex gap-2 justify-center">
              <Link to="/projects" className="btn-accent" style={btnAccent}>
                浏览项目
              </Link>
              <Link to="/map" style={btnGhost}>
                在地图查看
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          marginBottom: '12px',
          fontFamily: "'Work Sans', sans-serif",
        }}
      >
        <Link to="/projects" style={{ color: 'inherit', textDecoration: 'none' }}>项目</Link>
        <span aria-hidden>›</span>
        <Link to={`/projects/${data.projectId}`} style={{ color: 'inherit', textDecoration: 'none' }}>所属项目</Link>
        <span aria-hidden>›</span>
        <span style={{ color: 'var(--text)' }}>{data.title}</span>
      </nav>
      <div
        className="glass animate-in"
        style={{
          padding: '28px',
          marginBottom: '24px',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <span className="badge badge-warm">spin360</span>
          <h1 className="section-title" style={{ margin: 0 }}>{data.title}</h1>
          <span style={{ flex: 1 }} />
          <Link to={`/projects/${data.projectId}`} className="btn-accent" style={{
            display: 'inline-flex', padding: '8px 16px', textDecoration: 'none', borderRadius: '12px',
            fontSize: '0.82rem', transition: 'all var(--transition-fast)',
          }}>
            ← 返回项目
          </Link>
          <Link to="/map" style={{
            display: 'inline-flex', padding: '8px 16px', textDecoration: 'none', borderRadius: '12px',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)',
            fontSize: '0.82rem', transition: 'all var(--transition-fast)',
          }}>
            在地图查看
          </Link>
        </div>
        <p className="muted">{data.description}</p>
      </div>
      <SpinViewer images={data.images} />
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
const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  padding: '10px 20px',
  textDecoration: 'none',
  borderRadius: '14px',
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  color: 'var(--text-secondary)',
  transition: 'all var(--transition-fast)',
};
