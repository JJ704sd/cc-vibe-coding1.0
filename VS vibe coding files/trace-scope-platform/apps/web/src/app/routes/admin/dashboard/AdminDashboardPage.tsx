import { locations, mediaSets, projects, routes } from '@/services/api/mock-data';

export function AdminDashboardPage() {
  const stats = [
    { label: '项目数量', value: projects.length, icon: '📁' },
    { label: '地点数量', value: locations.length, icon: '📍' },
    { label: '媒体组数量', value: mediaSets.length, icon: '🖼' },
    { label: '轨迹数量', value: routes.length, icon: '🛤' }
  ];

  return (
    <>
      <div className="panel" style={{ padding: '32px' }}>
        <h1 className="section-title">仪表盘</h1>
        <p className="muted mt-2">欢迎回来！以下是平台数据概览。</p>
      </div>

      <div className="stats-grid mt-4">
        {stats.map((item) => (
          <div key={item.label} className="stat-card">
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{item.icon}</div>
            <div className="stat-value">{item.value}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="panel mt-4" style={{ padding: '24px' }}>
        <h2 className="section-title-sm mb-2">快速操作</h2>
        <div className="flex gap-3" style={{ marginTop: '16px', flexWrap: 'wrap' }}>
          <a href="/admin/projects" className="badge badge-accent" style={{ padding: '12px 20px', fontSize: '0.875rem', cursor: 'pointer' }}>创建项目</a>
          <a href="/admin/locations" className="badge badge-accent" style={{ padding: '12px 20px', fontSize: '0.875rem', cursor: 'pointer' }}>添加地点</a>
          <a href="/admin/media" className="badge badge-accent" style={{ padding: '12px 20px', fontSize: '0.875rem', cursor: 'pointer' }}>管理媒体</a>
          <a href="/admin/routes" className="badge badge-accent" style={{ padding: '12px 20px', fontSize: '0.875rem', cursor: 'pointer' }}>创建轨迹</a>
        </div>
      </div>
    </>
  );
}
