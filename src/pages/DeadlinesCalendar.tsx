import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  GitCommitHorizontal,
  Plus,
  Radar,
  RefreshCw,
} from 'lucide-react';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { UnifiedDeadline } from '../types/memory';
import { getImportancePastelClass, getStatusPastelClass } from '../utils/categoryColors';

function originBadgeClass(kind: UnifiedDeadline['originKind']): string {
  if (kind === 'Google Calendar') return 'bg-[#D2E3FC] text-[#1967D2]';
  if (kind === 'User Reminder') return 'bg-[#EDE7F6] text-[#5E35B1]';
  return 'bg-[#FEF7E0] text-[#B06000]';
}

export const DeadlinesCalendar: React.FC = () => {
  const {
    deadlines,
    impacts,
    googleSession,
    syncingCalendar,
    settings,
    connectGoogleWorkspace,
    syncRealCalendar,
    confirmDeadlineDate,
    toggleDeadlineComplete,
    addUserReminder,
    openMemoryDrawer,
  } = useLivingMemory();

  const [viewMode, setViewMode] = useState<'Agenda' | 'Week' | 'Month'>('Agenda');
  const [selectedId, setSelectedId] = useState<string>(deadlines[0]?.id || '');
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [remTitle, setRemTitle] = useState('');
  const [remDate, setRemDate] = useState(new Date().toISOString().slice(0, 10));
  const [remTime, setRemTime] = useState('17:00');
  const [remNote, setRemNote] = useState('');

  // Confirm ambiguous deadline state
  const [confirmDates, setConfirmDates] = useState<Record<string, string>>({});

  // Reference "today" anchored cleanly for demo items + live items
  const todayIso = useMemo(() => {
    const hasLive = deadlines.some((d) => d.dataOrigin === 'Live' && d.date);
    return hasLive ? new Date().toISOString().slice(0, 10) : '2026-11-13';
  }, [deadlines]);

  const tomorrowIso = useMemo(() => {
    const dt = new Date(`${todayIso}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() + 1);
    return dt.toISOString().slice(0, 10);
  }, [todayIso]);

  const weekEndIso = useMemo(() => {
    const dt = new Date(`${todayIso}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() + 7);
    return dt.toISOString().slice(0, 10);
  }, [todayIso]);

  const sections = useMemo(() => {
    const needsConfirm: UnifiedDeadline[] = [];
    const overdue: UnifiedDeadline[] = [];
    const today: UnifiedDeadline[] = [];
    const tomorrow: UnifiedDeadline[] = [];
    const thisWeek: UnifiedDeadline[] = [];
    const later: UnifiedDeadline[] = [];
    const completed: UnifiedDeadline[] = [];

    const sorted = [...deadlines].sort((a, b) =>
      (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99')
    );

    for (const d of sorted) {
      if (d.status === 'Completed') {
        completed.push(d);
      } else if (d.status === 'Needs Confirmation' || !d.date) {
        needsConfirm.push(d);
      } else if (d.date < todayIso) {
        overdue.push(d);
      } else if (d.date === todayIso) {
        today.push(d);
      } else if (d.date === tomorrowIso) {
        tomorrow.push(d);
      } else if (d.date <= weekEndIso) {
        thisWeek.push(d);
      } else {
        later.push(d);
      }
    }

    return [
      { key: 'confirm', label: 'Needs Date Confirmation', items: needsConfirm },
      { key: 'overdue', label: 'Overdue', items: overdue },
      { key: 'today', label: 'Today', items: today },
      { key: 'tomorrow', label: 'Tomorrow', items: tomorrow },
      { key: 'week', label: 'This week', items: thisWeek },
      { key: 'later', label: 'Later', items: later },
      { key: 'completed', label: 'Completed', items: completed },
    ];
  }, [deadlines, todayIso, tomorrowIso, weekEndIso]);

  const selectedDeadline = deadlines.find((d) => d.id === selectedId) || deadlines[0];
  const relatedImpact = selectedDeadline?.linkedMemoryId
    ? impacts.find((imp) => imp.linkedMemoryId === selectedDeadline.linkedMemoryId)
    : undefined;

  // Compute week days starting from todayIso
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(`${todayIso}T00:00:00Z`);
      dt.setUTCDate(dt.getUTCDate() + i);
      const iso = dt.toISOString().slice(0, 10);
      const label = dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      return { iso, label };
    });
  }, [todayIso]);

  // Month grid cells for current month of todayIso
  const monthGrid = useMemo(() => {
    const [y, m] = todayIso.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      const iso = `${y}-${String(m).padStart(2, '0')}-${day}`;
      return { day: i + 1, iso };
    });
  }, [todayIso]);

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim() || !remDate) return;
    addUserReminder(remTitle, remDate, remTime, remNote);
    setRemTitle('');
    setRemNote('');
    setShowAddReminder(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deadlines & Calendar"
        subtitle="Unified view of Google Calendar events (read-only), AI-extracted deadlines from all sources, and your personal reminders."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#DADCE0] bg-[#FFFFFF] p-0.5">
              {(['Agenda', 'Week', 'Month'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === m
                      ? 'bg-[#E8F0FE] text-[#1A73E8]'
                      : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddReminder((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-2 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA]"
            >
              <Plus className="h-3.5 w-3.5 text-[#1A73E8]" />
              Add Reminder
            </button>

            {googleSession.connected ? (
              <button
                onClick={() => syncRealCalendar()}
                disabled={syncingCalendar}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1765CC]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncingCalendar ? 'animate-spin' : ''}`} />
                Sync Calendar
              </button>
            ) : (
              <GoogleSignInButton
                onClick={() => connectGoogleWorkspace().catch(() => {})}
                label="Sync Google Calendar"
              />
            )}
          </div>
        }
      />

      {/* Legend + Timezone */}
      <div className="ws-card flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#5F6368] font-medium">Source types:</span>
          <span className="rounded-md bg-[#D2E3FC] px-2 py-0.5 font-medium text-[#1967D2]">
            Google Calendar (Read-Only)
          </span>
          <span className="rounded-md bg-[#FEF7E0] px-2 py-0.5 font-medium text-[#B06000]">
            AI-Extracted Deadline
          </span>
          <span className="rounded-md bg-[#EDE7F6] px-2 py-0.5 font-medium text-[#5E35B1]">
            User Reminder
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#80868B]">
          Timezone: {settings.userTimezone}
        </span>
      </div>

      {/* Add User Reminder Drawer/Form */}
      {showAddReminder && (
        <form
          onSubmit={handleAddReminder}
          className="ws-card rounded-xl p-5 grid gap-3 sm:grid-cols-12 items-end"
        >
          <div className="sm:col-span-4">
            <label className="block text-xs font-medium text-[#5F6368]">Reminder Title</label>
            <input
              type="text"
              value={remTitle}
              onChange={(e) => setRemTitle(e.target.value)}
              placeholder="e.g., Submit lab fee receipt"
              required
              className="mt-1 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 text-xs text-[#202124]"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-[#5F6368]">Date</label>
            <input
              type="date"
              value={remDate}
              onChange={(e) => setRemDate(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 text-xs text-[#202124]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#5F6368]">Time</label>
            <input
              type="time"
              value={remTime}
              onChange={(e) => setRemTime(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2 text-xs text-[#202124]"
            />
          </div>
          <div className="sm:col-span-3 flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-[#1A73E8] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1765CC]"
            >
              Save Reminder
            </button>
            <button
              type="button"
              onClick={() => setShowAddReminder(false)}
              className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#5F6368]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Deadline & Calendar Area */}
        <div className="lg:col-span-8 space-y-5">
          {viewMode === 'Week' && (
            <div className="ws-card overflow-hidden rounded-xl">
              <div className="border-b border-[#DADCE0] px-5 py-3 text-sm font-semibold text-[#202124]">
                7-Day Schedule ({todayIso} to {weekDays[6]?.iso})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 divide-x divide-y divide-[#DADCE0]">
                {weekDays.map((day) => {
                  const items = deadlines.filter((d) => d.date === day.iso);
                  return (
                    <div key={day.iso} className="min-h-[140px] bg-[#FFFFFF] p-2.5">
                      <div className="font-mono text-[11px] font-semibold text-[#5F6368]">
                        {day.label}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setSelectedId(item.id)}
                            className={`w-full rounded-md p-1.5 text-left text-[11px] transition-all ${originBadgeClass(
                              item.originKind
                            )} ${selectedDeadline?.id === item.id ? 'ring-2 ring-[#1A73E8]' : ''}`}
                          >
                            <div className="font-semibold line-clamp-2">{item.title}</div>
                            <div className="mt-0.5 font-mono text-[10px] opacity-80">
                              {item.time}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'Month' && (
            <div className="ws-card rounded-xl p-5">
              <div className="text-sm font-semibold text-[#202124] mb-3">
                Monthly Calendar ({todayIso.slice(0, 7)})
              </div>
              <div className="grid grid-cols-7 gap-2">
                {monthGrid.map((cell) => {
                  const items = deadlines.filter((d) => d.date === cell.iso);
                  return (
                    <div
                      key={cell.iso}
                      className={`min-h-[80px] rounded-lg border p-1.5 ${
                        cell.iso === todayIso
                          ? 'border-[#1A73E8] bg-[#E8F0FE]/30'
                          : 'border-[#DADCE0] bg-[#FFFFFF]'
                      }`}
                    >
                      <div className="font-mono text-[10px] font-semibold text-[#5F6368]">
                        {cell.day}
                      </div>
                      <div className="mt-1 space-y-1">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setSelectedId(item.id)}
                            className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${originBadgeClass(
                              item.originKind
                            )}`}
                          >
                            {item.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unified Chronological Deadline Sections */}
          <div className="space-y-4">
            {sections
              .filter((sec) => sec.items.length > 0)
              .map((sec) => (
                <div key={sec.key} className="ws-card rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[#202124]">{sec.label}</h2>
                    <span className="rounded-full bg-[#F1F3F4] px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-[#5F6368]">
                      {sec.items.length}
                    </span>
                  </div>

                  <div className="divide-y divide-[#DADCE0]">
                    {sec.items.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setSelectedId(d.id)}
                        className={`cursor-pointer py-3 first:pt-0 last:pb-0 transition-colors ${
                          selectedDeadline?.id === d.id ? 'bg-[#E8F0FE]/30 -mx-2 px-2 rounded-lg' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDeadlineComplete(d.id);
                              }}
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                d.status === 'Completed'
                                  ? 'border-[#137333] bg-[#137333] text-white'
                                  : 'border-[#DADCE0] bg-[#FFFFFF]'
                              }`}
                              aria-label="Toggle completed"
                            >
                              {d.status === 'Completed' && <CheckCircle2 className="h-3 w-3" />}
                            </button>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className={`rounded px-1.5 py-0.5 font-medium ${originBadgeClass(d.originKind)}`}>
                                  {d.originKind}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.5 font-mono font-medium ${getImportancePastelClass(
                                    d.importanceCategory
                                  )}`}
                                >
                                  {d.importanceCategory} ({d.importanceScore})
                                </span>
                                <span className="font-mono text-[#5F6368]">
                                  {d.date || 'Unconfirmed'} · {d.time}
                                </span>
                              </div>
                              <div
                                className={`mt-1 text-sm font-semibold ${
                                  d.status === 'Completed'
                                    ? 'line-through text-[#80868B]'
                                    : 'text-[#202124]'
                                }`}
                              >
                                {d.title}
                              </div>
                              <div className="mt-0.5 text-xs text-[#5F6368]">
                                Source: {d.sourceName}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${getStatusPastelClass(
                              d.status
                            )}`}
                          >
                            {d.status}
                          </span>
                        </div>

                        {/* Inline Date Confirmation when ambiguous */}
                        {d.status === 'Needs Confirmation' && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-[#DADCE0] bg-[#FEF7E0]/60 p-2.5 text-xs"
                          >
                            <span className="text-[#B06000]">
                              {d.confirmationPrompt || 'Confirm exact due date:'}
                            </span>
                            <input
                              type="date"
                              value={confirmDates[d.id] || todayIso}
                              onChange={(e) =>
                                setConfirmDates((prev) => ({ ...prev, [d.id]: e.target.value }))
                              }
                              className="rounded border border-[#DADCE0] bg-[#FFFFFF] px-2 py-1 text-xs"
                            />
                            <button
                              onClick={() =>
                                confirmDeadlineDate(d.id, confirmDates[d.id] || todayIso)
                              }
                              className="rounded bg-[#1A73E8] px-2.5 py-1 text-xs font-medium text-white"
                            >
                              Confirm Date
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right Detail Panel: Evidence + History + Impact Analysis */}
        {selectedDeadline && (
          <div className="lg:col-span-4 space-y-4">
            <div className="ws-card rounded-xl p-5 space-y-4 sticky top-24">
              <div className="flex items-center justify-between">
                <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${originBadgeClass(selectedDeadline.originKind)}`}>
                  <CalendarIcon className="mr-1 inline h-3.5 w-3.5" />
                  {selectedDeadline.originKind}
                </span>
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getStatusPastelClass(selectedDeadline.status)}`}>
                  {selectedDeadline.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-semibold text-[#202124]">
                  {selectedDeadline.title}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-[#1A73E8]">
                  <Clock className="h-3.5 w-3.5" />
                  {selectedDeadline.date || 'Needs Confirmation'} · {selectedDeadline.time} ({selectedDeadline.timezone})
                </p>
              </div>

              <div className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-3.5 text-xs space-y-1.5">
                <div className="font-semibold text-[#202124]">Supporting Evidence</div>
                <p className="italic text-[#5F6368]">“{selectedDeadline.supportingEvidence}”</p>
                <div className="text-[11px] text-[#80868B]">
                  Source: {selectedDeadline.sourceName} · Confidence: {selectedDeadline.confidence} (
                  {selectedDeadline.isExplicit ? 'Explicit date' : 'Resolved relative date'})
                </div>
              </div>

              {/* Deadline Change History */}
              {selectedDeadline.history && selectedDeadline.history.length > 0 && (
                <div className="space-y-2 text-xs">
                  <div className="font-semibold text-[#202124]">Deadline Version History</div>
                  {selectedDeadline.history.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] p-2.5"
                    >
                      <GitCommitHorizontal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1A73E8]" />
                      <div>
                        <div className="font-mono font-semibold text-[#202124]">{h.date}</div>
                        <div className="text-[#5F6368]">{h.note}</div>
                        <div className="text-[10px] text-[#80868B]">{h.source}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Embedded Impact Analysis */}
              {relatedImpact && (
                <div className="rounded-xl border border-[#DADCE0] bg-[#FEF7E0]/45 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-[#B06000]">
                    <Radar className="h-3.5 w-3.5" />
                    Impact Analysis
                  </div>
                  <p className="text-[#5F6368]">{relatedImpact.triggerChange}</p>
                  <div className="space-y-1.5">
                    {relatedImpact.effects.map((ef) => (
                      <div key={ef.id} className="rounded-lg bg-[#FFFFFF] border border-[#DADCE0] p-2.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[#202124]">{ef.targetTitle}</span>
                          <span className="font-mono text-[#B06000]">{ef.severity}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#5F6368]">{ef.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDeadline.linkedMemoryId && (
                <button
                  onClick={() => openMemoryDrawer(selectedDeadline.linkedMemoryId!)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#1A73E8] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1765CC]"
                >
                  Open Connected Memory
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
