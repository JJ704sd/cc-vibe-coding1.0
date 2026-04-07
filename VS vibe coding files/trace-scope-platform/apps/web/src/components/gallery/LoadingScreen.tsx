import { useEffect } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  useEffect(() => {
    // Fire immediately — no animation, no sky, no blue circle
    const timer = setTimeout(onComplete, 50);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return null;
}
