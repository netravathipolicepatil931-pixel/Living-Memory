import React, { useState } from 'react';
import { ExternalLink, Mail, RefreshCw, ShieldCheck, Star } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { GmailItem } from '../types/memory';

const EMAIL_CATEGORIES: Array<'All' | GmailItem['category']> = [
  'All',
  'Deadlines',
  'Decisions',
  'Meeting details',
  'Promises',
  'Follow-up requests',
  'Important emails',
  'Changes in plans',
];

export const GmailIntegration: React.FC = () => {
  const {
    gmailItems,
    integrations,
    settings,
    updateSettings,
    syncIntegrationDemo,
    openMemoryDrawer,
  } = useLivingMemory();

  const [selectedId, setSelectedId] = useState(gmailItems[0]?.id || '');
  const [catFilter, setCatFilter] = useState<'All' | GmailItem['category']>('All');

  const gmailState = integrations.find((i) => i.id === 'gmail');

  const visibleEmails = gmailItems.filter((gm) => {
    if (settings.gmailLabels.length > 0 && !settings.gmailLabels.includes(gm.label)) {
      return false;
    }
    if (catFilter !== 'All' && gm.category !== catFilter) return false;
    return true;
  });

  const activeEmail =
    visibleEmails.find((e) => e.id === selectedId) || visibleEmails[0] || gmailItems[0];

  const toggleLabel = (label: string) => {
    const next = settings.gmailLabels.includes(label)
      ? settings.gmailLabels.filter((l) => l !== label)
      : [...settings.gmailLabels, label];
    updateSettings({ gmailLabels: next });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 22 · Gmail Intelligence (Demo Mode)"
        title="Gmail Thread Extraction & Read-Only Scope"
        subtitle="Inspect how faculty notices, review confirmations, and teammate follow-ups correlate with WhatsApp & Calendar."
        demoBanner="Demo Data — OAuth Not Connected. All emails shown are local sample data representing Alex's inbox."
        actions={
          <button
            onClick={() => syncIntegrationDemo('gmail')}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
            Simulate Demo Refresh
          </button>
        }
      />

      {/* Demo Status + Permission Controls */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="ws-card lg:col-span-5 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--pastel-red)] text-[var(--ink-red)]">
                <Mail className="h-4 w-4" />
              </span>
              {gmailState?.accountLabel}
            </span>
            <span className="rounded-md bg-[var(--pastel-green)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-green)]">
              {gmailState?.status}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Last demo refresh: {gmailState?.lastSynced}. Scope: Read-only selected labels; zero
            send/modify permissions.
          </p>
        </div>

        <div className="ws-card lg:col-span-7 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
            <ShieldCheck className="h-4 w-4 text-[var(--ink-green)]" />
            Read-Only Scope Filters
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {['Faculty', 'Project', 'Meetings', 'Follow-up'].map((lbl) => {
              const on = settings.gmailLabels.includes(lbl);
              return (
                <button
                  key={lbl}
                  onClick={() => toggleLabel(lbl)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    on
                      ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)]'
                  }`}
                >
                  Label: {lbl}
                </button>
              );
            })}
            <label className="ml-2 inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={settings.gmailExcludeSpamTrash}
                onChange={(e) => updateSettings({ gmailExcludeSpamTrash: e.target.checked })}
                className="accent-[var(--accent-primary)]"
              />
              Exclude Spam & Trash
            </label>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1.5">
        {EMAIL_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
              catFilter === c
                ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Master-Detail Email View */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-2.5">
          {visibleEmails.map((gm) => (
            <button
              key={gm.id}
              onClick={() => setSelectedId(gm.id)}
              className={`ws-card w-full rounded-xl p-4 text-left transition-colors ${
                activeEmail?.id === gm.id
                  ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)]'
                  : 'hover:bg-[var(--bg-primary)]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="rounded-md bg-[var(--pastel-red)] px-2 py-0.5 font-medium text-[var(--ink-red)]">
                  {gm.label} · {gm.category}
                </span>
                <span className="flex items-center gap-1 font-mono text-[var(--text-muted)]">
                  {gm.starred && <Star className="h-3 w-3 fill-[#B06000] text-[#B06000]" />}
                  {gm.date}
                </span>
              </div>
              <div className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
                {gm.subject}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{gm.from}</div>
              <p className="mt-1.5 line-clamp-2 text-xs text-[var(--text-secondary)]">
                {gm.preview}
              </p>
            </button>
          ))}
        </div>

        {activeEmail && (
          <div className="ws-card lg:col-span-7 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
              <div>
                <span className="inline-block rounded-md bg-[var(--pastel-red)] px-2 py-0.5 text-xs font-medium text-[var(--ink-red)]">
                  {activeEmail.category} · Label: {activeEmail.label}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {activeEmail.subject}
                </h3>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                  From: {activeEmail.from} ({activeEmail.fromEmail}) · {activeEmail.date}
                </div>
              </div>
              <button
                onClick={() => openMemoryDrawer(activeEmail.linkedMemoryId)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-gold)] px-3.5 py-2 text-xs font-semibold text-white shrink-0"
              >
                Inspect Extracted Memory
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-sm leading-relaxed text-[var(--text-primary)]">{activeEmail.body}</p>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-xs">
              <div className="font-semibold text-[var(--text-primary)]">
                Cross-Source Correlation
              </div>
              <p className="mt-1 text-[var(--text-secondary)]">
                This email thread is cross-linked with memory record{' '}
                <span className="font-mono text-[var(--accent-gold)]">
                  {activeEmail.linkedMemoryId}
                </span>
                {activeEmail.relatedCalendarEventId
                  ? ` and Google Calendar Demo event ${activeEmail.relatedCalendarEventId}.`
                  : '.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
