import { Link } from 'react-router-dom';
import type { Project } from '@/types/domain';

export function HeroEntryPanel({ project }: { project: Project }) {
  return (
    <section className="glass animate-in" style={{ padding: '40px', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gap: '32px', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
          <div>
            <p className="muted" style={{
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--accent)',
            }}>
              双核心空间叙事平台
            </p>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              margin: '10px 0 0',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              color: 'var(--text-primary)',
            }}>
              {project.title}
            </h1>
            <p className="muted" style={{ marginTop: '14px', lineHeight: 1.7, maxWidth: '52ch' }}>
              {project.summary}
            </p>
          </div>
          <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
            <Link
              to={`/projects/${project.id}`}
              className="btn-accent"
              style={{ padding: '12px 28px', fontSize: '0.9rem', borderRadius: '16px', textDecoration: 'none' }}
            >
              查看详情
            </Link>
            <Link
              to="/map"
              style={{
                padding: '12px 28px',
                fontSize: '0.9rem',
                borderRadius: '16px',
                textDecoration: 'none',
                background: 'transparent',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--glass-bg-hover)';
                e.currentTarget.style.borderColor = 'var(--glass-border-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              探索地图
            </Link>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '16px', minHeight: '280px' }}>
          <div className="glass" style={{
            flex: 1,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            background: 'linear-gradient(135deg, rgba(91, 141, 238, 0.2), rgba(255, 255, 255, 0.05))',
            borderColor: 'rgba(91, 141, 238, 0.25)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--accent)' }}>◉</div>
            <h3 className="section-title-sm" style={{ margin: 0, fontSize: '1.1rem' }}>轨迹层</h3>
            <p className="muted mt-2" style={{ fontSize: '0.85rem', margin: 0 }}>
              地点点位与有序轨迹连线，后续接入真实地图后自动渲染。
            </p>
          </div>
          <div className="glass" style={{
            flex: 1,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            background: 'linear-gradient(135deg, rgba(232, 168, 124, 0.2), rgba(255, 255, 255, 0.05))',
            borderColor: 'rgba(232, 168, 124, 0.25)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--accent-warm)' }}>◇</div>
            <h3 className="section-title-sm" style={{ margin: 0, fontSize: '1.1rem' }}>媒体层</h3>
            <p className="muted mt-2" style={{ fontSize: '0.85rem', margin: 0 }}>
              360° 旋转序列与图集浏览，后续接入真实图片后自动切换。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
