import React, { useState } from 'react';
import { ExternalLink, Users } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { getStatusPastelClass } from '../utils/categoryColors';

export const RelationshipIntelligence: React.FC = () => {
  const { entities, projects, groups, commitments, memories, openMemoryDrawer } =
    useLivingMemory();
  const [selectedPersonId, setSelectedPersonId] = useState(entities[0]?.id || '');

  const person = entities.find((e) => e.id === selectedPersonId) || entities[0];

  const personProjects = projects.filter((p) => person?.projectIds.includes(p.id));
  const personGroups = groups.filter((g) => person?.relatedGroupIds.includes(g.id));
  const personMemories = memories.filter((m) =>
    person ? m.relatedPeopleIds.includes(person.id) : false
  );
  const personCommitments = commitments.filter((c) => c.owner === person?.name);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 30 · Relationship Intelligence"
        title="People, Shared Projects & Collaboration History"
        subtitle="Inspect verified interactions, shared groups, and active commitments across collaborators without speculative personality profiling."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 space-y-2.5">
          {entities.map((ent) => (
            <button
              key={ent.id}
              onClick={() => setSelectedPersonId(ent.id)}
              className={`ws-card flex w-full items-center gap-3 rounded-xl p-4 text-left transition-all ${
                person?.id === ent.id
                  ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/20 bg-[var(--nav-active-bg)]'
                  : 'hover:shadow-md'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pastel-purple)] font-mono text-xs font-semibold text-[var(--ink-purple)]">
                {ent.avatarInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {ent.name}
                </div>
                <div className="truncate text-xs text-[var(--text-secondary)]">{ent.role}</div>
              </div>
              <span className="font-mono text-xs text-[var(--text-muted)]">
                {ent.collaborationCount} links
              </span>
            </button>
          ))}
        </div>

        {person && (
          <div className="ws-card lg:col-span-8 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pastel-purple)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink-purple)]">
                  <Users className="h-3.5 w-3.5" />
                  {person.confidenceLabel} · {person.organization}
                </div>
                <h3 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                  {person.name}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">{person.role}</p>
              </div>
              <div className="text-right text-xs text-[var(--text-muted)]">
                Recent: {person.recentInteraction}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 text-xs">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                <div className="font-semibold text-[var(--text-primary)]">Shared Projects</div>
                <ul className="mt-2 space-y-1 text-[var(--text-secondary)]">
                  {personProjects.map((p) => (
                    <li key={p.id}>
                      {p.name} ({p.status})
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                <div className="font-semibold text-[var(--text-primary)]">
                  Verified Responsibilities
                </div>
                <ul className="mt-2 list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
                  {person.responsibilities.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-xs text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">Active Groups: </span>
              {personGroups.map((g) => g.name).join(' · ') || 'Faculty Email / Direct'}
            </div>

            {/* Commitments & Linked Memories */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                  Tracked Promises ({personCommitments.length})
                </h4>
                <div className="mt-2 space-y-2">
                  {personCommitments.length === 0 ? (
                    <div className="text-xs text-[var(--text-muted)]">
                      No direct promises logged for this collaborator.
                    </div>
                  ) : (
                    personCommitments.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-xs"
                      >
                        <div className="font-medium text-[var(--text-primary)]">{c.title}</div>
                        <div className="mt-1 flex items-center gap-2 text-[11px]">
                          <span className={`rounded-full px-2 py-0.5 font-medium ${getStatusPastelClass(c.status)}`}>
                            {c.status}
                          </span>
                          <span className="text-[var(--text-muted)]">Due {c.dueDate}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                  Connected Memories ({personMemories.length})
                </h4>
                <div className="mt-2 space-y-2">
                  {personMemories.slice(0, 4).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => openMemoryDrawer(m.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-left text-xs hover:bg-[var(--nav-active-bg)] transition-colors"
                    >
                      <span className="truncate font-medium text-[var(--text-primary)]">
                        {m.title}
                      </span>
                      <ExternalLink className="ml-2 h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
