import { Link } from 'react-router-dom';
import { usePublicData } from '@/services/storage/usePublicData';

export function MapPage() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const nightMode = h < 5.5 || h > 18.5;
  const reader = usePublicData();
  const locations = reader.getPublishedLocations();
  const projects = reader.getPublishedProjects();

  return (
    <div className="page-shell" style={{
      display: 'grid',
      gap: '24px',
      paddingBottom: '64px',
      backgroundColor: nightMode ? '#0f1629' : '#f0f4f8',
      transition: 'background 2s ease',
      fontFamily: "'Work Sans', sans-serif",
    }}>
      <div className="glass animate-in" style={{
        padding: '28px',
        backdropFilter: 'blur(20px)',
        backgroundColor: nightMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
        transition: 'all 0.25s ease',
      }}>
        <h1 className="section-title">地图探索</h1>
        <p className="muted mt-2">
          共 {locations.length} 个地点，{projects.length} 个项目
        </p>
      </div>

      <div className="glass" style={{
        padding: '64px',
        textAlign: 'center',
        backdropFilter: 'blur(20px)',
        backgroundColor: nightMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
        transition: 'all 0.25s ease',
      }}>
        <div className="empty-state-icon" style={{ fontSize: '3rem', marginBottom: '16px' }}>◉</div>
        <h2 className="section-title">地图功能已停用</h2>
        <p className="muted mt-4">您可以在 3D 画廊首页查看所有项目，点击项目卡片了解详细信息和时空轨迹。</p>
        <Link to="/" className="btn-accent mt-4" style={{
          display: 'inline-flex',
          padding: '12px 24px',
          textDecoration: 'none',
          borderRadius: '16px',
          backgroundColor: nightMode ? '#7BA7FF' : '#5B8DEE',
          color: '#fff',
          transition: 'all 0.25s ease',
        }}>
          返回 3D 画廊
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {projects.slice(0, 6).map((project) => (
          <Link key={project.id} to={`/projects/${project.id}`} className="glass" style={{
            padding: '20px',
            textDecoration: 'none',
            borderRadius: '20px',
            transition: 'transform 0.2s ease, all 0.25s ease',
            backdropFilter: 'blur(20px)',
            backgroundColor: nightMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
          }}>
            <h3 style={{ color: 'var(--text)', margin: '0 0 8px 0', fontSize: '1rem' }}>{project.title}</h3>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{project.summary || '暂无描述'}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
