import { useEffect, useRef } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (el) {
        el.style.transition = 'opacity 0.8s ease';
        el.style.opacity = '0';
        setTimeout(() => onComplete(), 820);
      }
    }, 700);
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
      {/* ── Analog clock (canvas-drawn, matching gallery scene style) ── */}
      <canvas
        id="ls-clock"
        width={120}
        height={120}
        style={{ display: 'block' }}
      />

      {/* Progress bar */}
      <div style={{
        width: '100px', height: '2px',
        borderRadius: '2px',
        background: 'rgba(255,255,255,0.25)',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)',
          animation: 'barSweep 1.6s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes barSweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      {/* Clock drawing script */}
      <script>
        {`
          (function() {
            var canvas = document.getElementById('ls-clock');
            if (!canvas) return;
            var ctx = canvas.getContext('2d');
            var cw = 120, ch = 120, cx = cw/2, cy = ch/2, r = cw/2 - 8;

            function drawClock() {
              var now = new Date();
              var sec = now.getSeconds() + now.getMilliseconds() / 1000;
              var min = now.getMinutes() + sec / 60;
              var hr  = (now.getHours() % 12) + min / 60;

              ctx.clearRect(0, 0, cw, ch);

              // Face gradient
              var grad = ctx.createRadialGradient(cx-8, cy-8, 0, cx, cy, r);
              grad.addColorStop(0, 'rgba(255,255,255,0.97)');
              grad.addColorStop(0.45, 'rgba(238,246,255,0.86)');
              grad.addColorStop(1, 'rgba(208,222,240,0.72)');
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, Math.PI * 2);
              ctx.fillStyle = grad;
              ctx.fill();
              ctx.strokeStyle = 'rgba(160,180,210,0.4)';
              ctx.lineWidth = 1.2;
              ctx.stroke();

              // Inner ring
              ctx.beginPath();
              ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(160,180,210,0.25)';
              ctx.lineWidth = 0.8;
              ctx.stroke();

              // Tick marks
              for (var i = 0; i < 12; i++) {
                var a = (i / 12) * Math.PI * 2 - Math.PI / 2;
                var inner = i % 3 === 0 ? r - 14 : r - 9;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
                ctx.lineTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
                ctx.strokeStyle = i % 3 === 0 ? 'rgba(120,100,140,0.6)' : 'rgba(120,100,140,0.28)';
                ctx.lineWidth = i % 3 === 0 ? 1.8 : 1.2;
                ctx.stroke();
              }

              // Hour hand
              var ha = (hr / 12) * Math.PI * 2 - Math.PI / 2;
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(cx + Math.cos(ha) * r * 0.46, cy + Math.sin(ha) * r * 0.46);
              ctx.strokeStyle = 'rgba(95,75,115,0.78)';
              ctx.lineWidth = 2.8;
              ctx.lineCap = 'round';
              ctx.stroke();

              // Minute hand
              var ma = (min / 60) * Math.PI * 2 - Math.PI / 2;
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(cx + Math.cos(ma) * r * 0.7, cy + Math.sin(ma) * r * 0.7);
              ctx.strokeStyle = 'rgba(95,75,115,0.68)';
              ctx.lineWidth = 1.9;
              ctx.lineCap = 'round';
              ctx.stroke();

              // Second hand
              var sa = (sec / 60) * Math.PI * 2 - Math.PI / 2;
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(cx + Math.cos(sa) * r * 0.8, cy + Math.sin(sa) * r * 0.8);
              ctx.strokeStyle = '#f85a4e';
              ctx.lineWidth = 1.1;
              ctx.lineCap = 'round';
              ctx.stroke();

              // Center dot
              ctx.beginPath();
              ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
              ctx.fillStyle = '#f85a4e';
              ctx.fill();

              requestAnimationFrame(drawClock);
            }
            drawClock();
          })();
        `}
      </script>
    </div>
  );
}
