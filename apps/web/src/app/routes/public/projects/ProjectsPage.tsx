import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePublicData } from '@/services/storage/usePublicData';
import type { Project } from '@/types/domain';

export function ProjectsPage() {
  const reader = usePublicData();
  const projects = reader.getPublishedProjects();
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
          {projects.length} projects
        </p>
      </div>

      {/* Project grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '32px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} nightMode={nightMode} />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, nightMode }: { project: Project; nightMode: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/projects/${project.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        textDecoration: 'none',
        borderRadius: '16px',
        overflow: 'hidden',
        background: nightMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
        boxShadow: hovered
          ? (nightMode ? '0 20px 60px rgba(0,0,0,0.5)' : '0 16px 48px rgba(0,0,0,0.12)')
          : (nightMode ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.06)'),
        transform: hovered ? 'translateY(-4px) scale(1.01)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Cover image */}
      <div style={{ aspectRatio: '16/10', overflow: 'hidden', position: 'relative' }}>
        {project.coverImage ? (
          <img
            src={project.coverImage}
            alt={project.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: hovered ? 1 : 0.85,
              transition: 'opacity 0.4s ease',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: nightMode ? '#1a2240' : '#ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: nightMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
              fontSize: '14px',
            }}
          >
            No image
          </div>
        )}
        {/* Accent line on hover */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: hovered
              ? (nightMode ? 'linear-gradient(90deg, #7BA7FF, #a78bfa)' : 'linear-gradient(90deg, #f85a4e, #ff7b54)')
              : 'transparent',
            transition: 'all 0.4s ease',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '24px',
            fontWeight: 400,
            fontStyle: 'italic',
            color: nightMode ? 'rgba(230,230,240,0.95)' : 'rgba(40,40,60,0.95)',
            margin: '0 0 8px',
            transition: 'color 0.3s ease',
          }}
        >
          {project.title}
        </h2>
        {project.summary && (
          <p
            style={{
              fontFamily: "'Work Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 300,
              lineHeight: 1.6,
              color: nightMode ? 'rgba(200,200,220,0.65)' : 'rgba(80,80,100,0.7)',
              margin: '0 0 16px',
              transition: 'color 0.3s ease',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {project.summary}
          </p>
        )}
        {project.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontFamily: "'Work Sans', sans-serif",
                  fontWeight: 500,
                  background: nightMode ? 'rgba(123,167,255,0.15)' : 'rgba(248,90,78,0.1)',
                  color: nightMode ? '#7BA7FF' : '#f85a4e',
                  border: `1px solid ${nightMode ? 'rgba(123,167,255,0.25)' : 'rgba(248,90,78,0.2)'}`,
                  letterSpacing: '0.04em',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
