import { useEffect, useId, type ReactNode } from 'react';

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (used for cancelling a booking). */
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Accessible modal built from Bootstrap's modal markup (no Bootstrap JS needed): role="dialog",
 * Escape / backdrop click dismiss it, both blocked while a request is in flight.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Go back',
  danger = false,
  busy = false,
  error = null,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      tabIndex={-1}
      onClick={() => !busy && onClose()}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h2 className="modal-title h5" id={titleId}>
              {title}
            </h2>
          </div>
          <div className="modal-body">
            {children}
            {error && (
              <div role="alert" className="alert alert-danger mt-3 mb-0">
                {error}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={onConfirm}
              disabled={busy}
              autoFocus
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
