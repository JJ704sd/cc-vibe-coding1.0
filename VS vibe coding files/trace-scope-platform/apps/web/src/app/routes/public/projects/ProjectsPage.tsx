import { ProjectCard } from '@/components/project/ProjectCard';
import { usePublicData } from '@/services/storage/usePublicData';

export function ProjectsPage() {
  const reader = usePublicData();
  const projects = reader.getPublishedProjects();

  return (
    <div className="page-shell" style={{ paddingBottom: '64px' }}>
      <div className="glass animate-in" style={{ padding: '32px', marginBottom: '24px' }}>
        <h1 className="section-title">项目列表</h1>
        <p className="muted mt-2">共 {projects.length} 个已发布项目</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {projects.map((project) => (<ProjectCard key={project.id} project={project} />))}
      </div>
      {projects.length === 0 && (
        <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
          <div className="empty-state-icon">◇</div>
          <p className="muted mt-4">暂无已发布项目</p>
          <p className="muted" style={{ fontSize: '0.875rem' }}>请在后台创建项目并设置为「已发布」</p>
        </div>
      )}
    </div>
  );
}
