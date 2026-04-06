import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Project, Location, MediaSet } from '@/types/domain';

interface GalleryModalProps {
  project: Project | null;
  locations: Location[];
  mediaSets: MediaSet[];
  onClose: () => void;
}

export function GalleryModal({ project, locations, mediaSets, onClose }: GalleryModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!project) return null;

  const projectLocations = locations.filter((l) => l.projectId === project.id);
  const projectMediaSets = mediaSets.filter((m) => m.projectId === project.id);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'modalFadeIn 0.35s ease',
      }}
    >
      <div
        className="glass"
        style={{
          width: 'min(900px, 100%)',
          maxHeight: '85vh',
          overflow: 'auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderRadius: '28px',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 10,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: 'white',
            fontSize: '1.2rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          }}
        >
          ✕
        </button>

        {/* Left: Cover image */}
        <div
          style={{
            borderRadius: '28px 0 0 28px',
            overflow: 'hidden',
            minHeight: '400px',
          }}
        >
          <img
            src={project.coverImage}
            alt={project.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>

        {/* Right: Info */}
        <div
          style={{
            padding: '36px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflow: 'auto',
          }}
        >
          {/* Tags */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {project.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: 'rgba(91, 141, 238, 0.2)',
                  color: '#7BA7FF',
                  border: '1px solid rgba(91, 141, 238, 0.3)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.8rem',
              fontWeight: 700,
              color: '#1a1a2e',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {project.title}
          </h2>

          {/* Summary */}
          <p
            style={{
              color: '#4a4a6a',
              lineHeight: 1.7,
              fontSize: '0.95rem',
              margin: 0,
            }}
          >
            {project.summary}
          </p>

          {/* Description */}
          {project.description && (
            <p
              style={{
                color: '#4a4a6a',
                lineHeight: 1.6,
                fontSize: '0.875rem',
                margin: 0,
                opacity: 0.8,
              }}
            >
              {project.description}
            </p>
          )}

          <div style={{ height: '1px', background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />

          {/* Locations */}
          {projectLocations.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: '#8888aa',
                  fontWeight: 600,
                  marginBottom: '10px',
                }}
              >
                地点 ({projectLocations.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {projectLocations.map((loc) => (
                  <div
                    key={loc.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: '#1a1a2e',
                        marginBottom: '2px',
                      }}
                    >
                      {loc.name}
                    </div>
                    {loc.addressText && (
                      <div style={{ fontSize: '0.8rem', color: '#8888aa' }}>
                        {loc.addressText}
                      </div>
                    )}
                    {loc.latitude && loc.longitude && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#aaaacc',
                          marginTop: '2px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media sets */}
          {projectMediaSets.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: '#8888aa',
                  fontWeight: 600,
                  marginBottom: '10px',
                }}
              >
                媒体 ({projectMediaSets.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {projectMediaSets.map((ms) => (
                  <Link
                    key={ms.id}
                    to={ms.type === 'spin360' ? `/spin/${ms.id}` : `/gallery/${ms.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '14px',
                      background: 'rgba(91, 141, 238, 0.1)',
                      border: '1px solid rgba(91, 141, 238, 0.2)',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(91, 141, 238, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(91, 141, 238, 0.1)';
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background:
                          ms.type === 'spin360'
                            ? 'rgba(232, 168, 124, 0.3)'
                            : 'rgba(91, 141, 238, 0.3)',
                        color: ms.type === 'spin360' ? '#E8A87C' : '#5B8DEE',
                      }}
                    >
                      {ms.type}
                    </span>
                    <span style={{ color: '#1a1a2e', fontWeight: 500, fontSize: '0.9rem' }}>
                      {ms.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
