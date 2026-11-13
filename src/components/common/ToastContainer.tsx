import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useLivingMemory } from '../../context/LivingMemoryContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useLivingMemory();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 right-4 z-50 flex w-full max-w-sm flex-col gap-2 lg:bottom-6 lg:right-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 text-xs text-[var(--text-primary)] shadow-md"
        >
          <div className="flex items-start gap-2.5">
            {toast.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-success)]" />
            ) : toast.tone === 'warning' || toast.tone === 'danger' ? (
              <AlertCircle
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  toast.tone === 'danger'
                    ? 'text-[var(--status-danger)]'
                    : 'text-[var(--status-warning)]'
                }`}
              />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
            )}
            <div>
              <div className="font-medium">{toast.title}</div>
              {toast.description && (
                <div className="mt-0.5 text-[var(--text-secondary)]">{toast.description}</div>
              )}
            </div>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
