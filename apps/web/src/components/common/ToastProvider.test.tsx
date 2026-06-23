import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ToastProvider, useToastContext } from './ToastProvider';
import { useToast } from './useToast';

function Consumer({ tone, message }: { tone: 'success' | 'error' | 'info' | 'warning'; message: string }) {
  const toast = useToast();
  return (
    <button data-testid={`emit-${tone}`} onClick={() => toast.show(tone, message)}>
      emit
    </button>
  );
}

function ContextConsumer() {
  const ctx = useToastContext();
  return <span data-testid="ctx-toast-count">{ctx.toasts.length}</span>;
}

describe('ToastProvider', () => {
  it('renders nothing visible when there are no toasts', () => {
    render(<ToastProvider><div /></ToastProvider>);
    expect(screen.queryByTestId('toast-viewport')).toBeNull();
  });

  it('emits success toast through useToast hook', () => {
    render(
      <ToastProvider>
        <Consumer tone="success" message="保存成功" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByTestId('emit-success').click();
    });
    const toast = screen.getByTestId('toast-success');
    expect(toast.textContent).toContain('保存成功');
  });

  it('emits error toast through useToast hook', () => {
    render(
      <ToastProvider>
        <Consumer tone="error" message="删除失败" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByTestId('emit-error').click();
    });
    expect(screen.getByTestId('toast-error').textContent).toContain('删除失败');
  });

  it('emits info and warning toasts through useToast hook', () => {
    render(
      <ToastProvider>
        <Consumer tone="info" message="提示信息" />
        <Consumer tone="warning" message="警告信息" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByTestId('emit-info').click();
      screen.getByTestId('emit-warning').click();
    });
    expect(screen.getByTestId('toast-info').textContent).toContain('提示信息');
    expect(screen.getByTestId('toast-warning').textContent).toContain('警告信息');
  });

  it('dismisses a toast when the close button is clicked', () => {
    render(
      <ToastProvider>
        <Consumer tone="success" message="待关闭" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByTestId('emit-success').click();
    });
    const closeButtons = screen.getAllByRole('button', { name: '关闭通知' });
    act(() => {
      closeButtons[0].click();
    });
    expect(screen.queryByTestId('toast-success')).toBeNull();
  });

  it('auto dismisses a toast after the default duration', () => {
    vi.useFakeTimers();
    try {
      render(
        <ToastProvider defaultDurationMs={1000}>
          <Consumer tone="success" message="自动消失" />
        </ToastProvider>,
      );
      act(() => {
        screen.getByTestId('emit-success').click();
      });
      expect(screen.getByTestId('toast-success')).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      expect(screen.queryByTestId('toast-success')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('exposes toast list through useToastContext for advanced consumers', () => {
    render(
      <ToastProvider>
        <Consumer tone="success" message="计数测试" />
        <ContextConsumer />
      </ToastProvider>,
    );
    expect(screen.getByTestId('ctx-toast-count').textContent).toBe('0');
    act(() => {
      screen.getByTestId('emit-success').click();
    });
    expect(screen.getByTestId('ctx-toast-count').textContent).toBe('1');
  });

  it('stacks multiple toasts in a single viewport', () => {
    render(
      <ToastProvider>
        <Consumer tone="success" message="第一条" />
        <Consumer tone="error" message="第二条" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByTestId('emit-success').click();
      screen.getByTestId('emit-error').click();
    });
    const viewport = screen.getByTestId('toast-viewport');
    expect(viewport.querySelectorAll('[data-testid="toast-success"]').length).toBe(1);
    expect(viewport.querySelectorAll('[data-testid="toast-error"]').length).toBe(1);
  });
});

describe('useToast', () => {
  it('throws when used outside ToastProvider', () => {
    function Naked() {
      useToast();
      return null;
    }
    expect(() => render(<Naked />)).toThrow(/ToastProvider/);
  });
});