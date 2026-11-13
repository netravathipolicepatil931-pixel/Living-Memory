import React from 'react';
import { ArrowRight, ExternalLink, Radar } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';

export const ImpactRadar: React.FC = () => {
  const { impacts, openMemoryDrawer } = useLivingMemory();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 27 · Impact Radar"
        title="Downstream Impact & Dependency Radar"
        subtitle="Trace how a single deadline extension or calendar reschedule affects team reviews, preparation milestones, and responsibilities."
      />

      <div className="space-y-6">
        {impacts.map((scenario) => (
          <div
            key={scenario.id}
            className="ws-card rounded-xl p-6 space-y-5"
          >
            {/* Trigger Node */}
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl bg-[var(--nav-active-bg)] p-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)]">
                  <Radar className="h-4 w-4" />
                  Trigger Event · {scenario.detectedDate}
                </div>
                <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                  {scenario.triggerTitle}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {scenario.triggerChange}
                </p>
              </div>
              <button
                onClick={() => openMemoryDrawer(scenario.linkedMemoryId)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)] shrink-0"
              >
                Inspect Trigger Memory
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Downstream Ripple Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {scenario.effects.map((eff) => (
                <div
                  key={eff.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="rounded-full bg-[var(--pastel-lavender)] px-2.5 py-0.5 font-medium text-[var(--ink-lavender)]">
                      {eff.category} · {eff.certainty}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono font-semibold ${
                        eff.severity === 'High'
                          ? 'bg-[var(--pastel-red)] text-[var(--ink-red)]'
                          : eff.severity === 'Medium'
                          ? 'bg-[var(--pastel-yellow)] text-[var(--ink-yellow)]'
                          : 'bg-[var(--pastel-green)] text-[var(--ink-green)]'
                      }`}
                    >
                      {eff.severity} Severity
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />
                    {eff.targetTitle}
                  </div>

                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                    {eff.summary}
                  </p>

                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 text-[11px]">
                    <div className="text-[var(--text-muted)]">Source: {eff.sourceName}</div>
                    <p className="mt-1 italic text-[var(--text-primary)]">
                      “{eff.evidenceExcerpt}”
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <span className="text-[var(--text-muted)]">
                      People: {eff.affectedPeople.join(', ')}
                    </span>
                    <span className="font-medium text-[var(--ink-green)]">
                      Action: {eff.recommendedAction}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
