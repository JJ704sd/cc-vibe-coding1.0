import { useEffect, useRef } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const flash = flashRef.current;
    if (!flash) return;

    // Phase 1: flash to white (0.4s)
    flash.style.transition = 'opacity 0.4s ease-in';
    flash.style.opacity = '1';

    const timer1 = setTimeout(() => {
      // Phase 2: hold white briefly, then fade out (0.6s)
      const parent = flash.parentElement;
      if (parent) {
        parent.style.transition = 'opacity 0.6s ease-out';
        parent.style.opacity = '0';
      }
      setTimeout(() => {
        onComplete();
      }, 600);
    }, 400);

    return () => clearTimeout(timer1);
  }, [onComplete]);

  // Compute time-of-day background color
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const isNight = h < 5.5 || h > 18.5;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: isNight
          ? 'linear-gradient(to bottom, #a3e3f9, #22295b)'
          : 'linear-gradient(to bottom, #ffd9da, #f85a4e)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* Spinning dice */}
      <div
        style={{
          width: '111px',
          height: '111px',
          borderRadius: '24%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(200,220,255,0.7))',
          boxShadow: '0 0 30px rgba(255,255,255,0.5), 0 0 60px rgba(255,255,255,0.2), inset 0 0 20px rgba(255,255,255,0.3)',
          animation: 'diceSpin 2.5s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes diceSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(0.92); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `}</style>

      {/* Flash overlay */}
      <div
        ref={flashRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#ffffff',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
    </div>
  );
}
