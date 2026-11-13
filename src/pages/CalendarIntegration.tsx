import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, ExternalLink, MapPin, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { CalendarEventItem } from '../types/memory';

const WEEK_DAYS = [
  { date: '2026-11-15', short: 'SUN 15' },
  { date: '2026-11-16', short: 'MON 16' },
  { date: '2026-11-17', short: 'TUE 17' },
  { date: '2026-11-18', short: 'WED 18' },
  { date: '2026-11-19', short: 'THU 19' },
  { date: '2026-11-20', short: 'FRI 20' },
  { date: '2026-11-21', short: 'SAT 21' },
  { date: '2026-11-22', short: 'SUN 22' },
];

function getEventBlockStyle(ev: CalendarEventItem): string {
  if (ev.status === 'Conflicting') {
    return 'border-l-4 border-l-[#C5221F] bg-[#FCE8E6] text-[#202124]';
  }
  if (ev.status === 'Rescheduled') {
    return 'border-l-4 border-l-[#B06000] bg-[#FEF7E0] text-[#202124]';
  }
  if (ev.calendarName === 'Personal') {
    return 'border-l-4 border-l-[#7627BB] bg-[#F3E8FD] text-[#202124]';
  }
  return 'border-l-4 border-l-[#1967D2] bg-[#D2E3FC] text-[#202124]';
}

export const CalendarIntegration: React.FC = () => {
  const {
    calendarEvents,
    integrations,
    settings,
    updateSettings,
    syncIntegrationDemo,
    openMemoryDrawer,
  } = useLivingMemory();

  const [viewMode, setViewMode] = useState<'Week' | 'Month' | 'Agenda'>('Week');
  const [selectedEventId, setSelectedEventId] = useState(calendarEvents[0]?.id || '');

  const calState = integrations.find((i) => i.id === 'calendar');

  const toggleCalendar = (name: string) => {
    const next = settings.calendarSelected.includes(name)
      ? settings.calendarSelected.filter((c) => c !== name)
      : [...settings.calendarSelected, name];
    updateSettings({ calendarSelected: next });
  };

  const visibleEvents = calendarEvents.filter(
    (ev) =>
      settings.calendarSelected.length === 0 || settings.calendarSelected.includes(ev.calendarName)
  );

  const selectedEvent =
    visibleEvents.find((e) => e.id === selectedEventId) || visibleEvents[0] || calendarEvents[0];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 23 · Google Calendar Intelligence (Demo Mode)"
        title="Schedule Awareness & Stale Invite Detection"
        subtitle="Compare calendar blocks against newer Gmail notices and WhatsApp discussions to spot rescheduled meetings and stale deadlines."
        demoBanner="Demo Data — OAuth Not Connected. Calendar blocks reflect local sample fixtures for Alex."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-0.5">
              {(['Week', 'Month', 'Agenda'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === m
                      ? 'bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={() => syncIntegrationDemo('calendar')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              Refresh Demo
            </button>
          </div>
        }
      />

      {/* Calendar Selection & Status */}
      <div className="ws-card flex flex-wrap items-center justify-between gap-4 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-secondary)] mr-1">
            My Calendars ({calState?.status}):
          </span>
          {[
            { name: 'Academic', dot: 'bg-[#1967D2]' },
            { name: 'AI Project', dot: 'bg-[#137333]' },
            { name: 'Personal', dot: 'bg-[#7627BB]' },
          ].map((cal) => {
            const on = settings.calendarSelected.includes(cal.name);
            return (
              <button
                key={cal.name}
                onClick={() => toggleCalendar(cal.name)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  on
                    ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)]'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${cal.dot}`} aria-hidden="true" />
                {cal.name}
              </button>
            );
          })}
        </div>
        <span className="font-mono text-[11px] text-[var(--text-muted)]">
          Last refresh: {calState?.lastSynced}
        </span>
      </div>

      {/* Main Google Calendar-Inspired Layout */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          {viewMode === 'Week' && (
            <div className="ws-card overflow-hidden rounded-xl">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  November 15 – 22, 2026
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  Soft blocks highlight conflicts & rescheduled events
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-[var(--border-subtle)]">
                {WEEK_DAYS.map((day) => {
                  const dayEvents = visibleEvents.filter((e) => e.date === day.date);
                  return (
                    <div key={day.date} className="min-h-[140px] bg-[var(--bg-card)] p-3">
                      <div className="font-mono text-[11px] font-semibold text-[var(--text-secondary)]">
                        {day.short}
                      </div>
                      <div className="mt-2 space-y-2">
                        {dayEvents.length === 0 ? (
                          <div className="text-[11px] text-[var(--text-muted)] pt-2">
                            No blocks
                          </div>
                        ) : (
                          dayEvents.map((ev) => (
                            <button
                              key={ev.id}
                              onClick={() => setSelectedEventId(ev.id)}
                              className={`w-full rounded-md p-2 text-left transition-all ${getEventBlockStyle(
                                ev
                              )} ${
                                selectedEvent?.id === ev.id ? 'ring-2 ring-[#1A73E8]' : ''
                              }`}
                            >
                              <div className="text-xs font-semibold leading-snug">{ev.title}</div>
                              <div className="mt-0.5 font-mono text-[10px] text-[#5F6368]">
                                {ev.startTime}–{ev.endTime}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'Month' && (
            <div className="ws-card rounded-xl p-5">
              <div className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                November 2026 Schedule Highlights
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-[11px]">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="font-medium text-[var(--text-secondary)] pb-1">
                    {d}
                  </div>
                ))}
                {Array.from({ length: 14 }, (_, idx) => 10 + idx).map((dayNum) => {
                  const dateStr = `2026-11-${dayNum}`;
                  const dayEvents = visibleEvents.filter((e) => e.date === dateStr);
                  return (
                    <div
                      key={dayNum}
                      className="min-h-[76px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-1.5 text-left"
                    >
                      <div className="font-mono text-[10px] font-medium text-[var(--text-secondary)]">
                        Nov {dayNum}
                      </div>
                      {dayEvents.map((ev) => (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedEventId(ev.id)}
                          className={`mt-1 block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium ${getEventBlockStyle(
                            ev
                          )}`}
                        >
                          {ev.title}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agenda Event List */}
          <div className="space-y-2.5">
            {visibleEvents.map((ev) => (
              <button
                key={ev.id}
                onClick={() => setSelectedEventId(ev.id)}
                className={`ws-card w-full rounded-xl p-4 text-left transition-all ${getEventBlockStyle(
                  ev
                )} ${selectedEvent?.id === ev.id ? 'ring-2 ring-[#1A73E8]' : ''}`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-medium text-[#5F6368]">
                    {ev.date} · {ev.startTime}–{ev.endTime}
                  </span>
                  <span className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-[#202124]">
                    {ev.status}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-[#202124]">{ev.title}</div>
                <div className="mt-0.5 text-xs text-[#5F6368]">
                  {ev.calendarName} Calendar · {ev.location}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Event Inspector Panel */}
        {selectedEvent && (
          <div className="ws-card lg:col-span-4 rounded-xl p-5 space-y-4 h-fit">
            <div className="inline-flex items-center gap-2 rounded-md bg-[var(--pastel-blue)] px-2.5 py-1 text-xs font-medium text-[var(--ink-blue)]">
              <CalendarIcon className="h-3.5 w-3.5" />
              Event Details
            </div>

            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {selectedEvent.title}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-[var(--accent-primary)]">
                <Clock className="h-3.5 w-3.5" />
                {selectedEvent.date} · {selectedEvent.startTime}–{selectedEvent.endTime}
              </p>
            </div>

            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {selectedEvent.description}
            </p>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                <span className="text-[var(--text-primary)]">{selectedEvent.location}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Participants: </span>
                <span className="text-[var(--text-primary)]">
                  {selectedEvent.participants.join(', ')}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Status: </span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {selectedEvent.status}
                </span>
              </div>
            </div>

            <button
              onClick={() => openMemoryDrawer(selectedEvent.linkedMemoryId)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)]"
            >
              Inspect Linked Memory & Email
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
