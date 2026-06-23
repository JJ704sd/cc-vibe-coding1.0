import { useEffect, useState, type ReactNode } from 'react';

export interface CascadeDeleteDialogProps<T> {
  open: boolean;
  title: string;
  entityName: string;
  loading: boolean;
  errorMessage?: string | null;
  /** Used to load willDelete stats when the dialog opens. */
  loadPreview: () => Promise<T>;
  /** Render the willDelete stats into a human readable list. */
  renderSummary: (preview: T) => ReactNode;
  /** Called after the user clicks the confirm button. */
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function CascadeDeleteDialog<T>({
  open,
  title,
  entityName,
  loading,
  errorMessage,
  loadPreview,
  renderSummary,
  onConfirm,
  onCancel,
  confirmLabel = '确认删除',
  cancelLabel = '取消',
}: CascadeDeleteDialogProps<T>) {
  const [preview, setPreview] = useState<T | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    setPreview(null);
    setPreviewError(null);
    loadPreview()
      .then(result => {
        if (!cancelled) setPreview(result);
      })
      .catch(e => {
        if (!cancelled) setPreviewError(e instanceof Error ? e.message : '加载预览失败');
      });
    return () => {
      cancelled = true;
    };
  }, [open, loadPreview]);

  if (!open) return null;

  return (
    <div
      data-testid="cascade-delete-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 150,
        padding: '24px',
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="panel"
        style={{
          padding: '24px',
          maxWidth: '480px',
          width: '100%',
          display: 'grid',
          gap: '16px',
          background: 'rgba(18,18,28,0.98)',
          border: '1px solid rgba(255,107,107,0.4)',
        }}
      >
        <h2 className="section-title-sm" style={{ color: 'rgba(255,107,107,0.95)' }}>{title}</h2>
        <p className="muted" style={{ fontSize: '0.875rem' }}>
          将要删除：<strong style={{ color: 'rgba(232,232,240,0.95)' }}>{entityName}</strong>
        </p>

        <div
          data-testid="cascade-delete-preview"
          style={{
            padding: '12px 14px',
            background: 'rgba(255,107,107,0.08)',
            border: '1px solid rgba(255,107,107,0.2)',
            borderRadius: '10px',
            fontSize: '0.875rem',
            color: 'rgba(232,232,240,0.92)',
            minHeight: '56px',
          }}
        >
          {previewError ? (
            <span style={{ color: 'rgba(255,107,107,0.95)' }}>无法预览级联影响：{previewError}</span>
          ) : preview ? (
            renderSummary(preview)
          ) : (
            <span className="muted">正在计算级联影响…</span>
          )}
        </div>

        {errorMessage && (
          <p style={{ color: 'rgba(255,107,107,0.95)', fontSize: '0.85rem' }}>{errorMessage}</p>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            data-testid="cascade-delete-cancel"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !preview}
            data-testid="cascade-delete-confirm"
            style={{ background: 'var(--danger)' }}
          >
            {loading ? '删除中...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}