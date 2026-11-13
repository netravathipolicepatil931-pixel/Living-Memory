import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, History, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';

const SNAPSHOTS = [
  {
    date: '2026-11-08',
    label: 'Nov 08, 2026',
    headline: 'Pre-deadline baseline state',
    assignmentDeadline: 'Not yet formally announced in chats (Syllabus Week 9 placeholder).',
    changedToday: ['Uploaded Smart Campus Calibration Notes (Oct 28 record indexed).'],
    newlyDiscovered: ['Smart Campus 15-minute rolling occupancy threshold locked.'],
    superseded: [],
    lastWeekSummary:
      'On Nov 08, no formal AI Systems Assignment deadline existed in your groups yet, and Smart Campus sensor calibration was your primary verified milestone.',
  },
  {
    date: '2026-11-10',
    label: 'Nov 10, 2026',
    headline: 'Initial deadline & architecture lock',
    assignmentDeadline: 'November 15, 2026 (Class Discussion WhatsApp export)',
    changedToday: [
      'Class Discussion posted Nov 15 as the initial AI Systems Assignment deadline.',
      'AI Project Team locked append-only versioned memory schema.',
    ],
    newlyDiscovered: ['Rahul & Sarah agreed never to overwrite superseded deadlines silently.'],
    superseded: [],
    lastWeekSummary:
      'On Nov 10, you believed the AI Systems Assignment was due on November 15, and your team had just locked the append-only memory schema.',
  },
  {
    date: '2026-11-11',
    label: 'Nov 11, 2026',
    headline: 'Professor Meera schedules Lab 304 review',
    assignmentDeadline: 'November 15, 2026 (unchanged as of Nov 11)',
    changedToday: ['Professor Meera emailed confirming Project Review for Nov 18, 2:00 PM in Lab 304.'],
    newlyDiscovered: ['10-minute live provenance walkthrough required for Project Review.'],
    superseded: [],
    lastWeekSummary:
      'On Nov 11, you knew the Project Review was set for Nov 18 in Lab 304, while the assignment deadline was still assumed to be Nov 15.',
  },
  {
    date: '2026-11-12',
    label: 'Nov 12, 2026',
    headline: 'Team discusses Nov 18 shift & sync moves',
    assignmentDeadline: 'November 18, 2026 (AI Project Team working estimate — superseded later)',
    changedToday: [
      'AI Project Team discussed moving assignment submission to Nov 18.',
      'Team Sync rescheduled to Nov 15 at 16:30 in Library Room B.',
      'Sarah committed to finishing presentation slides by Nov 16 evening.',
    ],
    newlyDiscovered: ['Rubric PDF Section 4 indicates 15% weight on citation latency benchmarks.'],
    superseded: ['Nov 15 initial assignment deadline marked superseded in favor of Nov 18 team note.'],
    lastWeekSummary:
      'On Nov 12, your team expected the assignment due date to be Nov 18, Library Room B sync was moved to Nov 15, and Sarah committed to slides by Nov 16.',
  },
  {
    date: '2026-11-13',
    label: 'Nov 13, 2026 (Current)',
    headline: 'Official extension to Nov 20 creates Calendar conflict',
    assignmentDeadline: 'November 20, 2026 at 23:59 (Official College Announcements & Gmail)',
    changedToday: [
      'Academic Office Gmail & College Announcements extended assignment deadline to Nov 20.',
      'Conflict detected: Google Calendar still holds stale Nov 15 reminder.',
    ],
    newlyDiscovered: ['Duplicate announcement notice detected between WhatsApp and Academic Office Gmail.'],
    superseded: ['Both Nov 15 (Class Discussion) and Nov 18 (Team estimate) superseded by Nov 20 official notice.'],
    lastWeekSummary:
      'By Nov 13, the authoritative assignment deadline officially became November 20, superseding both Nov 15 and Nov 18—while Google Calendar still needs manual cleanup.',
  },
];

export const TimeMachine: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { openMemoryDrawer } = useLivingMemory();
  const [index, setIndex] = useState(SNAPSHOTS.length - 1);
  const [tab, setTab] = useState<'changed' | 'discovered' | 'superseded'>('changed');
  const [promptAsked, setPromptAsked] = useState(false);

  const current = SNAPSHOTS[index];

  const items =
    tab === 'changed'
      ? current.changedToday
      : tab === 'discovered'
      ? current.newlyDiscovered
      : current.superseded;

  return (
    <div className="space-y-4">
      {!embedded ? (
        <PageHeader
          title="Inspect What You Knew on Any Date"
          subtitle="Rewind Living Memory to trace how assignment deadlines, meetings, and team decisions evolved day by day."
          actions={
            <button
              onClick={() => setPromptAsked(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1A73E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1765CC]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              “What did I know about this project last week?”
            </button>
          }
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-[#5F6368]">
            Rewind your personal memory graph day by day to inspect what changed and what was superseded.
          </div>
          <button
            onClick={() => setPromptAsked(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1A73E8] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1765CC]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            “What did I know last week?”
          </button>
        </div>
      )}

      {/* Slider & Date Stepper */}
      <div className="ws-card rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--pastel-blue)] text-[var(--ink-blue)]">
              <History className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                {current.label}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">{current.headline}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-[var(--text-primary)] disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev Day
            </button>
            <button
              onClick={() => setIndex((i) => Math.min(SNAPSHOTS.length - 1, i + 1))}
              disabled={index === SNAPSHOTS.length - 1}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-[var(--text-primary)] disabled:opacity-40"
            >
              Next Day
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div>
          <input
            type="range"
            min={0}
            max={SNAPSHOTS.length - 1}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            aria-label="Select historical snapshot date"
            className="w-full accent-[var(--accent-gold)] cursor-pointer"
          />
          <div className="mt-2 flex justify-between font-mono text-[11px] text-[var(--text-muted)]">
            {SNAPSHOTS.map((s, i) => (
              <button
                key={s.date}
                onClick={() => setIndex(i)}
                className={i === index ? 'font-semibold text-[var(--accent-gold)]' : ''}
              >
                {s.date.slice(5)}
              </button>
            ))}
          </div>
        </div>

        {/* Known State Highlight */}
        <div className="rounded-xl bg-[var(--nav-active-bg)] p-4">
          <div className="text-[11px] font-semibold text-[var(--accent-primary)]">
            Believed Assignment Deadline on {current.label}
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {current.assignmentDeadline}
          </div>
          <button
            onClick={() => openMemoryDrawer('mem-assignment-deadline')}
            className="mt-2 text-xs font-medium text-[var(--accent-primary)] hover:underline"
          >
            Inspect Full Deadline Evidence Chain
          </button>
        </div>
      </div>

      {promptAsked && (
        <div className="ws-card rounded-xl border-l-4 border-l-[var(--ink-lavender)] p-5">
          <div className="text-xs font-semibold text-[var(--ink-lavender)]">
            Historical Context Replay · {current.label}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-primary)]">
            {current.lastWeekSummary}
          </p>
        </div>
      )}

      {/* Snapshot Tabs */}
      <div className="ws-card rounded-xl p-5">
        <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-3">
          {(
            [
              { id: 'changed', label: `Changed (${current.changedToday.length})` },
              { id: 'discovered', label: `Newly Discovered (${current.newlyDiscovered.length})` },
              { id: 'superseded', label: `Superseded (${current.superseded.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ul className="mt-4 space-y-2.5 text-xs">
          {items.length === 0 ? (
            <li className="text-[var(--text-muted)]">
              No records in this bucket for {current.label}.
            </li>
          ) : (
            items.map((entry) => (
              <li
                key={entry}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5 text-[var(--text-primary)]"
              >
                {entry}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
