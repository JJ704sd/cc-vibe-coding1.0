import type { CSSProperties, ReactNode } from 'react';

export type SkeletonVariant = 'text' | 'circle' | 'rect';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  variant?: SkeletonVariant;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

const variantStyle: Record<SkeletonVariant, CSSProperties> = {
  text: { height: '0.85em', width: '100%', borderRadius: '6px' },
  circle: { borderRadius: '999px' },
  rect: { borderRadius: 'var(--radius-sm)' },
};

export function Skeleton({
  width,
  height,
  radius,
  variant = 'rect',
  className,
  style,
  'aria-label': ariaLabel,
}: SkeletonProps) {
  const merged: CSSProperties = {
    ...variantStyle[variant],
    width: variant === 'text' ? variantStyle.text.width : width ?? '100%',
    height: variant === 'text' ? variantStyle.text.height : height ?? '1em',
    ...(radius !== undefined ? { borderRadius: typeof radius === 'number' ? `${radius}px` : radius } : {}),
    ...style,
  };
  return (
    <span
      role="status"
      aria-label={ariaLabel ?? '加载中'}
      aria-live="polite"
      data-testid="skeleton"
      data-variant={variant}
      className={['skeleton', className].filter(Boolean).join(' ')}
      style={merged}
    />
  );
}

export interface SkeletonStackProps {
  count?: number;
  gap?: number;
  children?: ReactNode;
}

export function SkeletonStack({ count = 3, gap = 12, children }: SkeletonStackProps) {
  const items = children
    ? Array.isArray(children)
      ? children
      : [children]
    : Array.from({ length: count }, (_, i) => <Skeleton key={i} variant="text" />);
  return (
    <div
      data-testid="skeleton-stack"
      style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, width: '100%' }}
    >
      {items}
    </div>
  );
}
