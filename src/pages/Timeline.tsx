import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, GitCommitHorizontal } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { SourceType } from '../types/memory';
import { getCategoryPastelClass, getSourcePastelClass } from '../utils/categoryColors';

export const Timeline: React.FC = () => {
  const { memories, openMemoryDrawer } = useLivingMemory();
  const [sortBy, setSortBy] = useState<'eventTime' | 'recordedTime'>('eventTime');
  const [sourceFilter, setSourceFilter] = useState<'All' | SourceType>('All');

  const ordered = useMemo(() => {
    return memories
      .filter((m) => m.verificationStatus !== 'Archived')
      .filter((m) => sourceFilter === 'All' || m.sourceType === sourceFilter)
      .slice()
      .sort((a, b) => {
        const keyA = sortBy === 'eventTime' ? a.eventTime : a.recordedTime;
        const keyB = sortBy === 'eventTime' ? b.eventTime : b.recordedTime;
        return keyB.localeCompare(keyA);
      });
  }, [memories, sortBy, sourceFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 13 · Memory Timeline"
        title="Chronological Memory Timeline"
        subtitle="Compare when events actually happen (Event Time) versus when Living Memory captured or updated them (Recorded Time)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSortBy('eventTime')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                sortBy === 'eventTime'
                  ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
              }`}
            >
              Sort by Event Time
            </button>
            <button
              onClick={() => setSortBy('recordedTime')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                sortBy === 'recordedTime'
                  ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
              }`}
            >
              Sort by Recorded Time
            </button>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
            >
              <option value="All">All Sources</option>
              <option value="WhatsApp Export">WhatsApp Export</option>
              <option value="Gmail">Gmail</option>
              <option value="Google Calendar">Google Calendar</option>
              <option value="PDF Document">PDF Document</option>
              <option value="Image">Image</option>
              <option value="Text File">Text File</option>
            </select>
          </div>
        }
      />

      <div className="relative space-y-4 before:absolute before:left-5 before:top-4 before:bottom-4 before:w-px before:bg-[var(--border-subtle)]">
        {ordered.map((m) => (
          <div key={m.id} className="relative pl-12">
            <div className="absolute left-3.5 top-5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--accent-gold)] bg-[var(--bg-primary)]">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)]" />
            </div>

            <div className="ws-card rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                  <span className="text-[var(--accent-primary)] font-medium">
                    <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
                    Event: {m.eventTime}
                  </span>
                  <span className="text-[var(--text-muted)]">·</span>
                  <span className="text-[var(--text-secondary)]">Recorded: {m.recordedTime}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getCategoryPastelClass(m.category)}`}>
                    {m.category}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getSourcePastelClass(m.sourceType)}`}>
                    {m.sourceType}
                  </span>
                </div>
              </div>

              <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)]">{m.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                {m.currentInformation}
              </p>

              {/* Version History Strip */}
              {m.versions.length > 0 && (
                <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-primary)]">
                    <GitCommitHorizontal className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                    Version History ({m.versions.length})
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {m.versions.map((v) => (
                      <div
                        key={v.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="text-[var(--text-secondary)]">
                          v{v.version}: {v.value} ({v.sourceName})
                        </span>
                        <span
                          className={`font-mono ${
                            v.status === 'Active' || v.status === 'Corrected'
                              ? 'text-[var(--status-success)]'
                              : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {v.status} · {v.recordedTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">{m.sourceName}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openMemoryDrawer(m.id)}
                    className="font-medium text-[var(--accent-gold)] hover:underline"
                  >
                    Inspect Evidence
                  </button>
                  <Link
                    to={`/memories/${m.id}`}
                    className="font-medium text-[var(--text-primary)] hover:underline"
                  >
                    Open Full Record
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
