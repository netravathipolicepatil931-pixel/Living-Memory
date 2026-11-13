import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';

const WEEKS = [
  {
    id: '2026-W46',
    label: 'Nov 08 – Nov 13, 2026 (Current)',
    highlights: [
      'AI Systems Assignment deadline evolved 3 times (Nov 15 → Nov 18 → Nov 20).',
      'Project Review confirmed for Nov 18 at 2:00 PM in Innovation Lab 304.',
      'Append-only versioned memory schema locked by Alex, Sarah, and Rahul.',
    ],
    chart: [
      { category: 'Deadlines', count: 3 },
      { category: 'Decisions', count: 2 },
      { category: 'Commitments', count: 5 },
      { category: 'Questions', count: 3 },
      { category: 'Events', count: 4 },
    ],
  },
  {
    id: '2026-W45',
    label: 'Nov 01 – Nov 07, 2026 (Previous)',
    highlights: [
      'Smart Campus 15-minute rolling calibration model finalized.',
      'Initial Project Rubric PDF uploaded and indexed.',
      'Smart Campus team roles split between Sarah (slides) and Alex (calibration notes).',
    ],
    chart: [
      { category: 'Deadlines', count: 1 },
      { category: 'Decisions', count: 2 },
      { category: 'Commitments', count: 3 },
      { category: 'Questions', count: 1 },
      { category: 'Events', count: 2 },
    ],
  },
];

export const WeeklyReflection: React.FC = () => {
  const { commitments, decisions, conflicts, predictions, projects, openMemoryDrawer } =
    useLivingMemory();
  const [weekId, setWeekId] = useState(WEEKS[0].id);

  const activeWeek = WEEKS.find((w) => w.id === weekId) || WEEKS[0];
  const completedCount = commitments.filter((c) => c.status === 'Completed').length;
  const pendingCount = commitments.filter((c) => c.status !== 'Completed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 08 · Weekly Reflection"
        title="Weekly Memory Reflection"
        subtitle="Review how plans shifted, which commitments closed, what decisions stuck, and where upcoming risks are forming."
        actions={
          <div className="flex flex-wrap gap-2">
            {WEEKS.map((w) => (
              <button
                key={w.id}
                onClick={() => setWeekId(w.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  weekId === w.id
                    ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Summary Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
          <div className="font-mono text-2xl font-semibold tabular-nums text-[var(--accent-sage)]">
            {completedCount}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">Completed Commitments</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
          <div className="font-mono text-2xl font-semibold tabular-nums text-[var(--accent-gold)]">
            {pendingCount}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">Open / Unconfirmed Promises</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
          <div className="font-mono text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
            {decisions.length}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">Key Decisions Logged</div>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
          <div className="font-mono text-2xl font-semibold tabular-nums text-[var(--status-warning)]">
            {conflicts.length}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">Schedule / Plan Shifts</div>
        </div>
      </div>

      {/* Highlights & Category Breakdown Chart */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Important Events & Changes This Week
          </h3>
          <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
            {activeWeek.highlights.map((h) => (
              <li
                key={h}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 text-[var(--text-primary)]"
              >
                {h}
              </li>
            ))}
          </ul>

          <h4 className="mt-5 text-xs font-semibold text-[var(--text-primary)]">
            Active Projects Snapshot
          </h4>
          <div className="mt-2 space-y-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">{p.name}</span>
                  <span className="text-[11px] text-[var(--accent-gold)]">{p.status}</span>
                </div>
                <p className="mt-1 text-[var(--text-secondary)]">
                  Next: {p.nextMilestone} ({p.nextMilestoneDate})
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="ws-card lg:col-span-6 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Captured Signals by Memory Category
          </h3>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeWeek.chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EAED" />
                <XAxis dataKey="category" tick={{ fill: '#5F6368', fontSize: 11 }} />
                <YAxis tick={{ fill: '#5F6368', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DADCE0',
                    color: '#202124',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Records" fill="#1A73E8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Decisions & Upcoming Risks */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Decisions Made</h3>
          <div className="mt-3 space-y-3">
            {decisions.map((d) => (
              <button
                key={d.id}
                onClick={() => openMemoryDrawer(d.linkedMemoryId)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5 text-left hover:bg-[var(--bg-elevated)]"
              >
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>{d.sourceName}</span>
                  <span className="font-mono">{d.date}</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-[var(--text-primary)]">{d.title}</div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Choice: {d.finalChoice}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Upcoming Risks & Follow-Up Signals
          </h3>
          <div className="mt-3 space-y-3">
            {predictions.map((pr) => (
              <div
                key={pr.id}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5"
              >
                <div className="text-[11px] font-medium text-[var(--status-warning)]">
                  Observed Pattern + Potential Risk
                </div>
                <div className="mt-1 text-xs font-semibold text-[var(--text-primary)]">
                  {pr.situation}
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{pr.potentialRisk}</p>
                <p className="mt-1.5 text-[11px] text-[var(--accent-sage)]">
                  Suggested prep: {pr.suggestedPreparation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
