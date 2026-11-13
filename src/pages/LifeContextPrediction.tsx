import React from 'react';
import { Clock } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';

export const LifeContextPrediction: React.FC = () => {
  const { predictions } = useLivingMemory();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 34 · Life Context Prediction"
        title="Anticipated Bottlenecks & Preparation Signals"
        subtitle="Each outlook strictly separates Confirmed Known Facts from Observed Patterns and Speculative AI Predictions."
        demoBanner="AI Predictions are forward-looking hypotheses built from Alex's demo patterns—never confirmed facts."
      />

      <div className="space-y-5">
        {predictions.map((item) => (
          <div
            key={item.id}
            className="ws-card rounded-xl p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--pastel-lavender)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink-lavender)]">
                <Clock className="h-3.5 w-3.5" />
                Forecast Outlook
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                People involved: {item.peopleInvolved.join(', ')}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{item.situation}</h3>

            {/* 3-Column Epistemic Separation */}
            <div className="grid gap-4 lg:grid-cols-3 text-xs">
              <div className="rounded-xl bg-[var(--pastel-green)]/50 p-4">
                <div className="font-semibold text-[var(--ink-green)]">
                  Known Facts (Source-Confirmed)
                </div>
                <ul className="mt-2 list-disc pl-4 space-y-1.5 text-[var(--text-primary)]">
                  {item.knownFacts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-[var(--pastel-lavender)]/60 p-4">
                <div className="font-semibold text-[var(--ink-lavender)]">
                  Observed Patterns
                </div>
                <ul className="mt-2 list-disc pl-4 space-y-1.5 text-[var(--text-primary)]">
                  {item.observedPatterns.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-[var(--pastel-yellow)]/65 p-4">
                <div className="font-semibold text-[var(--ink-yellow)]">
                  AI Prediction (Hypothetical)
                </div>
                <p className="mt-2 leading-relaxed text-[var(--text-primary)]">
                  {item.aiPrediction}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 text-xs">
              <div className="rounded-lg bg-[var(--pastel-red)]/55 p-3.5">
                <span className="font-semibold text-[var(--ink-red)]">Potential Risk: </span>
                <span className="text-[var(--text-primary)]">{item.potentialRisk}</span>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5">
                <span className="font-semibold text-[var(--ink-green)]">
                  Suggested Preparation:{' '}
                </span>
                <span className="text-[var(--text-primary)]">{item.suggestedPreparation}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
