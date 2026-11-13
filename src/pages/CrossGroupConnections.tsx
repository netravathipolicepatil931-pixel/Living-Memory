import React from 'react';
import { ArrowRight, ExternalLink, GitBranch } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';

export const CrossGroupConnections: React.FC = () => {
  const { crossGroups, groups, openMemoryDrawer } = useLivingMemory();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 21 · Cross-Group Connections"
        title="Cross-Group & Cross-Source Correlation"
        subtitle="See how scattered updates across Class Discussion, AI Project Team, College Announcements, and Gmail form one timeline."
      />

      <div className="space-y-5">
        {crossGroups.map((cg) => {
          const groupNames = cg.groupIds
            .map((id) => groups.find((g) => g.id === id)?.name || id)
            .join(' · ');

          return (
            <div
              key={cg.id}
              className="ws-card rounded-xl p-6 space-y-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pastel-lavender)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink-lavender)]">
                    <GitBranch className="h-3.5 w-3.5" />
                    Connected Across: {groupNames}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {cg.topic}
                  </h3>
                </div>
                <button
                  onClick={() => openMemoryDrawer(cg.linkedMemoryId)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)] shrink-0"
                >
                  Open Memory Evidence
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Original -> New -> Latest Authoritative */}
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">
                    Original Info · {cg.originalInfo.timestamp}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[var(--accent-primary)]">
                    {cg.originalInfo.source}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {cg.originalInfo.text}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">
                    Follow-Up Shift · {cg.newInfo.timestamp}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[var(--ink-lavender)]">
                    {cg.newInfo.source}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {cg.newInfo.text}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--ink-green)]/30 bg-[var(--pastel-green)]/45 p-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink-green)]">
                    <ArrowRight className="h-3.5 w-3.5" />
                    Latest Authoritative Information
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-[var(--text-primary)]">
                    {cg.latestAuthoritativeInfo}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-xs">
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5">
                  <span className="font-semibold text-[var(--text-primary)]">What changed: </span>
                  <span className="text-[var(--text-secondary)]">{cg.whatChanged}</span>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5">
                  <span className="font-semibold text-[var(--text-primary)]">
                    Why Living Memory connected this:{' '}
                  </span>
                  <span className="text-[var(--text-secondary)]">{cg.whyConnected}</span>
                </div>
              </div>

              <div className="text-[11px] text-[var(--text-muted)]">
                People involved: {cg.peopleInvolved.join(' · ')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
