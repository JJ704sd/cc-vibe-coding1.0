import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';

export function PublicLayout() {
  const [nightMode] = useState(() => {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    return h < 5.5 || h > 18.5;
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: nightMode ? '#0f1629' : '#f5f5f5',
        transition: 'background 2s ease',
        fontFamily: "'Work Sans', sans-serif",
      }}
    >
      {/* Glassmorphism header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: nightMode
            ? 'rgba(15, 22, 41, 0.7)'
            : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          borderBottom: `1px solid ${nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          zIndex: 100,
          transition: 'background 2s ease',
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '20px',
              fontWeight: 400,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: nightMode ? 'rgba(230,230,240,0.9)' : 'rgba(40,40,60,0.9)',
              transition: 'color 2s ease',
            }}
          >
            Trace Scope
          </span>
          <span
            style={{
              fontFamily: "'Work Sans', sans-serif",
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: nightMode ? 'rgba(200,200,220,0.5)' : 'rgba(80,80,100,0.5)',
              transition: 'color 2s ease',
            }}
          >
            双核心空间叙事平台
          </span>
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {[
            { to: '/', label: '画廊' },
            { to: '/map', label: '地图' },
            { to: '/projects', label: '项目' },
            { to: '/admin', label: '后台' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                padding: '8px 18px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 500,
                fontFamily: "'Work Sans', sans-serif",
                backdropFilter: 'blur(12px)',
                background: nightMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${nightMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                color: nightMode ? 'rgba(230,230,240,0.85)' : 'rgba(40,40,60,0.85)',
                textDecoration: 'none',
                transition: 'all 0.25s ease',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <main style={{ paddingTop: '64px' }}>
        <Outlet />
      </main>
    </div>
  );
}
