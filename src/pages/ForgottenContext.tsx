import React, { useState } from 'react';
import { Compass, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { ForgottenMemoryItem } from '../types/memory';

const KINDS: Array<'All' | ForgottenMemoryItem['kind']> = [
  'All',
  'Previous project discussion',
  'Past decision',
  'Old promise',
  'Previously shared resource',
  'Unfinished task',
];

export const ForgottenContext: React.FC = () => {
  const { forgottenContext, openMemoryDrawer } = useLivingMemory();
  const [kindFilter, setKindFilter] = useState<'All' | ForgottenMemoryItem['kind']>('All');

  const visible = forgottenContext.filter(
    (item) => kindFilter === 'All' || item.kind === kindFilter
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 17 · Forgotten Context Recovery"
        title="Resurfaced Older Context"
        subtitle="Older decisions, promises, shared resources, and unfinished tasks automatically surfaced because they matter to upcoming deadlines."
      />

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => setKindFilter(k)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              kindFilter === k
                ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((item) => (
          <div
            key={item.id}
            className="ws-card flex flex-col justify-between rounded-xl p-5"
          >
            <div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pastel-purple)] px-2.5 py-0.5 font-medium text-[var(--ink-purple)]">
                  <Compass className="h-3 w-3" />
                  {item.kind}
                </span>
                <span className="font-mono text-[var(--text-muted)]">
                  Captured {item.originalDate}
                </span>
              </div>

              <h3 className="mt-2.5 text-base font-semibold text-[var(--text-primary)]">
                {item.title}
              </h3>

              <div className="mt-3 rounded-lg bg-[var(--pastel-lavender)]/60 p-3 text-xs">
                <div className="font-semibold text-[var(--ink-lavender)]">Why relevant right now</div>
                <p className="mt-1 leading-relaxed text-[var(--text-primary)]">
                  {item.whyRelevantNow}
                </p>
              </div>

              <p className="mt-3 text-xs italic leading-relaxed text-[var(--text-secondary)]">
                “{item.excerpt}”
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
              <span className="text-[var(--text-muted)]">
                {item.originalSource} · {item.relatedPeople.join(', ')}
              </span>
              <button
                onClick={() => openMemoryDrawer(item.linkedMemoryId)}
                className="inline-flex items-center gap-1 font-medium text-[var(--accent-gold)] hover:underline shrink-0"
              >
                View Full Context
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
