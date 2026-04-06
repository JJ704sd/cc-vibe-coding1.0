import { useEffect, useState } from 'react';

function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour < 6 || hour >= 19; // Night: 7pm–6am
}

export function SkyBackground() {
  const [nightMode, setNightMode] = useState(isNightTime);

  useEffect(() => {
    // Re-evaluate every minute in case user keeps page open
    const interval = setInterval(() => {
      setNightMode(isNightTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`sky-bg ${nightMode ? 'night-mode' : 'day-mode'}`}
      aria-hidden="true"
    >
      {nightMode && <StarsLayer />}
    </div>
  );
}

function StarsLayer() {
  // Generate deterministic star positions based on index using golden ratio
  const stars = Array.from({ length: 60 }, (_, i) => {
    const x = (i * 137.508) % 100;
    const y = (i * 73.254) % 100;
    const size = i % 3 === 0 ? 2 : 1;
    const opacity = 0.4 + (i % 5) * 0.1;
    return { x, y, size, opacity };
  });

  return (
    <div className="stars-layer" aria-hidden="true">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(40, 50, 100, 0.4) 0%, transparent 60%)',
        }}
      />
      {stars.map((star, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '50%',
            background: 'white',
            opacity: star.opacity,
            animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.3) % 3}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: inherit; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
