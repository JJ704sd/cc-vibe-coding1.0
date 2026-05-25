import { useEffect, useRef } from 'react';
import type { Project, Location, MediaSet } from '@/types/domain';

interface GalleryModalProps {
  project: Project;
  locations: Location[];
  mediaSets: MediaSet[];
  onClose: () => void;
}

export function GalleryModal({ project, locations, mediaSets, onClose }: GalleryModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add('modal-open');
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const projectLocs = locations.filter((l) => l.projectId === project.id);
  const relatedMedia = mediaSets.filter((m) => m.projectId === project.id);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.22)',
        backdropFilter: 'blur(18px) saturate(1.3) brightness(0.85)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.3) brightness(0.85)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Flowing light animation */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(200,210,255,0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(255,240,245,0.08) 0%, transparent 40%)
          `,
          animation: 'glassFlow 12s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <style>{`
        @keyframes glassFlow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(3%, -2%) rotate(1deg); }
          66% { transform: translate(-2%, 3%) rotate(-1deg); }
        }
      `}</style>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '36px',
          right: '40px',
          fontSize: '36px',
          fontWeight: 300,
          color: 'rgba(200,200,220,0.7)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          width: '44px',
          height: '44px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'transform 0.3s ease',
          fontFamily: "'Work Sans', sans-serif",
          zIndex: 60,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1) rotate(0deg)')}
      >
        ×
      </button>

      {/* Image container */}
      <div
        style={{
          maxWidth: '88vw',
          maxHeight: '75vh',
          boxShadow: '0 16px 60px rgba(0,0,0,0.5)',
          opacity: 0,
          transform: 'translateY(24px) scale(0.97)',
          animation: 'modalImgIn 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <style>{`
          @keyframes modalImgIn {
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        {project.coverImage ? (
          <img
            src={project.coverImage}
            alt={project.title}
            style={{
              maxWidth: '100%',
              maxHeight: '75vh',
              objectFit: 'contain',
              display: 'block',
              borderRadius: '2px',
            }}
          />
        ) : (
          <div
            style={{
              width: '600px',
              height: '400px',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)',
              fontFamily: "'Work Sans', sans-serif",
              fontSize: '14px',
            }}
          >
            No cover image
          </div>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          marginTop: '28px',
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '26px',
          fontWeight: 400,
          fontStyle: 'italic',
          letterSpacing: '0.04em',
          color: 'rgba(230,230,240,0.9)',
          opacity: 0,
          transform: 'translateY(12px)',
          animation: 'modalFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards',
          textAlign: 'center',
          maxWidth: '80vw',
        }}
      >
        <style>{`@keyframes modalFadeIn { to { opacity: 1; transform: translateY(0); } }`}</style>
        {project.title}
      </div>

      {/* Meta */}
      {project.tags.length > 0 && (
        <div
          style={{
            marginTop: '8px',
            fontFamily: "'Work Sans', sans-serif",
            fontSize: '13px',
            fontWeight: 300,
            letterSpacing: '0.04em',
            color: 'rgba(200,200,220,0.7)',
            opacity: 0,
            transform: 'translateY(10px)',
            animation: 'modalFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards',
          }}
        >
          {project.tags.join(' · ')}
        </div>
      )}

      {/* Description */}
      {project.summary && (
        <div
          style={{
            marginTop: '16px',
            maxWidth: '85vw',
            textAlign: 'center',
            fontFamily: "'Work Sans', sans-serif",
            fontSize: '15px',
            fontWeight: 300,
            lineHeight: 1.7,
            letterSpacing: '0.02em',
            color: 'rgba(230,230,240,0.9)',
            opacity: 0,
            transform: 'translateY(10px)',
            animation: 'modalFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards',
          }}
        >
          {project.summary}
        </div>
      )}

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 768px) {
          /* Mobile styles handled by flex layout */
        }
      `}</style>
    </div>
  );
}