import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GalleryScene } from '@/components/gallery/GalleryScene';
import { GalleryMapBase } from '@/components/gallery/GalleryMapBase';
import { LoadingScreen } from '@/components/gallery/LoadingScreen';
import { usePublicData } from '@/services/storage/usePublicData';
import type { MediaImage } from '@/types/domain';

export function GalleryHome() {
  const [showLoader, setShowLoader] = useState(true);
  const [nightMode, setNightMode] = useState(() => {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return h < 5.5 || h > 18.5;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const reader = usePublicData();
  const allImages = reader.getAllPublishedMediaImages();

  const filteredImages = allImages.filter((img) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      img.caption?.toLowerCase().includes(query) ||
      img.altText?.toLowerCase().includes(query)
    );
  });

  // Night mode auto-refresh every minute
  useEffect(() => {
    const iv = setInterval(() => {
      const h = new Date().getHours() + new Date().getMinutes() / 60;
      setNightMode(h < 5.5 || h > 18.5);
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleImageSelect = useCallback((img: MediaImage) => {
    // TODO: open image viewer modal (future task)
  }, []);

  const handleLoaderComplete = useCallback(() => {
    setShowLoader(false);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: nightMode ? '#1a2245' : '#87CEEB',
        transition: 'background 2s ease',
      }}
    >
      {/* Layer 0: Static map base */}
      <GalleryMapBase />

      {showLoader && <LoadingScreen nightMode={nightMode} onComplete={handleLoaderComplete} />}

      {/* Layer 1: 3D Sky + cards */}
      {!showLoader && (
        <GalleryScene
          mediaImages={filteredImages}
          nightMode={nightMode}
          onImageSelect={handleImageSelect}
        />
      )}

      {/* Floating UI Overlay */}
      {!showLoader && (
        <>
          {/* Top-left: Brand — Cormorant Garamond */}
          <div
            style={{
              position: 'fixed',
              top: '40px',
              left: '40px',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '22px',
                fontWeight: 400,
                color: nightMode ? 'rgba(200,200,220,0.6)' : 'rgba(60,60,80,0.6)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                transition: 'color 2s ease',
              }}
            >
              Trace Scope
            </div>
          </div>

          {/* Top-right: Parisienne site name */}
          <div
            style={{
              position: 'fixed',
              top: '24px',
              right: '40px',
              zIndex: 10,
              fontFamily: "'Parisienne', cursive",
              fontSize: '28px',
              fontWeight: 400,
              fontStyle: 'normal',
              letterSpacing: '0.05em',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.9) 20%, rgba(200,220,255,0.6) 40%, rgba(255,255,255,0.95) 55%, rgba(220,200,255,0.5) 70%, rgba(255,255,255,0.85) 100%)',
              backgroundSize: '300% 300%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'glassText 8s ease-in-out infinite',
            }}
          >
            <style>{`
              @keyframes glassText {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
              }
            `}</style>
            Trace Scope
          </div>

          {/* Top-right: Nav bar */}
          <div
            style={{
              position: 'fixed',
              top: '28px',
              right: '28px',
              zIndex: 50,
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            {/* Search toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                background: showSearch ? 'rgba(91, 141, 238, 0.3)' : nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
                border: `1px solid ${showSearch ? 'rgba(91, 141, 238, 0.5)' : nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
                color: nightMode ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.85)',
                fontSize: '1rem',
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
            >
              ⌕
            </button>

            {/* Search input */}
            {showSearch && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索项目..."
                autoFocus
                style={{
                  width: '180px',
                  padding: '8px 14px',
                  borderRadius: '14px',
                  background: nightMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)',
                  border: `1px solid ${nightMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                  color: nightMode ? 'white' : 'black',
                  fontSize: '0.85rem',
                  outline: 'none',
                  backdropFilter: 'blur(12px)',
                  fontFamily: "'Work Sans', sans-serif",
                }}
              />
            )}

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
              { to: '/map', label: '地图' },
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
                  fontFamily: "'Work Sans', sans-serif",
                  backdropFilter: 'blur(12px)',
                  background: nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
                  border: `1px solid ${nightMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
                  color: 'rgba(255,255,255,0.85)',
                  textDecoration: 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Bottom-right: Project count */}
          <div
            style={{
              position: 'fixed',
              bottom: '16px',
              right: '20px',
              zIndex: 10,
              fontSize: '11px',
              color: nightMode ? 'rgba(200,200,220,0.25)' : 'rgba(60,60,80,0.35)',
              letterSpacing: '0.04em',
              fontFamily: "'Work Sans', sans-serif",
              transition: 'color 2s ease',
              pointerEvents: 'none',
            }}
          >
            {searchQuery ? `${filteredImages.length} / ${allImages.length}` : allImages.length} images · drag to explore
          </div>

          {/* Bottom-left: Hint */}
          <div
            style={{
              position: 'fixed',
              bottom: '16px',
              left: '40px',
              zIndex: 10,
              fontSize: '11px',
              color: nightMode ? 'rgba(200,200,220,0.35)' : 'rgba(60,60,80,0.4)',
              letterSpacing: '0.06em',
              fontFamily: "'Work Sans', sans-serif",
              transition: 'color 2s ease',
              pointerEvents: 'none',
            }}
          >
            scroll to zoom · drag to rotate · click to view
          </div>

          {/* Copyright */}
          <div
            style={{
              position: 'fixed',
              bottom: '16px',
              right: '120px',
              zIndex: 10,
              fontSize: '11px',
              color: nightMode ? 'rgba(200,200,220,0.25)' : 'rgba(60,60,80,0.3)',
              letterSpacing: '0.04em',
              fontFamily: "'Work Sans', sans-serif",
              transition: 'color 2s ease',
              pointerEvents: 'none',
            }}
          >
            © 2026 Trace Scope
          </div>
        </>
      )}
    </div>
  );
}
      