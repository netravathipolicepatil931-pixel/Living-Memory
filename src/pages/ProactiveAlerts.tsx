import React, { useState } from 'react';
import { Bell, CheckCircle2, Eye, XCircle } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { ProactiveAlert } from '../types/memory';

const ALERT_TYPES: Array<'All' | ProactiveAlert['type']> = [
  'All',
  'Deadline approaching',
  'Meeting changed',
  'Commitment not fulfilled',
  'Important question unanswered',
  'Conflicting information',
  'Missing document',
  'New important decision',
  'Possible dependency risk',
];

export const ProactiveAlerts: React.FC = () => {
  const { alerts, updateAlertStatus, openMemoryDrawer } = useLivingMemory();
  const [typeFilter, setTypeFilter] = useState<'All' | ProactiveAlert['type']>('All');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'Reviewed' | 'Dismissed' | 'All'>(
    'Active'
  );

  const filtered = alerts.filter((a) => {
    if (typeFilter !== 'All' && a.type !== typeFilter) return false;
    if (statusFilter !== 'All' && a.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 09 · Proactive Alerts"
        title="Proactive Context Alerts"
        subtitle="Surfaced deadlines, schedule conflicts, unfulfilled promises, missing files, and possible dependency risks—never hidden silently."
        actions={
          <div className="flex flex-wrap gap-2">
            {(['Active', 'Reviewed', 'Dismissed', 'All'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  statusFilter === st
                    ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        }
      />

      {/* Alert Type Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--text-muted)] mr-1">Filter type:</span>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
        >
          {ALERT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No alerts match this filter"
          description="Try switching status to All or selecting another alert category."
          actionLabel="Show All Alerts"
          onAction={() => {
            setTypeFilter('All');
            setStatusFilter('All');
          }}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className="ws-card rounded-xl p-5"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-[var(--pastel-yellow)] px-2 py-0.5 font-semibold text-[var(--ink-yellow)]">
                      {alert.type}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 font-medium ${
                        alert.certaintyNote === 'Confirmed from Sources'
                          ? 'bg-[var(--pastel-green)] text-[var(--ink-green)]'
                          : 'bg-[var(--pastel-lavender)] text-[var(--ink-lavender)]'
                      }`}
                    >
                      {alert.certaintyNote}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">
                      {alert.timestamp}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                    {alert.title}
                  </h3>
                </div>

                <span className="rounded-md bg-[var(--bg-secondary)] px-2.5 py-1 font-mono text-xs text-[var(--text-secondary)] whitespace-nowrap shrink-0">
                  {alert.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 text-xs">
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5">
                  <div className="font-medium text-[var(--text-primary)]">What happened</div>
                  <p className="mt-1 leading-relaxed text-[var(--text-secondary)]">
                    {alert.whatHappened}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5">
                  <div className="font-medium text-[var(--text-primary)]">Why it matters</div>
                  <p className="mt-1 leading-relaxed text-[var(--text-secondary)]">
                    {alert.whyItMatters}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3.5 text-xs">
                <div className="space-y-1 text-[var(--text-secondary)]">
                  <div>
                    <span className="text-[var(--text-muted)]">Related sources: </span>
                    {alert.relatedSources.join(' · ')}
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Recommended next step: </span>
                    <span className="text-[var(--text-primary)]">{alert.recommendedNextStep}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openMemoryDrawer(alert.linkedMemoryId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  >
                    <Eye className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                    View Evidence
                  </button>
                  {alert.status !== 'Reviewed' && (
                    <button
                      onClick={() => updateAlertStatus(alert.id, 'Reviewed')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-sage)]/20 border border-[var(--accent-sage)]/40 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-[var(--status-success)]" />
                      Mark Reviewed
                    </button>
                  )}
                  {alert.status !== 'Dismissed' && (
                    <button
                      onClick={() => updateAlertStatus(alert.id, 'Dismissed')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
