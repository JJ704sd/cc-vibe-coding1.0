import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query and re-render when its match state flips.
 *
 * Initial value is computed from `window.matchMedia(query).matches` so the
 * first render after mount (during SSR or in test environments without a
 * real window) doesn't briefly show the wrong layout. A `change` listener
 * is wired in `useEffect` for subsequent viewport changes.
 *
 * Returns false during SSR / when `window.matchMedia` is unavailable (e.g.
 * jsdom without a matchMedia polyfill).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}