import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState, ErrorState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description with default variant', () => {
    render(<EmptyState title="空标题" description="空描述" />);
    const node = screen.getByTestId('empty-state');
    expect(node.getAttribute('data-variant')).toBe('no-results');
    expect(screen.getByText('空标题')).toBeTruthy();
    expect(screen.getByText('空描述')).toBeTruthy();
  });

  it('attaches the requested variant', () => {
    render(<EmptyState variant="no-media" title="暂无媒体" />);
    expect(screen.getByTestId('empty-state').getAttribute('data-variant')).toBe('no-media');
  });

  it('renders CTA when provided', () => {
    render(
      <EmptyState
        title="没有结果"
        cta={<a href="/map">查看地图</a>}
      />,
    );
    expect(screen.getByText('查看地图')).toBeTruthy();
  });

  it('uses the custom icon override instead of the variant icon', () => {
    render(
      <EmptyState
        variant="no-projects"
        title="自定义图标"
        icon={<span data-testid="custom-icon">★</span>}
      />,
    );
    expect(screen.getByTestId('custom-icon')).toBeTruthy();
  });

  it('respects a custom testId', () => {
    render(<EmptyState testId="custom-empty" title="t" />);
    expect(screen.getByTestId('custom-empty')).toBeTruthy();
  });
});

describe('ErrorState', () => {
  it('renders an alert with title and message', () => {
    render(<ErrorState title="加载失败" message="网络异常" />);
    const node = screen.getByTestId('error-state');
    expect(node.getAttribute('role')).toBe('alert');
    expect(screen.getByText('加载失败')).toBeTruthy();
    expect(screen.getByText('网络异常')).toBeTruthy();
  });

  it('renders CTA when provided', () => {
    render(
      <ErrorState
        title="错误"
        cta={<button type="button">重试</button>}
      />,
    );
    expect(screen.getByText('重试')).toBeTruthy();
  });
});
