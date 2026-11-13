import React, { useState } from 'react';
import { Activity, Archive, CheckCircle2, GitMerge, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { Memory } from '../types/memory';
import { getStatusPastelClass } from '../utils/categoryColors';

const HEALTH_TABS: Array<'All Issues' | NonNullable<Memory['healthIssue']>> = [
  'All Issues',
  'Duplicate',
  'Outdated',
  'Unverified',
  'Conflicting',
  'Missing Evidence',
  'Low Confidence',
  'Unused',
];

export const MemoryHealth: React.FC = () => {
  const {
    memories,
    verifyMemory,
    mergeMemory,
    archiveMemory,
    deleteMemory,
    openMemoryDrawer,
  } = useLivingMemory();

  const [tab, setTab] = useState<'All Issues' | NonNullable<Memory['healthIssue']>>('All Issues');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const flagged = memories.filter(
    (m) => m.verificationStatus !== 'Archived' && (m.healthIssue || m.verificationStatus !== 'Verified')
  );

  const visible = flagged.filter((m) => tab === 'All Issues' || m.healthIssue === tab);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 16 · Memory Health & Quality Review"
        title="Memory Quality & Hygiene Center"
        subtitle="Review duplicates, outdated items, unverified extracts, conflicting entries, and low-confidence records."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="ws-card rounded-xl p-4">
          <div className="font-mono text-2xl font-semibold text-[var(--ink-green)]">
            {memories.filter((m) => m.verificationStatus === 'Verified').length}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">Verified Clean</div>
        </div>
        <div className="ws-card rounded-xl p-4">
          <div className="font-mono text-2xl font-semibold text-[var(--ink-yellow)]">
            {flagged.length}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">Needs Hygiene Review</div>
        </div>
        <div className="ws-card rounded-xl p-4">
          <div className="font-mono text-2xl font-semibold text-[var(--ink-red)]">
            {memories.filter((m) => m.healthIssue === 'Conflicting').length}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">Conflicting Records</div>
        </div>
        <div className="ws-card rounded-xl p-4">
          <div className="font-mono text-2xl font-semibold text-[var(--text-muted)]">
            {memories.filter((m) => m.verificationStatus === 'Archived').length}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">Archived</div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {HEALTH_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t
                ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No issues in this health category"
          description="All matching records are verified or clean."
          actionLabel="Show All Flagged Items"
          onAction={() => setTab('All Issues')}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((m) => (
            <div
              key={m.id}
              className="ws-card rounded-xl p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getStatusPastelClass(m.healthIssue || m.verificationStatus)}`}>
                      {m.healthIssue || m.verificationStatus}
                    </span>
                    <span className="text-[var(--text-muted)]">{m.sourceName}</span>
                  </div>
                  <h3 className="mt-1.5 text-base font-semibold text-[var(--text-primary)]">
                    {m.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {m.currentInformation}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => openMemoryDrawer(m.id)}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  >
                    Review
                  </button>
                  {m.healthIssue === 'Duplicate' && (
                    <button
                      onClick={() => mergeMemory(m.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)]"
                    >
                      <GitMerge className="h-3.5 w-3.5" />
                      Merge
                    </button>
                  )}
                  <button
                    onClick={() => verifyMemory(m.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--pastel-green)] px-3 py-1.5 text-xs font-medium text-[var(--ink-green)] hover:opacity-90"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm
                  </button>
                  <button
                    onClick={() => archiveMemory(m.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </button>
                  <button
                    onClick={() => setDeleteTarget(m.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--status-danger)]/40 px-2.5 py-1.5 text-xs text-[var(--status-danger)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete memory record?"
        description="This removes the item from your local workspace permanently unless you reset Demo Data."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteMemory(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
