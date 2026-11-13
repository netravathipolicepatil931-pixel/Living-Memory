import React, { useState } from 'react';
import { AlertOctagon, CheckCircle2, ExternalLink } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { Conflict } from '../types/memory';

const CONFLICT_TYPES: Array<'All' | Conflict['conflictType']> = [
  'All',
  'Different deadlines',
  'Different meeting times',
  'Conflicting instructions',
  'Changed responsibilities',
  'Outdated announcements',
  'Contradictory decisions',
];

export const ConflictCenter: React.FC = () => {
  const { conflicts, resolveConflict, openMemoryDrawer } = useLivingMemory();
  const [typeFilter, setTypeFilter] = useState<'All' | Conflict['conflictType']>('All');

  const visible = conflicts.filter(
    (c) => typeFilter === 'All' || c.conflictType === typeFilter
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 26 · Change & Conflict Center"
        title="Conflicting Information & Timeline Changes"
        subtitle="Compare competing claims side by side, inspect why one source supersedes another, or keep both versions for review."
      />

      <div className="flex flex-wrap gap-1.5">
        {CONFLICT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap ${
              typeFilter === t
                ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={AlertOctagon}
          title="No conflicts in this category"
          description="Select All to review all detected cross-source contradictions."
          actionLabel="Show All Conflicts"
          onAction={() => setTypeFilter('All')}
        />
      ) : (
        <div className="space-y-5">
          {visible.map((conflict) => {
            const latestClaim = conflict.claims[conflict.claims.length - 1];
            return (
              <div
                key={conflict.id}
                className="ws-card rounded-xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md bg-[var(--pastel-red)] px-2 py-0.5 font-semibold text-[var(--ink-red)]">
                        {conflict.conflictType}
                      </span>
                      <span className="rounded-md bg-[var(--pastel-blue)] px-2 py-0.5 font-medium text-[var(--ink-blue)]">
                        {conflict.confidenceLabel}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--text-muted)]">
                        Detected {conflict.detectedAt}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                      {conflict.title}
                    </h3>
                  </div>

                  <span
                    className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold ${
                      conflict.status === 'Unresolved'
                        ? 'bg-[var(--pastel-red)] text-[var(--ink-red)]'
                        : 'bg-[var(--pastel-green)] text-[var(--ink-green)]'
                    }`}
                  >
                    {conflict.status}
                  </span>
                </div>

                {/* Competing Claims */}
                <div className="grid gap-3 md:grid-cols-3">
                  {conflict.claims.map((claim, idx) => (
                    <div
                      key={claim.id}
                      className={`rounded-xl border p-4 text-xs ${
                        idx === conflict.claims.length - 1
                          ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>{claim.sourceType}</span>
                        <span className="font-mono">{claim.timestamp}</span>
                      </div>
                      <div className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
                        {claim.value}
                      </div>
                      <div className="mt-1 text-[11px] font-medium text-[var(--accent-primary)]">
                        {claim.sourceName}
                      </div>
                      <p className="mt-2 italic text-[var(--text-secondary)]">“{claim.excerpt}”</p>
                      <div className="mt-2 text-[11px] text-[var(--text-muted)]">
                        Basis: {claim.reliabilityBasis}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5 text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">
                    Suggested Resolution:{' '}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {conflict.suggestedResolution}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    onClick={() => openMemoryDrawer(conflict.memoryId)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-gold)] hover:underline"
                  >
                    Inspect Linked Memory Record
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() =>
                        resolveConflict(conflict.id, 'Confirmed Latest', latestClaim?.value)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-gold)] px-3.5 py-1.5 text-xs font-semibold text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirm Latest Info
                    </button>
                    <button
                      onClick={() => resolveConflict(conflict.id, 'Kept Both Versions')}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                    >
                      Keep Both Versions
                    </button>
                    <button
                      onClick={() => resolveConflict(conflict.id, 'Clarification Requested')}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      Request Clarification
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
