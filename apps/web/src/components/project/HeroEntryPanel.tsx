import { Link } from 'react-router-dom';
import type { Project } from '@/types/domain';

export function HeroEntryPanel({ project }: { project: Project }) {
  return (
    <section className="panel" style={{ padding: '32px', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
          <div>
            <p className="muted" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.8rem' }}>双核心空间叙事平台</p>
            <h1 style={{ margin: '8px 0 0', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, lineHeight: 1.2 }}>{project.title}</h1>
            <p className="muted" style={{ marginTop: '12px', lineHeight: 1.7, maxWidth: '52ch' }}>{project.summary}</p>
          </div>
          <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
            <Link to={`/projects/${project.id}`} className="badge badge-accent" style={{ padding: '12px 24px', fontSize: '0.9rem' }}>查看详情</Link>
            <Link to="/map" className="badge badge-draft" style={{ padding: '12px 24px', fontSize: '0.9rem' }}>探索地图</Link>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '16px', minHeight: '280px' }}>
          <div className="panel" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(135deg, rgba(114, 227, 210, 0.12), rgba(8, 16, 25, 0.95))' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🛤</div>
            <h3 className="section-title-sm" style={{ margin: 0 }}>轨迹层</h3>
            <p className="muted mt-2" style={{ fontSize: '0.875rem', margin: 0 }}>地点点位与有序轨迹连线，后续接入真实地图后自动渲染。</p>
          </div>
          <div className="panel" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', backgroundImage: `linear-gradient(135deg, rgba(255, 155, 103, 0.12), rgba(8, 16, 25, 0.95)), url(${project.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🖼</div>
            <h3 className="section-title-sm" style={{ margin: 0 }}>媒体层</h3>
            <p className="muted mt-2" style={{ fontSize: '0.875rem', margin: 0 }}>360° 旋转序列与图集浏览，后续接入真实图片后自动切换。</p>
          </div>
        </div>
      </div>
    </section>
  );
}
