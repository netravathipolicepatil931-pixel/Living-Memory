import React, { useState } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { Commitment } from '../types/memory';
import { getStatusPastelClass } from '../utils/categoryColors';

const STATUSES: Array<'All' | Commitment['status']> = [
  'All',
  'Pending',
  'Completed',
  'Overdue',
  'Unconfirmed',
  'Cancelled',
];

export const CommitmentTracker: React.FC = () => {
  const { commitments, projects, updateCommitmentStatus, openMemoryDrawer } = useLivingMemory();
  const [statusFilter, setStatusFilter] = useState<'All' | Commitment['status']>('All');
  const [followUpNotes, setFollowUpNotes] = useState<Record<string, string>>({});

  const visible = commitments.filter(
    (c) => statusFilter === 'All' || c.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 31 · Commitment Tracker"
        title="Promises & Commitments Tracker"
        subtitle="Track commitments made across WhatsApp and Gmail with full source quotes, follow-up history, and manual status verification."
      />

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === st
                ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visible.map((c) => {
          const project = projects.find((p) => p.id === c.projectId);
          return (
            <div
              key={c.id}
              className="ws-card rounded-xl p-5 space-y-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2.5 py-0.5 font-medium ${getStatusPastelClass(c.status)}`}>
                      {c.status}
                    </span>
                    <span className="font-semibold text-[var(--accent-primary)]">
                      Owner: {c.owner}
                    </span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span className="text-[var(--text-secondary)]">{project?.name}</span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">
                      Due {c.dueDate}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-base font-semibold text-[var(--text-primary)]">
                    {c.title}
                  </h3>
                </div>

                <select
                  value={c.status}
                  onChange={(e) =>
                    updateCommitmentStatus(c.id, e.target.value as Commitment['status'])
                  }
                  aria-label={`Status for ${c.title}`}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Unconfirmed">Unconfirmed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-xs italic text-[var(--text-primary)]">
                “{c.statement}” — {c.sourceName}
              </p>

              <div className="space-y-1.5 text-xs">
                <div className="font-medium text-[var(--text-secondary)]">Follow-up History</div>
                <ul className="space-y-1 text-[var(--text-muted)]">
                  {c.followUpHistory.map((h, i) => (
                    <li key={i}>• {h}</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const note = followUpNotes[c.id]?.trim();
                    if (!note) return;
                    updateCommitmentStatus(c.id, c.status, note);
                    setFollowUpNotes((prev) => ({ ...prev, [c.id]: '' }));
                  }}
                  className="flex flex-1 min-w-[240px] gap-2"
                >
                  <input
                    type="text"
                    value={followUpNotes[c.id] || ''}
                    onChange={(e) =>
                      setFollowUpNotes((prev) => ({ ...prev, [c.id]: e.target.value }))
                    }
                    placeholder="Add evidence-checked follow-up note..."
                    className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                    Log Check
                  </button>
                </form>

                <button
                  onClick={() => openMemoryDrawer(c.linkedMemoryId)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-gold)] hover:underline shrink-0"
                >
                  Inspect Evidence
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
