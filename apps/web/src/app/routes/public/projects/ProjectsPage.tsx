import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProjectCard } from '@/components/project/ProjectCard';
import { Skeleton, SkeletonStack } from '@/components/common/Skeleton';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import { usePublicProjects } from '@/features/projects/api/usePublicProjects';
import type { Project } from '@/types/domain';

export function ProjectsPage() {
  const { projects, loading, error } = usePublicProjects();
  const [nightMode] = useState(() => {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return h < 5.5 || h > 18.5;
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: nightMode ? '#0f1629' : '#f0f4f8',
        transition: 'background 2s ease',
        padding: '100px 40px 60px',
      }}
    >
      {/* Page header */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '48px',
            fontWeight: 300,
            fontStyle: 'italic',
            color: nightMode ? 'rgba(230,230,240,0.9)' : 'rgba(40,40,60,0.9)',
            letterSpacing: '0.04em',
            margin: 0,
            transition: 'color 2s ease',
          }}
        >
          Projects
        </h1>
        <p
          style={{
            fontFamily: "'Work Sans', sans-serif",
            fontSize: '14px',
            color: nightMode ? 'rgba(200,200,220,0.5)' : 'rgba(80,80,100,0.5)',
            marginTop: '12px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            transition: 'color 2s ease',
          }}
        >
          {loading
            ? '加载中…'
            : error
            ? '无法加载项目'
            : `${projects.length} projects`}
        </p>
      </div>

      {/* Project grid */}
      {loading ? (
        <div
          data-testid="projects-loading"
          className="glass"
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            padding: '40px 28px',
            textAlign: 'center',
            color: nightMode ? 'rgba(220,230,255,0.7)' : 'rgba(51,65,85,0.7)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            background: 'var(--glass-bg-strong)',
            boxShadow: 'var(--shadow-2)',
          }}
        >
          <SkeletonStack count={3}>
            <Skeleton variant="text" width="60%" aria-label="加载标题" />
            <Skeleton variant="text" width="80%" aria-label="加载摘要" />
            <Skeleton variant="rect" height={6} width="100%" aria-label="加载分隔线" />
          </SkeletonStack>
          <div className="muted" style={{ marginTop: '16px' }}>正在加载项目…</div>
        </div>
      ) : error ? (
        <ErrorState
          testId="projects-error"
          title="无法加载已发布项目"
          message={error.message}
          cta={
            <div className="flex gap-2 justify-center">
              <Link to="/map" className="btn-accent" style={btnAccent}>
                查看地图视图
              </Link>
              <Link to="/" className="btn-ghost" style={btnGhost}>
                返回首页
              </Link>
            </div>
          }
        />
      ) : projects.length === 0 ? (
        <EmptyState
          variant="no-projects"
          testId="projects-empty"
          title="暂无已发布项目"
          description="项目发布后会出现在这里。你也可以前往地图视图查看已发布的内容。"
          cta={
            <div className="flex gap-2 justify-center">
              <Link to="/map" className="btn-accent" style={btnAccent}>
                查看地图视图
              </Link>
              <Link to="/" className="btn-ghost" style={btnGhost}>
                返回首页
              </Link>
            </div>
          }
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '32px',
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project as Pick<Project, 'id' | 'title' | 'summary' | 'coverImage' | 'tags'>}
            />
          ))}
        </div>
      )}
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
