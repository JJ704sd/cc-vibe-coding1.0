import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LocationDetailPanel } from '@/components/project/LocationDetailPanel';
import { MediaSetCard } from '@/components/project/MediaSetCard';
import { Skeleton, SkeletonStack } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import { usePublicProjectDetail } from '@/features/projects/api/usePublicProjectDetail';

export function ProjectDetailPage() {
  const [nightMode] = useState(() => {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return h < 5.5 || h > 18.5;
  });
  const { projectId } = useParams();
  const { data, loading, error } = usePublicProjectDetail({
    projectIdOrSlug: projectId ?? '',
  });

  const project = data?.project;
  const locations = data?.locations ?? [];
  const mediaSets = data?.mediaSets ?? [];
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id ?? null);
  const selectedLocation = locations.find((location) => location.id === selectedLocationId) ?? null;
  const breadcrumbTitle = useMemo(() => project?.title ?? '项目', [project?.title]);

  if (loading) {
    return (
      <div
        className="glass"
        data-testid="project-detail-loading"
        style={{
          padding: '48px 40px',
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
          <Skeleton variant="text" width="55%" height="1.8em" aria-label="加载标题" />
          <Skeleton variant="text" width="85%" aria-label="加载摘要" />
          <Skeleton variant="rect" height={120} radius={14} aria-label="加载内容" />
        </SkeletonStack>
        <div className="muted" style={{ marginTop: '18px' }}>正在加载项目详情…</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ padding: '40px 24px' }}>
        <ErrorState
          testId="project-detail-error"
          title="未找到可展示项目"
          message={error?.message ?? '当前没有已发布项目可供前台展示。'}
          cta={
            <div className="flex gap-2 justify-center">
              <Link to="/" className="btn-accent" style={btnAccent}>
                返回首页
              </Link>
              <Link to="/projects" style={btnGhost}>
                浏览项目
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="page-shell" style={{
      display: 'grid',
      gap: '24px',
      paddingBottom: '64px',
      background: nightMode ? '#0f1629' : '#f0f4f8',
      transition: 'background 2s ease',
      fontFamily: "'Work Sans', sans-serif",
    }}>
      <nav
        aria-label="Breadcrumb"
        data-testid="project-back-nav"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          fontFamily: "'Work Sans', sans-serif",
        }}
      >
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>首页</Link>
        <span aria-hidden>›</span>
        <Link to="/projects" style={{ color: 'inherit', textDecoration: 'none' }}>项目列表</Link>
        <span aria-hidden>›</span>
        <span style={{ color: 'var(--text)' }}>{breadcrumbTitle}</span>
        <span style={{ marginLeft: 'auto' }}>
          <Link to="/map" style={{ color: 'var(--accent)', textDecoration: 'none' }}>在地图查看 →</Link>
        </span>
      </nav>
      <section className="glass animate-in" style={{
        padding: '32px',
        background: nightMode ? 'rgba(15, 22, 41, 0.7)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--shadow-2)',
        transition: 'all var(--transition-fast)',
      }}>
        <p className="muted" style={{
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          fontSize: '0.7rem',
        }}>
          项目详情
        </p>
        <h1 className="section-title" style={{ marginTop: '8px', fontFamily: "'Cormorant Garamond', serif" }}>{project.title}</h1>
        <p className="muted mt-4" style={{ lineHeight: 1.7, fontFamily: "'Work Sans', sans-serif" }}>{project.description}</p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '24px' }}>
        <LocationDetailPanel location={selectedLocation} />
        {locations.length > 0 && (
          <div className="glass" style={{
            padding: '20px',
            background: nightMode ? 'rgba(15, 22, 41, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            boxShadow: 'var(--shadow-2)',
            transition: 'all var(--transition-fast)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: nightMode ? '#E8ECEF' : 'var(--text)', fontFamily: "'Cormorant Garamond', serif" }}>时空轨迹</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {locations.map((location, index) => (
                <div key={location.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: location.id === selectedLocationId ? (nightMode ? '#7BA7FF' : '#f85a4e') : (nightMode ? 'rgba(123, 167, 255, 0.3)' : 'var(--glass-border)'),
                    color: location.id === selectedLocationId ? 'white' : (nightMode ? '#B8C5D6' : 'var(--text-secondary)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    flexShrink: 0,
                    transition: 'all var(--transition-fast)',
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: nightMode ? '#E8ECEF' : 'var(--text)', fontSize: '0.9rem', fontFamily: "'Work Sans', sans-serif" }}>{location.name}</div>
                    <div className="muted" style={{ fontSize: '0.75rem', fontFamily: "'Work Sans', sans-serif" }}>
                      {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <section>
        <h2 className="section-title" style={{ fontSize: '1.4rem', marginBottom: '16px', fontFamily: "'Cormorant Garamond', serif" }}>地点列表</h2>
        {locations.length === 0 ? (
          <EmptyState
            variant="no-routes"
            testId="project-detail-locations-empty"
            title="该项目暂无地点"
            description="地点会在管理员录入项目后展示在这里。"
          />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {locations.map((location) => (
              <button
                key={location.id}
                className="glass"
                onClick={() => setSelectedLocationId(location.id)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '16px',
                  border: location.id === selectedLocationId
                    ? '1px solid var(--accent)'
                    : '1px solid var(--glass-border)',
                  background: location.id === selectedLocationId
                    ? 'rgba(91, 141, 238, 0.15)'
                    : 'var(--glass-bg)',
                  color: location.id === selectedLocationId
                    ? 'var(--accent)'
                    : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {location.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title" style={{ fontSize: '1.4rem', marginBottom: '16px', fontFamily: "'Cormorant Garamond', serif" }}>媒体组列表</h2>
        {mediaSets.length === 0 ? (
          <EmptyState
            variant="no-media"
            testId="project-detail-media-empty"
            title="该项目暂无媒体组"
            description="请管理员为该项目补充 spin360 / gallery 媒体组。"
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {mediaSets.map((mediaSet) => (
              <MediaSetCard key={mediaSet.id} mediaSet={mediaSet} />
            ))}
          </div>
        )}
      </section>
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
