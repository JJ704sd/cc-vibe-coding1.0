import { useState } from 'react';
import { Link } from 'react-router-dom';

export function ProjectCard({ project }: { project: { id: string; title: string; summary: string; coverImage: string | null; tags: string[] } }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={`/projects/${project.id}`}
      className="glass glass-interactive"
      data-testid="project-card"
      data-hovered={hovered ? 'true' : 'false'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'block',
        overflow: 'hidden',
        padding: 0,
        textDecoration: 'none',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        background: 'var(--glass-bg-strong)',
        transform: hovered ? 'translateY(-2px) scale(1.01)' : 'translateY(0) scale(1)',
        boxShadow: hovered ? 'var(--shadow-3)' : 'var(--shadow-2)',
        transition: 'transform var(--transition-med), box-shadow var(--transition-med), background-color var(--transition-fast), border-color var(--transition-fast)',
      }}
    >
      {hovered ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'linear-gradient(135deg, var(--glass-border) 0%, transparent 35%, transparent 65%, var(--glass-border) 100%)',
            opacity: 0.35,
            transition: 'opacity var(--transition-fast)',
          }}
        />
      ) : null}
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', borderRadius: '24px 24px 0 0', position: 'relative' }}>
        {project.coverImage ? (
          <img
            src={project.coverImage}
            alt={project.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform var(--transition-med)',
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
            }}
          />
        ) : (
          <div
            data-testid="project-card-fallback"
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--glass-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: 'var(--text-secondary)', fontSize: '2rem' }}>◈</span>
          </div>
        )}
      </div>
      <div style={{ padding: '22px 24px', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {project.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="badge badge-draft" style={{ fontSize: '0.7rem' }}>
              {tag}
            </span>
          ))}
        </div>
        <h3 style={{
          margin: '0 0 10px',
          fontSize: '1.15rem',
          fontWeight: 600,
          fontFamily: "'Playfair Display', serif",
          color: 'var(--text-primary)',
        }}>
          {project.title}
        </h3>
        <p className="muted" style={{
          fontSize: '0.875rem',
          lineHeight: 1.6,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {project.summary}
        </p>
      </div>
    </Link>
  );
}
