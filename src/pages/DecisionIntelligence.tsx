import React from 'react';
import { ExternalLink, Scale } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';

export const DecisionIntelligence: React.FC = () => {
  const { decisions, openMemoryDrawer } = useLivingMemory();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 29 · Decision Intelligence"
        title="Decision History, Trade-offs & Outcomes"
        subtitle="Audit alternatives considered, final choices made, reasoning captured from chats/emails, and any subsequent adjustments."
      />

      <div className="space-y-5">
        {decisions.map((dec) => (
          <div
            key={dec.id}
            className="ws-card rounded-xl p-6 space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pastel-lavender)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink-lavender)]">
                  <Scale className="h-3.5 w-3.5" />
                  {dec.sourceName} · {dec.date}
                </div>
                <h3 className="mt-1.5 text-lg font-semibold text-[var(--text-primary)]">
                  {dec.title}
                </h3>
              </div>
              <button
                onClick={() => openMemoryDrawer(dec.linkedMemoryId)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)] shrink-0"
              >
                Inspect Evidence
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 text-xs">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
                <div className="font-semibold text-[var(--text-primary)]">
                  Alternatives Considered
                </div>
                <ul className="mt-2 list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
                  {dec.alternatives.map((alt) => (
                    <li key={alt}>{alt}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--nav-active-bg)] p-4">
                <div className="font-semibold text-[var(--accent-primary)]">Final Choice Locked</div>
                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                  {dec.finalChoice}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 text-xs">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5">
                <div className="font-medium text-[var(--text-primary)]">Reasoning</div>
                <p className="mt-1 text-[var(--text-secondary)]">{dec.reasoning}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5">
                <div className="font-medium text-[var(--text-primary)]">Observed Outcomes</div>
                <p className="mt-1 text-[var(--text-secondary)]">{dec.outcomes}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5">
                <div className="font-medium text-[var(--text-primary)]">Later Changes</div>
                <p className="mt-1 text-[var(--text-secondary)]">
                  {dec.laterChanges || 'No later reversals recorded.'}
                </p>
              </div>
            </div>

            <div className="text-[11px] text-[var(--text-muted)]">
              People involved: {dec.peopleInvolved.join(' · ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
