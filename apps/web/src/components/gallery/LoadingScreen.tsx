import { useEffect, useRef } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Graceful fade-out after mount animation completes
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (el) {
        el.style.transition = 'opacity 0.8s ease';
        el.style.opacity = '0';
        setTimeout(() => onComplete(), 820);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const isNight = h < 5.5 || h > 18.5;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100vw',
        height: '100vh',
        background: isNight
          ? 'linear-gradient(to bottom, #1a1f35 0%, #22295b 100%)'
          : 'linear-gradient(to bottom, #87CEEB 0%, #FFD9DA 55%, #f85a4e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '32px',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* ── Analog clock ── */}
      <div
        style={{
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 38%, rgba(255,255,255,0.96) 0%, rgba(240,248,255,0.85) 40%, rgba(210,225,245,0.7) 100%)',
          boxShadow:
            '0 0 0 1.5px rgba(255,255,255,0.6), 0 0 0 3px rgba(180,200,230,0.25), 0 6px 24px rgba(120,80,60,0.14), inset 0 1.5px 4px rgba(255,255,255,0.9), inset 0 -1.5px 4px rgba(150,180,210,0.3)',
          position: 'relative',
          animation: 'lsFadeIn 0.5s ease both',
        }}
      >
        {/* Inner ring */}
        <div style={{
          position: 'absolute', inset: '5px',
          borderRadius: '50%', border: '1px solid rgba(160,180,210,0.3)',
        }} />

        {/* Hour markers */}
        {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: i % 3 === 0 ? '1.5px' : '1px',
            height: i % 3 === 0 ? '5px' : '3.5px',
            background: i % 3 === 0 ? 'rgba(120,100,140,0.55)' : 'rgba(120,100,140,0.25)',
            top: '7px',
            left: '50%',
            transformOrigin: `50% 37px`,
            transform: `translateX(-50%) rotate(${deg}deg)`,
            borderRadius: '1px',
          }} />
        ))}

        {/* Hour hand */}
        <div id="ls-hour" style={{
          position: 'absolute', bottom: '50%', left: '50%',
          width: '2.5px', height: '22px',
          marginLeft: '-1.25px',
          background: 'linear-gradient(to top, rgba(100,80,120,0.75), rgba(140,110,160,0.55))',
          transformOrigin: '50% 100%', borderRadius: '2px',
          animation: 'none',
        }} />
        {/* Minute hand */}
        <div id="ls-minute" style={{
          position: 'absolute', bottom: '50%', left: '50%',
          width: '1.5px', height: '31px',
          marginLeft: '-0.75px',
          background: 'linear-gradient(to top, rgba(100,80,120,0.65), rgba(140,110,160,0.45))',
          transformOrigin: '50% 100%', borderRadius: '1.5px',
        }} />
        {/* Second hand */}
        <div id="ls-second" style={{
          position: 'absolute', bottom: '50%', left: '50%',
          width: '1px', height: '35px',
          marginLeft: '-0.5px',
          background: 'linear-gradient(to top, rgba(248,90,78,0.85), rgba(248,90,78,0.35))',
          transformOrigin: '50% 100%', borderRadius: '1px',
        }} />
        {/* Center dot */}
        <div style={{
          position: 'absolute', width: '5px', height: '5px',
          borderRadius: '50%', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'radial-gradient(circle, #f85a4e 0%, rgba(248,90,78,0.6) 100%)',
          boxShadow: '0 0 5px rgba(248,90,78,0.4)', zIndex: 2,
        }} />
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100px', height: '2px',
        borderRadius: '2px',
        background: 'rgba(255,255,255,0.25)',
        overflow: 'hidden', position: 'relative',
        animation: 'lsFadeIn 0.5s 0.2s ease both',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)',
          animation: 'barSweep 1.6s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes lsFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barSweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      {/* Clock tick script */}
      <script>
        {`
          function updateLSClock() {
            var now = new Date();
            var h = now.getHours() % 12;
            var m = now.getMinutes();
            var s = now.getSeconds();
            var ms = now.getMilliseconds();
            var sh = document.getElementById('ls-second');
            var mh = document.getElementById('ls-minute');
            var hh = document.getElementById('ls-hour');
            if (sh) sh.style.transform = 'rotate(' + ((s + ms/1000) * 6) + 'deg)';
            if (mh) mh.style.transform = 'rotate(' + ((m + s/60) * 6) + 'deg)';
            if (hh) hh.style.transform = 'rotate(' + ((h + m/60) * 30) + 'deg)';
            requestAnimationFrame(updateLSClock);
          }
          updateLSClock();
        `}
      </script>
    </div>
  );
}
