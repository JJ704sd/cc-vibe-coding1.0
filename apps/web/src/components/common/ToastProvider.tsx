import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  show: (tone: ToastTone, message: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: ReactNode;
  defaultDurationMs?: number;
}

let toastCounter = 0;

export function ToastProvider({ children, defaultDurationMs = 3500 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback((tone: ToastTone, message: string) => {
    toastCounter += 1;
    const id = `toast-${Date.now()}-${toastCounter}`;
    setToasts(prev => [...prev, { id, tone, message }]);
    const handle = setTimeout(() => dismiss(id), defaultDurationMs);
    timers.current.set(id, handle);
    return id;
  }, [dismiss, defaultDurationMs]);

  const value = useMemo<ToastContextValue>(() => ({ toasts, show, dismiss }), [toasts, show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      data-testid="toast-viewport"
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: 'min(420px, calc(100vw - 32px))',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const toneStyles: Record<ToastTone, { bg: string; border: string; color: string; icon: string }> = {
  success: {
    bg: 'rgba(74,222,128,0.18)',
    border: 'rgba(74,222,128,0.4)',
    color: 'rgba(74,222,128,0.95)',
    icon: '✓',
  },
  error: {
    bg: 'rgba(255,107,107,0.18)',
    border: 'rgba(255,107,107,0.4)',
    color: 'rgba(255,107,107,0.95)',
    icon: '✗',
  },
  info: {
    bg: 'rgba(91,141,238,0.18)',
    border: 'rgba(91,141,238,0.4)',
    color: 'rgba(123,167,255,0.95)',
    icon: 'ℹ',
  },
  warning: {
    bg: 'rgba(232,168,124,0.18)',
    border: 'rgba(232,168,124,0.4)',
    color: 'rgba(232,168,124,0.95)',
    icon: '⚠',
  },
};

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const tone = toneStyles[toast.tone];
  return (
    <div
      role="status"
      data-testid={`toast-${toast.tone}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        background: 'rgba(18,18,28,0.92)',
        border: `1px solid ${tone.border}`,
        borderRadius: '12px',
        color: tone.color,
        boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
        backdropFilter: 'blur(12px)',
        pointerEvents: 'auto',
        fontSize: '0.875rem',
        lineHeight: 1.5,
      }}
    >
      <span aria-hidden="true" style={{ fontWeight: 700 }}>{tone.icon}</span>
      <span style={{ flex: 1, color: 'rgba(232,232,240,0.92)' }}>{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="关闭通知"
        data-testid={`toast-close-${toast.id}`}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(200,200,220,0.6)',
          cursor: 'pointer',
          padding: '0 4px',
          fontSize: '1rem',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return ctx;
}