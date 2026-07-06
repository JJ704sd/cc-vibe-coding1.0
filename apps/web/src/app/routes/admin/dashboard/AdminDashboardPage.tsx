import { useState, useEffect } from 'react';
import { projectsApi, locationsApi, mediaSetsApi, routesApi } from '@/services/api/adminApi';
import { ToastProvider } from '@/components/common/ToastProvider';
import { useToast } from '@/components/common/useToast';

function AdminDashboardPageInner() {
  const toast = useToast();
  const [stats, setStats] = useState({ projects: 0, locations: 0, mediaSets: 0, routes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      projectsApi.list(),
      locationsApi.list(),
      mediaSetsApi.list(),
      routesApi.list(),
    ])
      .then(([p, l, m, r]) => {
        setStats({ projects: p.length, locations: l.length, mediaSets: m.length, routes: r.length });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '仪表盘加载失败';
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const items = [
    { label: '项目数量', value: stats.projects, icon: '📁' },
    { label: '地点数量', value: stats.locations, icon: '📍' },
    { label: '媒体组数量', value: stats.mediaSets, icon: '🖼' },
    { label: '轨迹数量', value: stats.routes, icon: '🛤' },
  ];

  return (
    <>
      <div className="panel" style={{ padding: '32px' }}>
        <h1 className="section-title">仪表盘</h1>
        <p className="muted mt-2">欢迎回来！以下是平台数据概览。</p>
      </div>

      <div className="stats-grid mt-4">
        {loading ? (
          <div className="stat-card">
            <div className="muted">加载中...</div>
          </div>
        ) : (
          items.map(item => (
            <div key={item.label} className="stat-card">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{item.icon}</div>
              <div className="stat-value">{item.value}</div>
              <div className="stat-label">{item.label}</div>
            </div>
          ))
        )}
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

export function AdminDashboardPage() {
  return (
    <ToastProvider>
      <AdminDashboardPageInner />
    </ToastProvider>
  );
}
