import { Link } from 'react-router-dom';
import { HeroEntryPanel } from '@/components/project/HeroEntryPanel';
import { ProjectCard } from '@/components/project/ProjectCard';
import { Skeleton, SkeletonStack } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { usePublicProjects } from '@/features/projects/api/usePublicProjects';

export function HomePage() {
  const { projects, loading } = usePublicProjects();
  const featuredProject = projects[0];

  if (loading) {
    return (
      <div className="page-shell" style={{ paddingBottom: '64px', paddingTop: '40px' }}>
        <div
          className="glass"
          style={{
            padding: '64px 40px',
            textAlign: 'center',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            background: 'var(--glass-bg-strong)',
            boxShadow: 'var(--shadow-2)',
          }}
        >
          <SkeletonStack count={3} gap={14}>
            <Skeleton variant="text" width="40%" height="1.6em" aria-label="加载标题" />
            <Skeleton variant="text" width="75%" aria-label="加载摘要" />
            <Skeleton variant="rect" height={48} radius={14} aria-label="加载按钮" />
          </SkeletonStack>
          <div className="muted" style={{ marginTop: '18px' }}>正在加载项目…</div>
        </div>
      </div>
    );
  }

  if (!featuredProject) {
    return (
      <div className="page-shell" style={{ paddingBottom: '64px', paddingTop: '40px' }}>
        <EmptyState
          variant="no-projects"
          testId="home-empty"
          title="暂无已发布项目"
          description="请先在后台创建项目并将状态设置为「已发布」。"
          cta={
            <Link
              to="/admin"
              className="btn-accent"
              style={{
                display: 'inline-flex',
                padding: '12px 24px',
                textDecoration: 'none',
                borderRadius: '16px',
                transition: 'all var(--transition-fast)',
              }}
            >
              前往后台
            </Link>
          }
        />
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
