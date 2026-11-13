import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, GitBranch, Mail, MessageSquareText, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { getCategoryPastelClass, getSourcePastelClass, getStatusPastelClass } from '../utils/categoryColors';

const DATES = [
  { id: '2026-11-13', label: 'Nov 13, 2026 (Today)' },
  { id: '2026-11-12', label: 'Nov 12, 2026' },
  { id: '2026-11-11', label: 'Nov 11, 2026' },
];

export const DailyBriefing: React.FC = () => {
  const {
    memories,
    gmailItems,
    calendarEvents,
    groupMessages,
    commitments,
    entities,
    crossGroups,
    openMemoryDrawer,
  } = useLivingMemory();
  const [selectedDate, setSelectedDate] = useState('2026-11-13');

  const changedOnDate = memories.filter(
    (m) => m.lastUpdated.startsWith(selectedDate) || m.recordedTime.startsWith(selectedDate)
  );
  const emailsOnDate = gmailItems.filter((g) => g.date.startsWith(selectedDate));
  const messagesOnDate = groupMessages.filter((m) => m.timestamp.startsWith(selectedDate));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 07 · Daily Briefing"
        title="Morning Context Briefing"
        subtitle="A structured daily synthesis across your WhatsApp exports, Gmail demo threads, Calendar events, and team promises."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {DATES.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDate(d.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                  selectedDate === d.id
                    ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        }
      />

      {/* What changed today */}
      <div className="ws-card rounded-xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            What Changed ({selectedDate})
          </h3>
          <span className="rounded-full bg-[var(--nav-active-bg)] px-2.5 py-0.5 font-mono text-xs font-medium text-[var(--accent-primary)]">
            {changedOnDate.length} updated memories
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(changedOnDate.length > 0 ? changedOnDate : memories.slice(0, 2)).map((m) => (
            <button
              key={m.id}
              onClick={() => openMemoryDrawer(m.id)}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 text-left transition-colors hover:bg-[var(--bg-secondary)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${getCategoryPastelClass(m.category)}`}>
                    {m.category}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-medium ${getSourcePastelClass(m.sourceType)}`}>
                    {m.sourceType}
                  </span>
                </div>
                <span className={`rounded-full px-2 py-0.5 font-medium ${getStatusPastelClass(m.verificationStatus)}`}>
                  {m.verificationStatus}
                </span>
              </div>
              <div className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
                {m.title}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                {m.currentInformation}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 3-Source Breakdown: Gmail, Calendar, WhatsApp */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="ws-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--pastel-red)] text-[var(--ink-red)]">
                <Mail className="h-4 w-4" />
              </span>
              From Gmail (Demo)
            </span>
            <Link to="/integrations/gmail" className="text-xs font-medium text-[var(--accent-primary)] hover:underline">
              Open
            </Link>
          </div>
          <div className="mt-3 space-y-2.5">
            {(emailsOnDate.length > 0 ? emailsOnDate : gmailItems.slice(0, 2)).map((gm) => (
              <div
                key={gm.id}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3"
              >
                <div className="text-xs font-medium text-[var(--text-primary)]">{gm.subject}</div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {gm.from} · {gm.date}
                </div>
                <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{gm.preview}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="ws-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--pastel-blue)] text-[var(--ink-blue)]">
                <Calendar className="h-4 w-4" />
              </span>
              From Google Calendar (Demo)
            </span>
            <Link
              to="/integrations/calendar"
              className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
            >
              Open
            </Link>
          </div>
          <div className="mt-3 space-y-2.5">
            {calendarEvents.map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-[var(--border-subtle)] border-l-[3px] border-l-[var(--ink-blue)] bg-[var(--bg-primary)] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{ev.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusPastelClass(ev.status)}`}>
                    {ev.status}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {ev.date} · {ev.startTime}–{ev.endTime} · {ev.location}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ws-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--pastel-green)] text-[var(--ink-green)]">
                <MessageSquareText className="h-4 w-4" />
              </span>
              From WhatsApp Exports
            </span>
            <Link
              to="/groups/intelligence"
              className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
            >
              Open
            </Link>
          </div>
          <div className="mt-3 space-y-2.5">
            {(messagesOnDate.length > 0 ? messagesOnDate : groupMessages.slice(0, 3)).map((msg) => (
              <div
                key={msg.id}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3"
              >
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>{msg.sender}</span>
                  <span>{msg.bucket}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deadlines + Tasks + People + Cross-Source */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ws-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Upcoming Deadlines & Tasks Requiring Attention
          </h3>
          <div className="mt-3 space-y-2.5">
            {commitments.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3"
              >
                <div>
                  <div className="text-xs font-medium text-[var(--text-primary)]">{c.title}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                    Owner: {c.owner} · Due {c.dueDate}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${getStatusPastelClass(c.status)}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="ws-card rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              People Updates & Cross-Source Intelligence
            </h3>
            <div className="mt-3 space-y-2">
              {entities.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-medium text-[var(--text-primary)]">{p.name}</span>
                    <span className="text-[var(--text-muted)]"> · {p.role}</span>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)] truncate max-w-[200px]">
                    {p.recentInteraction}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {crossGroups[0] && (
            <div className="rounded-xl bg-[var(--pastel-lavender)]/60 border border-[var(--border-subtle)] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-lavender)]">
                <GitBranch className="h-3.5 w-3.5" />
                {crossGroups[0].topic}
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {crossGroups[0].whyConnected}
              </p>
              <Link
                to="/ask"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-gold)] hover:underline"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Ask follow-up question
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
