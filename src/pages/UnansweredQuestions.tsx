import React, { useState } from 'react';
import { ExternalLink, HelpCircle } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { UnansweredQuestion } from '../types/memory';
import { getStatusPastelClass } from '../utils/categoryColors';

const QUESTION_STATUSES: Array<'All' | UnansweredQuestion['status']> = [
  'All',
  'Unanswered',
  'Possibly answered elsewhere',
  'Answer found',
  'Needs confirmation',
];

export const UnansweredQuestions: React.FC = () => {
  const { questions, updateQuestionStatus, openMemoryDrawer } = useLivingMemory();
  const [statusFilter, setStatusFilter] = useState<'All' | UnansweredQuestion['status']>('All');

  const visible = questions.filter(
    (q) => statusFilter === 'All' || q.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 32 · Unanswered Question Detector"
        title="Open & Cross-Answered Questions"
        subtitle="Surface unresolved questions from WhatsApp and emails—plus candidate answers found in PDFs or other channels."
      />

      <div className="flex flex-wrap gap-2">
        {QUESTION_STATUSES.map((st) => (
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
        {visible.map((q) => (
          <div
            key={q.id}
            className="ws-card rounded-xl p-5 space-y-3.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${getStatusPastelClass(q.status)}`}>
                    <HelpCircle className="h-3 w-3" />
                    {q.status}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    Asked by {q.askedBy} · {q.sourceName} · {q.date}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                  “{q.question}”
                </h3>
              </div>

              <select
                value={q.status}
                onChange={(e) =>
                  updateQuestionStatus(q.id, e.target.value as UnansweredQuestion['status'])
                }
                aria-label={`Status for question by ${q.askedBy}`}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]"
              >
                <option value="Unanswered">Unanswered</option>
                <option value="Possibly answered elsewhere">Possibly answered elsewhere</option>
                <option value="Answer found">Answer found</option>
                <option value="Needs confirmation">Needs confirmation</option>
              </select>
            </div>

            {q.possibleAnswer ? (
              <div className="rounded-lg bg-[var(--pastel-green)]/55 p-3.5 text-xs">
                <div className="font-semibold text-[var(--ink-green)]">
                  Candidate Answer Found in Another Source
                </div>
                <p className="mt-1 leading-relaxed text-[var(--text-primary)]">
                  {q.possibleAnswer}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5 text-xs text-[var(--text-muted)]">
                No answer detected across currently indexed WhatsApp exports, Gmail demo threads, or PDFs.
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => openMemoryDrawer(q.linkedMemoryId)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-gold)] hover:underline"
              >
                Inspect Linked Memory
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
