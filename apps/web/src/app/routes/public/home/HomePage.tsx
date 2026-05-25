import { HeroEntryPanel } from '@/components/project/HeroEntryPanel';
import { ProjectCard } from '@/components/project/ProjectCard';
import { usePublicProjects } from '@/features/projects/api/usePublicProjects';

export function HomePage() {
  const { projects, loading } = usePublicProjects();
  const featuredProject = projects[0];

  if (loading) {
    return (
      <div className="page-shell" style={{ paddingBottom: '64px' }}>
        <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
          <div className="empty-state-icon">◈</div>
          <h2 className="section-title mt-4">加载中...</h2>
        </div>
      </div>
    );
  }

  if (!featuredProject) {
    return (
      <div className="page-shell" style={{ paddingBottom: '64px' }}>
        <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
          <div className="empty-state-icon">◈</div>
          <h2 className="section-title mt-4">暂无已发布项目</h2>
          <p className="muted mt-2">请先在后台创建项目并将状态设置为「已发布」</p>
          <a href="/admin" className="btn-accent mt-4" style={{ display: 'inline-flex', padding: '12px 24px', textDecoration: 'none', borderRadius: '16px' }}>
            前往后台
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ display: 'grid', gap: '32px', paddingBottom: '64px' }}>
      <HeroEntryPanel project={featuredProject} />
      <section>
        <div className="glass" style={{ padding: '24px 28px', marginBottom: '20px' }}>
          <div className="flex justify-between items-center">
            <h2 className="section-title" style={{ fontSize: '1.5rem' }}>已发布项目</h2>
            <span className="badge badge-accent">{projects.length} 个项目</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {projects.map((project) => (<ProjectCard key={project.id} project={project} />))}
        </div>
      </section>
    </div>
  );
}
