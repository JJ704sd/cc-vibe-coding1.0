import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GalleryScene } from '@/components/gallery/GalleryScene';
import { GalleryModal } from '@/components/gallery/GalleryModal';
import { LoadingScreen } from '@/components/gallery/LoadingScreen';
import { usePublicData } from '@/services/storage/usePublicData';
import type { Project } from '@/types/domain';

export function GalleryHome() {
  const [showLoader, setShowLoader] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [nightMode, setNightMode] = useState(() => {
    const h = new Date().getHours();
    return h < 6 || h >= 19;
  });

  const reader = usePublicData();
  const state = reader.getState();
  const publishedProjects = reader.getPublishedProjects();

  // Night mode auto-refresh every minute
  useEffect(() => {
    const iv = setInterval(() => {
      const h = new Date().getHours();
      setNightMode(h < 6 || h >= 19);
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedProject(null);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: nightMode ? '#0f1629' : '#87CEEB',
      }}
    >
      {showLoader && <LoadingScreen onComplete={() => setShowLoader(false)} />}

      {/* 3D Scene */}
      {!showLoader && (
        <GalleryScene
          projects={publishedProjects}
          locations={state.locations}
          mediaSets={state.mediaSets}
          nightMode={nightMode}
          onProjectSelect={handleProjectSelect}
        />
      )}

      {/* Floating UI Overlay */}
      {!showLoader && (
        <>
          {/* Top-left: Brand */}
          <div
            style={{
              position: 'fixed',
              top: '24px',
              left: '28px',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.6rem',
                fontWeight: 700,
                color: nightMode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.85)',
                letterSpacing: '0.04em',
                textShadow: nightMode
                  ? '0 2px 16px rgba(0,0,0,0.5)'
                  : '0 2px 16px rgba(0,0,0,0.15)',
              }}
            >
              Trace Scope
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                color: nightMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.5)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              双核心空间叙事平台
            </div>
          </div>

          {/* Top-right: Nav */}
          <div
            style={{
              position: 'fixed',
              top: '24px',
              right: '28px',
              zIndex: 50,
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            {/* Night mode toggle */}
            <button
              onClick={() => setNightMode((n) => !n)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
                border: `1px solid ${nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
                color: nightMode ? '#7BA7FF' : '#FFEEDD',
                fontSize: '1.1rem',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
              title={nightMode ? '切换日间模式' : '切换夜间模式'}
            >
              {nightMode ? '☀' : '☾'}
            </button>

            {/* Nav links */}
            {[
              { to: '/projects', label: '项目' },
              { to: '/admin', label: '后台' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  padding: '8px 18px',
                  borderRadius: '14px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  backdropFilter: 'blur(12px)',
                  background: nightMode
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.1)',
                  border: `1px solid ${nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
                  color: nightMode ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.85)',
                  textDecoration: 'none',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = nightMode
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(0,0,0,0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = nightMode
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.1)';
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Bottom-right: Info */}
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '28px',
              zIndex: 50,
              fontSize: '0.7rem',
              color: nightMode ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.45)',
              letterSpacing: '0.08em',
              fontFamily: 'monospace',
            }}
          >
            {publishedProjects.length} projects · drag to explore
          </div>

          {/* Bottom-left: Hint */}
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '28px',
              zIndex: 50,
              fontSize: '0.72rem',
              color: nightMode ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.45)',
              letterSpacing: '0.06em',
            }}
          >
            scroll to zoom · drag to rotate · click to view
          </div>
        </>
      )}

      {/* Project Modal */}
      {selectedProject && (
        <GalleryModal
          project={selectedProject}
          locations={state.locations}
          mediaSets={state.mediaSets}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
