import { Link, useParams } from 'react-router-dom';
import { GalleryViewer } from '@/components/media/GalleryViewer';
import { usePublicMediaSet } from '@/features/media/api/usePublicMediaSet';

export function GalleryViewPage() {
  const { mediaSetId } = useParams();
  const { data, loading, error } = usePublicMediaSet({
    mediaSetId: mediaSetId ?? '',
  });

  if (loading) {
    return (
      <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
        <div className="empty-state-icon">◇</div>
        <h2 className="section-title mt-4">加载中...</h2>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
        <div className="empty-state-icon">◇</div>
        <h2 className="section-title mt-4">暂无可展示的图集媒体组</h2>
        <p className="muted mt-2">请先在后台为已发布项目创建 gallery 类型媒体组，并补充图片。</p>
        <div className="flex gap-2 justify-center mt-4">
          <Link to="/projects" className="btn-accent" style={{
            display: 'inline-flex', padding: '10px 20px', textDecoration: 'none', borderRadius: '14px',
          }}>
            浏览项目
          </Link>
          <Link to="/map" style={{
            display: 'inline-flex', padding: '10px 20px', textDecoration: 'none', borderRadius: '14px',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)',
          }}>
            在地图查看
          </Link>
        </div>
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
      <div className="glass animate-in" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <span className="badge badge-accent">gallery</span>
          <h1 className="section-title" style={{ margin: 0 }}>{data.title}</h1>
          <span style={{ flex: 1 }} />
          <Link to={`/projects/${data.projectId}`} className="btn-accent" style={{
            display: 'inline-flex', padding: '8px 16px', textDecoration: 'none', borderRadius: '12px',
            fontSize: '0.82rem',
          }}>
            ← 返回项目
          </Link>
          <Link to="/map" style={{
            display: 'inline-flex', padding: '8px 16px', textDecoration: 'none', borderRadius: '12px',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)',
            fontSize: '0.82rem',
          }}>
            在地图查看
          </Link>
        </div>
        <p className="muted">{data.description}</p>
      </div>
      <GalleryViewer images={data.images} />
    </div>
  );
}
