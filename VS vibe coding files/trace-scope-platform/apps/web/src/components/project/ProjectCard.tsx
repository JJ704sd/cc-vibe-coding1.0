import { Link } from 'react-router-dom';
import type { Project } from '@/types/domain';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.id}`} className="panel panel-interactive" style={{ display: 'block', overflow: 'hidden', padding: 0 }}>
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', borderRadius: '20px 20px 0 0' }}>
        <img
          src={project.coverImage}
          alt={project.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s ease' }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />
      </div>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {project.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="badge badge-draft" style={{ fontSize: '0.7rem' }}>{tag}</span>
          ))}
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 600 }}>{project.title}</h3>
        <p className="muted" style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.summary}</p>
      </div>
    </Link>
  );
}
