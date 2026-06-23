import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonStack } from './Skeleton';

describe('Skeleton', () => {
  it('renders a status placeholder with default variant', () => {
    render(<Skeleton />);
    const node = screen.getByTestId('skeleton');
    expect(node.getAttribute('data-variant')).toBe('rect');
    expect(node.getAttribute('role')).toBe('status');
  });

  it('honours variant and dimensions', () => {
    render(<Skeleton variant="circle" width={48} height={48} aria-label="头像占位" />);
    const node = screen.getByTestId('skeleton');
    expect(node.getAttribute('data-variant')).toBe('circle');
    expect(node.style.width).toBe('48px');
    expect(node.style.height).toBe('48px');
    expect(node.style.borderRadius).toBe('999px');
    expect(node.getAttribute('aria-label')).toBe('头像占位');
  });

  it('renders a custom radius when provided', () => {
    render(<Skeleton radius={12} />);
    const node = screen.getByTestId('skeleton');
    expect(node.style.borderRadius).toBe('12px');
  });

  it('renders a stack of skeletons', () => {
    render(
      <SkeletonStack count={3}>
        <Skeleton variant="text" />
      </SkeletonStack>,
    );
    const stack = screen.getByTestId('skeleton-stack');
    expect(stack).toBeTruthy();
    expect(stack.querySelectorAll('[data-testid="skeleton"]').length).toBe(1);
  });

  it('falls back to generated text skeletons when no children provided', () => {
    render(<SkeletonStack count={4} />);
    const stack = screen.getByTestId('skeleton-stack');
    expect(stack.querySelectorAll('[data-variant="text"]').length).toBe(4);
  });
});
