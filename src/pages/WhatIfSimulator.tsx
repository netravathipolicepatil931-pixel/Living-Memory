import React, { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';

type ScenarioMode =
  | 'deadline_shift'
  | 'meeting_cancelled'
  | 'teammate_unavailable'
  | 'decision_changed';

export const WhatIfSimulator: React.FC = () => {
  const [scenario, setScenario] = useState<ScenarioMode>('deadline_shift');
  const [shiftDays, setShiftDays] = useState<number>(3);
  const [unavailableMember, setUnavailableMember] = useState<'Sarah' | 'Rahul'>('Sarah');

  const simulation = useMemo(() => {
    if (scenario === 'deadline_shift') {
      const baseDate = 20 + shiftDays;
      const clampedDate = Math.max(15, Math.min(28, baseDate));
      const pressure =
        shiftDays < 0
          ? 'High Compression Risk'
          : shiftDays === 0
          ? 'Current Baseline (Nov 20)'
          : 'Increased Review Buffer';
      return {
        headline: `Assignment Submission Hypothetically Moved to Nov ${clampedDate}`,
        pressure,
        impacts: [
          shiftDays < 0
            ? 'Compresses testing window ahead of Nov 18 Lab 304 review; Sarah’s Nov 16 slide deadline becomes critical path.'
            : 'Adds rehearsal buffer between Nov 18 Project Review and final submission without changing Lab 304 review date.',
          'Google Calendar Demo invite (currently stale on Nov 15) would still require manual update.',
          'Rahul’s Docker verification log remains required before Nov 17 dry run.',
        ],
        action:
          shiftDays < 0
            ? 'Move team rehearsal earlier to Nov 15 evening and lock rubric citation tests.'
            : 'Use extra days for citation latency benchmark testing required by Rubric Section 4.',
      };
    }

    if (scenario === 'meeting_cancelled') {
      return {
        headline: 'Library Room B Team Sync (Nov 15) Cancelled',
        pressure: 'Alignment Gap Risk',
        impacts: [
          'Live architecture & slide dry-run sync moves exclusively to async WhatsApp/Gmail until Nov 17.',
          'Rahul’s Docker verification log must be shared in AI Project Team chat so Alex & Sarah can verify build readiness.',
          'Auditorium B dual-HDMI check for Smart Campus risks staying unanswered longer.',
        ],
        action: 'Confirm async checkpoint in AI Project Team by Nov 15 at 18:00.',
      };
    }

    if (scenario === 'teammate_unavailable') {
      return {
        headline: `${unavailableMember} Temporarily Unavailable (Nov 15–17)`,
        pressure: 'Single-Owner Bottleneck',
        impacts:
          unavailableMember === 'Sarah'
            ? [
                'AI Assistant presentation slides 1–10 (due Nov 16) lack a backup owner ahead of Nov 18 Lab 304 review.',
                'Smart Campus UX walkthrough slides (due Nov 22) also depend on Sarah.',
              ]
            : [
                'Docker ingestion test log (due Nov 14) and citation latency benchmark testing need backup coverage.',
                'Nov 18 live provenance walkthrough demo needs clean local build verification.',
              ],
        action:
          unavailableMember === 'Sarah'
            ? 'Share slide outline template in AI Project Team so Alex can draft slides 1–5 if needed.'
            : 'Request Rahul’s Dockerfile & test script link before Nov 14 evening.',
      };
    }

    return {
      headline: 'Hypothetical Change: Drop Append-Only Versioning Requirement',
      pressure: 'Core Demo Differentiation Loss',
      impacts: [
        'Invalidates Professor Meera’s requested 10-minute live provenance walkthrough for Nov 18 Lab 304 review.',
        'Nov 15 → Nov 18 → Nov 20 assignment timeline could no longer be audited historically.',
      ],
      action: 'Retain append-only versioning; adjust UI presentation scope instead if time-constrained.',
    };
  }, [scenario, shiftDays, unavailableMember]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 28 · What-If Simulator"
        title="Schedule & Dependency What-If Simulator"
        subtitle="Test hypothetical schedule shifts, cancelled meetings, or teammate unavailability safely without modifying stored memories."
        demoBanner="Simulated Hypothetical Outcome: Outputs below are scenario projections calculated locally and are NOT confirmed facts."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="ws-card lg:col-span-5 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <SlidersHorizontal className="h-4 w-4 text-[var(--accent-primary)]" />
            Configure Hypothetical Scenario
          </div>

          <div className="space-y-2">
            {(
              [
                { id: 'deadline_shift', label: 'Assignment Deadline Moves (+/- Days)' },
                { id: 'meeting_cancelled', label: 'Nov 15 Library Team Sync Cancelled' },
                { id: 'teammate_unavailable', label: 'Teammate Unavailable (Nov 15–17)' },
                { id: 'decision_changed', label: 'Architecture Decision Changed' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setScenario(opt.id)}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-left text-xs font-medium ${
                  scenario === opt.id
                    ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {scenario === 'deadline_shift' && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Shift relative to Nov 20</span>
                <span className="font-mono font-semibold text-[var(--accent-gold)]">
                  {shiftDays > 0 ? `+${shiftDays}` : shiftDays} days
                </span>
              </div>
              <input
                type="range"
                min={-5}
                max={7}
                value={shiftDays}
                onChange={(e) => setShiftDays(Number(e.target.value))}
                className="w-full accent-[var(--accent-gold)]"
              />
            </div>
          )}

          {scenario === 'teammate_unavailable' && (
            <div className="flex gap-2">
              {(['Sarah', 'Rahul'] as const).map((member) => (
                <button
                  key={member}
                  onClick={() => setUnavailableMember(member)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium ${
                    unavailableMember === member
                      ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {member}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ws-card lg:col-span-7 rounded-xl border-t-4 border-t-[var(--ink-lavender)] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="rounded-full bg-[var(--pastel-lavender)] px-2.5 py-0.5 font-semibold text-[var(--ink-lavender)]">
              Simulated Hypothetical Outcome
            </span>
            <span className="rounded-full bg-[var(--pastel-blue)] px-2.5 py-0.5 font-mono font-medium text-[var(--ink-blue)]">
              {simulation.pressure}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{simulation.headline}</h3>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--text-secondary)]">
              Projected Downstream Effects
            </div>
            {simulation.impacts.map((imp) => (
              <div
                key={imp}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-xs leading-relaxed text-[var(--text-primary)]"
              >
                {imp}
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-[var(--pastel-green)]/55 p-3.5 text-xs">
            <span className="font-semibold text-[var(--ink-green)]">
              Suggested Contingency Step:{' '}
            </span>
            <span className="text-[var(--text-primary)]">{simulation.action}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
