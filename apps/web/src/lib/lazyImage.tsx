import { useEffect, useRef, useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  srcSet?: string;
  sizes?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  placeholder?: string;
  rootMargin?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Lazy image with IntersectionObserver-based placeholder reveal.
 * Always renders a stable aspect + placeholder background first, then swaps
 * the real `<img>` once the wrapper enters the viewport.
 *
 * Designed to be a drop-in replacement for `<img>` in places where we want
 * predictable lazy loading + LQIP-style behavior without touching every call
 * site. Existing call sites are intentionally NOT migrated — Agent-2 (visual
 * layer) opts in per component.
 */
export function LazyImage({
  src,
  alt,
  srcSet,
  sizes,
  width,
  height,
  className,
  placeholder,
  rootMargin = '200px 0px',
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  onLoad,
  onError,
}: LazyImageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }
    const node = wrapperRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  const placeholderStyle = placeholder
    ? { backgroundImage: `url(${placeholder})` }
    : undefined;

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width,
        height,
        backgroundColor: 'var(--glass-bg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        ...placeholderStyle,
      }}
      data-lazy-image={isLoaded ? 'loaded' : 'pending'}
    >
      {isInView ? (
        <img
          src={src}
          alt={alt}
          srcSet={srcSet}
          sizes={sizes}
          loading={loading}
          decoding={decoding}
          // React 19 maps `fetchPriority` -> `fetchpriority` automatically.
          {...(fetchPriority ? { fetchPriority } : {})}
          onLoad={() => {
            setIsLoaded(true);
            onLoad?.();
          }}
          onError={() => {
            setIsLoaded(true);
            onError?.();
          }}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity var(--transition-med, 280ms) ease',
          }}
        />
      ) : null}
    </div>
  );
}

interface SrcSetEntry {
  url: string;
  width: number;
}

const DEFAULT_SRC_SET_WIDTHS = [320, 480, 768, 1024, 1440, 1920] as const;

/**
 * Build a `srcset` attribute for the public upload endpoint.
 *
 * The backend at `/api/public/uploads/:fileId` does not yet honor a `?w=` size
 * query (it returns the original asset). This helper still emits a valid
 * srcset string so the browser picks the best candidate once the API grows
 * query-string resizing — today every entry resolves to the same file.
 *
 * Pass an explicit `widths` list to override the default breakpoint ladder,
 * or call with `[]` to skip generation entirely.
 */
export function buildSrcSet(
  fileId: string,
  widths: readonly number[] = DEFAULT_SRC_SET_WIDTHS,
): string {
  if (!fileId) return '';
  const entries: SrcSetEntry[] = [];
  for (const width of widths) {
    if (!Number.isFinite(width) || width <= 0) continue;
    const url = `/api/public/uploads/${encodeURIComponent(fileId)}?w=${Math.round(width)}`;
    entries.push({ url, width });
  }
  return entries.map((entry) => `${entry.url} ${entry.width}w`).join(', ');
}

/**
 * Convenience: full default-sizes string for responsive grid layouts.
 */
export const DEFAULT_LAZY_IMAGE_SIZES =
  '(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw';