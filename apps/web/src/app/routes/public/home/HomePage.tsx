import { HeroEntryPanel } from '@/components/project/HeroEntryPanel';
import { ProjectCard } from '@/components/project/ProjectCard';
import { usePublicData } from '@/services/storage/usePublicData';

export function HomePage() {
  const reader = usePublicData();
  const publishedProjects = reader.getPublishedProjects();
  const featuredProject = publishedProjects[0];

  if (!featuredProject) {
    return (
      <div className="page-shell" style={{ paddingBottom: '48px' }}>
        <div className="panel" style={{ padding: '48px', textAlign: 'center' }}>
          <div className="empty-state-icon" style={{ fontSize: '3rem' }}>🗺️</div>
          <h1 className="section-title mt-4">暂无已发布项目</h1>
          <p className="muted mt-2">请先在后台创建项目并将状态设置为「已发布」</p>
          <a href="/admin" className="badge badge-accent mt-4" style={{ display: 'inline-flex', padding: '12px 24px' }}>前往后台</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ display: 'grid', gap: '32px', paddingBottom: '48px' }}>
      <HeroEntryPanel project={featuredProject} />
      <section>
        <div className="panel" style={{ padding: '24px 28px' }}>
          <div className="flex justify-between items-center">
            <h2 className="section-title">已发布项目</h2>
            <span className="badge badge-accent">{publishedProjects.length} 个项目</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {publishedProjects.map((project) => (<ProjectCard key={project.id} project={project} />))}
        </div>
      </section>
    </div>
  );
}
