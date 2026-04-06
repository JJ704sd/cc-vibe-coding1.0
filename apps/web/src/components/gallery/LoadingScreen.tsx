import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(onComplete, 800);
    }, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: 'linear-gradient(135deg, #E85A4F 0%, #E8A87C 50%, #F5C6A0 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '32px',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.8s ease',
        pointerEvents: fading ? 'none' : 'all',
      }}
    >
      {/* Spinning dice icon */}
      <div
        style={{
          width: '80px',
          height: '80px',
          background: 'rgba(255,255,255,0.25)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          color: 'white',
          animation: 'diceSpin 1.2s linear infinite',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.3)',
        }}
      >
        ◈
      </div>

      {/* Brand name */}
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.8rem',
          fontWeight: 700,
          color: 'white',
          letterSpacing: '0.08em',
          textShadow: '0 2px 16px rgba(0,0,0,0.15)',
        }}
      >
        Trace Scope
      </div>

      {/* Loading bar */}
      <div
        style={{
          width: '200px',
          height: '3px',
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'white',
            borderRadius: '2px',
            animation: 'loadingBar 2s ease-out forwards',
          }}
        />
      </div>

      <style>{`
        @keyframes diceSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes loadingBar {
          0% { width: 0%; }
          60% { width: 80%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
