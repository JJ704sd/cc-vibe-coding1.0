import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
  nightMode: boolean;
}

export function LoadingScreen({ onComplete, nightMode }: LoadingScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => {
      setFadeOut(true);
    }, 520);
    const completeTimer = window.setTimeout(() => {
      onComplete();
    }, 980);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={[
        'gallery-loading-screen',
        nightMode ? 'gallery-loading-screen--night' : '',
        fadeOut ? ' gallery-loading-screen--fade-out' : '',
      ].join('')}
      aria-hidden="true"
    >
      <div className="gallery-loading-screen__veil" />
      <div className="gallery-loading-screen__content">
        <div className="gallery-loading-screen__clock">
          <div className="gallery-loading-screen__mark gallery-loading-screen__mark--12" />
          <div className="gallery-loading-screen__mark gallery-loading-screen__mark--1" />
          <div className="gallery-loading-screen__mark gallery-loading-screen__mark--2" />
          <div className="gallery-loading-screen__mark gallery-loading-screen__mark--3" />
          <div className="gallery-loading-screen__mark gallery-loading-screen__mark--4" />
          <div className="gallery-loading-screen__mark gallery-loading-screen__mark--5" />
          <div className="gallery-loading-screen__mark gallery-loading-screen__mark--6" />
          <div className="gallery-loading-screen__mark gallery-loading-screen__mark--7" />
          <div className="gallery-loading-screen__mark gallery-loading-screen__mark--8" />
          <div className="gallery-loading-screen__mark gallery-loading-screen__mark--9" />
          <div className="gallery-loading-screen__mark gallery-loading-screen__mark--10" />
          <div className="gallery-loading-screen__mark gallery-loading-screen__mark--11" />
          <div className="gallery-loading-screen__hand gallery-loading-screen__hand--hour" />
          <div className="gallery-loading-screen__hand gallery-loading-screen__hand--minute" />
          <div className="gallery-loading-screen__hand gallery-loading-screen__hand--second" />
          <div className="gallery-loading-screen__cap" />
        </div>
        <div className="gallery-loading-screen__label">Trace Scope</div>
      </div>
    </div>
  );
}
