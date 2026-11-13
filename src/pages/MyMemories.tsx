import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  Compass,
  FileText,
  History,
  Layers,
  Network,
  Scale,
  Search,
  Sparkles,
  UserCircle,
  Users,
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { MemoryGraph } from './MemoryGraph';
import { TimeMachine } from './TimeMachine';
import { memoryService } from '../services/memoryService';
import { MemoryCategory, SourceType } from '../types/memory';
import {
  getCategoryPastelClass,
  getImportancePastelClass,
  getSourcePastelClass,
  getStatusPastelClass,
} from '../utils/categoryColors';

type MemoryTab = 'memories' | 'people' | 'projects' | 'decisions' | 'commitments' | 'history';
type HistorySubView = 'timeline' | 'graph' | 'time-machine' | 'recovery' | 'profile';

const MEMORY_TABS: Array<{ id: MemoryTab; label: string }> = [
  { id: 'memories', label: 'Important memories' },
  { id: 'people', label: 'People' },
  { id: 'projects', label: 'Projects' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'commitments', label: 'Commitments' },
  { id: 'history', label: 'History' },
];

const CATEGORIES: Array<'All' | MemoryCategory> = [
  'All',
  'Deadlines',
  'Decisions',
  'Commitments',
  'Tasks',
  'Events',
  'Announcements',
  'Questions',
  'Important conversations',
];

const SOURCE_TYPES: Array<'All' | SourceType> = [
  'All',
  'Gmail',
  'WhatsApp Export',
  'WhatsApp ZIP',
  'Google Calendar',
  'Image',
  'Audio',
  'Video',
  'PDF Document',
  'DOCX Document',
  'Text File',
];

export const MyMemories: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as MemoryTab | null;
  const urlSub = searchParams.get('view') as HistorySubView | null;

  const [activeTab, setActiveTab] = useState<MemoryTab>(
    urlTab && MEMORY_TABS.some((t) => t.id === urlTab) ? urlTab : 'memories'
  );
  const [historySub, setHistorySub] = useState<HistorySubView>(
    urlSub && ['timeline', 'graph', 'time-machine', 'recovery', 'profile'].includes(urlSub)
      ? urlSub
      : 'timeline'
  );

  useEffect(() => {
    if (urlTab && MEMORY_TABS.some((t) => t.id === urlTab)) {
      setActiveTab(urlTab);
    }
    if (urlSub && ['timeline', 'graph', 'time-machine', 'recovery', 'profile'].includes(urlSub)) {
      setHistorySub(urlSub);
    }
  }, [urlTab, urlSub]);

  const {
    memories,
    entities,
    projects,
    decisions,
    commitments,
    forgottenContext,
    contextProfile,
    globalSearch,
    setGlobalSearch,
    openMemoryDrawer,
    verifyMemory,
    mergeMemory,
    updateCommitmentStatus,
    removeProfileItem,
    pushToast,
  } = useLivingMemory();

  const [category, setCategory] = useState<'All' | MemoryCategory>('All');
  const [sourceType, setSourceType] = useState<'All' | SourceType>('All');
  const [onlyHealthIssues, setOnlyHealthIssues] = useState(false);
  const [handoverProjectId, setHandoverProjectId] = useState<string | null>(null);

  const selectTab = (tab: MemoryTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'memories' ? {} : { tab });
  };

  const filteredMemories = useMemo(() => {
    const base = memoryService.filterMemories(memories, {
      query: globalSearch,
      category,
      sourceType,
    });
    const next = onlyHealthIssues ? base.filter((m) => Boolean(m.healthIssue)) : base;
    return [...next].sort((a, b) => (b.importanceScore ?? 60) - (a.importanceScore ?? 60));
  }, [memories, globalSearch, category, sourceType, onlyHealthIssues]);

  const healthCount = memories.filter(
    (m) => m.verificationStatus !== 'Archived' && Boolean(m.healthIssue)
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Memories"
        subtitle="Explore important remembered details, people, projects, decisions, commitments, and historical context."
      />

      {/* 6 Contextual Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-[#DADCE0] pb-3">
        {MEMORY_TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8]/30'
                  : 'border border-[#DADCE0] bg-[#FFFFFF] text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: IMPORTANT MEMORIES */}
      {activeTab === 'memories' && (
        <div className="space-y-4">
          <div className="ws-card rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#80868B]" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search memories, evidence, or source names..."
                  className="w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] py-2 pl-9 pr-3 text-xs text-[#202124] focus:border-[#1A73E8] focus:bg-[#FFFFFF] focus:outline-none"
                />
              </div>

              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as typeof sourceType)}
                className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#202124]"
              >
                {SOURCE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    Source: {st}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setOnlyHealthIssues((p) => !p)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
                  onlyHealthIssues
                    ? 'border-[#B06000] bg-[#FEF7E0] text-[#B06000]'
                    : 'border-[#DADCE0] bg-[#FFFFFF] text-[#5F6368]'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                Review Issues / Duplicates ({healthCount})
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 border-t border-[#DADCE0] pt-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium whitespace-nowrap ${
                    category === cat
                      ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8]'
                      : 'border-[#DADCE0] bg-[#FFFFFF] text-[#5F6368] hover:bg-[#F8F9FA]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredMemories.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No matching memories"
              description="Try clearing your search or category filter."
              actionLabel="Reset Filters"
              onAction={() => {
                setGlobalSearch('');
                setCategory('All');
                setSourceType('All');
                setOnlyHealthIssues(false);
              }}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredMemories.map((m) => (
                <div
                  key={m.id}
                  className="ws-card flex flex-col justify-between rounded-xl p-5"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-md px-2 py-0.5 font-medium ${getCategoryPastelClass(m.category)}`}>
                          {m.category}
                        </span>
                        <span className={`rounded-md px-2 py-0.5 font-medium ${getSourcePastelClass(m.sourceType)}`}>
                          {m.sourceType}
                        </span>
                        {m.importanceScore !== undefined && (
                          <span className={`rounded-md px-2 py-0.5 font-mono font-medium ${getImportancePastelClass(m.importanceCategory || 'Medium')}`}>
                            {m.importanceScore}/100
                          </span>
                        )}
                      </div>
                      <span className={`rounded-md px-2 py-0.5 font-medium ${getStatusPastelClass(m.verificationStatus)}`}>
                        {m.healthIssue ? m.healthIssue : m.verificationStatus}
                      </span>
                    </div>

                    <h3 className="mt-2.5 text-base font-semibold text-[#202124]">{m.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5F6368]">
                      {m.currentInformation}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-[#DADCE0] bg-[#F8F9FA] p-2.5 text-[11px]">
                      <div>
                        <span className="text-[#80868B]">Event time: </span>
                        <span className="font-mono text-[#202124]">{m.eventTime}</span>
                      </div>
                      <div>
                        <span className="text-[#80868B]">Discovered: </span>
                        <span className="font-mono text-[#202124]">{m.recordedTime}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#DADCE0] pt-3 text-xs">
                    <span className="text-[#80868B] truncate max-w-[55%]">{m.sourceName}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      {m.healthIssue === 'Duplicate' && (
                        <button
                          onClick={() => mergeMemory(m.id)}
                          className="font-medium text-[#137333] hover:underline"
                        >
                          Merge Duplicate
                        </button>
                      )}
                      {m.verificationStatus !== 'Verified' && (
                        <button
                          onClick={() => verifyMemory(m.id)}
                          className="font-medium text-[#137333] hover:underline"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => openMemoryDrawer(m.id)}
                        className="font-medium text-[#1A73E8] hover:underline"
                      >
                        Inspect
                      </button>
                      <Link
                        to={`/memories/${m.id}`}
                        className="font-medium text-[#202124] hover:underline"
                      >
                        Correct / Edit
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PEOPLE */}
      {activeTab === 'people' && (
        <div className="grid gap-4 md:grid-cols-2">
          {entities.map((p) => (
            <div key={p.id} className="ws-card rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3E8FD] font-mono text-xs font-semibold text-[#7627BB]">
                    {p.avatarInitials}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#202124]">{p.name}</h3>
                    <div className="text-xs text-[#5F6368]">
                      {p.role} · {p.organization}
                    </div>
                  </div>
                </div>
                <span className="rounded-md bg-[#E8F0FE] px-2 py-0.5 font-mono text-[11px] font-medium text-[#1A73E8]">
                  {p.collaborationCount} links
                </span>
              </div>

              <p className="text-xs text-[#5F6368]">{p.recentInteraction}</p>

              <div className="flex flex-wrap gap-1.5">
                {p.responsibilities.map((r) => (
                  <span
                    key={r}
                    className="rounded-md border border-[#DADCE0] bg-[#F8F9FA] px-2 py-0.5 text-[11px] text-[#202124]"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: PROJECTS (with embedded Project Handover generator) */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {projects.map((proj) => {
            const projMemories = memories.filter((m) => m.projectId === proj.id);
            const showHandover = handoverProjectId === proj.id;
            return (
              <div key={proj.id} className="ws-card rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="rounded-md bg-[#D2EAF7] px-2 py-0.5 font-medium text-[#007B83]">
                        {proj.status}
                      </span>
                      <span className="text-[#80868B]">Lead: {proj.lead}</span>
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold text-[#202124]">{proj.name}</h3>
                    <p className="mt-1 text-xs text-[#5F6368]">{proj.summary}</p>
                  </div>

                  <button
                    onClick={() => setHandoverProjectId(showHandover ? null : proj.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#1A73E8] hover:bg-[#E8F0FE]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {showHandover ? 'Hide Project Handover' : 'Generate Project Handover'}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-3.5 text-xs">
                  <div>
                    <span className="text-[#80868B]">Next Milestone: </span>
                    <span className="font-semibold text-[#202124]">{proj.nextMilestone}</span>
                    <span className="ml-1 font-mono text-[#1A73E8]">({proj.nextMilestoneDate})</span>
                  </div>
                  <div>
                    <span className="text-[#80868B]">Risk Summary: </span>
                    <span className="text-[#B06000]">{proj.riskSummary}</span>
                  </div>
                </div>

                {showHandover && (
                  <div className="rounded-xl border border-[#1A73E8]/30 bg-[#E8F0FE]/35 p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#1A73E8]">
                        Knowledge Transfer & Project Handover Summary ({projMemories.length} connected memories)
                      </span>
                      <button
                        onClick={() => {
                          const text = [
                            `PROJECT HANDOVER: ${proj.name}`,
                            `Status: ${proj.status} | Lead: ${proj.lead}`,
                            `Summary: ${proj.summary}`,
                            `Next Milestone: ${proj.nextMilestone} (${proj.nextMilestoneDate})`,
                            `Risk: ${proj.riskSummary}`,
                            '',
                            'KEY MEMORIES & DECISIONS:',
                            ...projMemories.map((m) => `- [${m.category}] ${m.title}: ${m.currentInformation}`),
                          ].join('\n');
                          navigator.clipboard?.writeText(text);
                          pushToast('Handover briefing copied to clipboard', 'success');
                        }}
                        className="rounded bg-[#1A73E8] px-2.5 py-1 text-[11px] font-medium text-white"
                      >
                        Copy Handover Brief
                      </button>
                    </div>
                    <ul className="space-y-1.5">
                      {projMemories.map((m) => (
                        <li key={m.id} className="rounded-lg bg-[#FFFFFF] border border-[#DADCE0] p-2.5">
                          <span className="font-semibold text-[#202124]">[{m.category}] {m.title}: </span>
                          <span className="text-[#5F6368]">{m.currentInformation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: DECISIONS */}
      {activeTab === 'decisions' && (
        <div className="space-y-4">
          {decisions.map((d) => (
            <div key={d.id} className="ws-card rounded-xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#EDE7F6] px-2 py-0.5 font-medium text-[#5E35B1]">
                  <Scale className="h-3.5 w-3.5" />
                  Decision Memory
                </span>
                <span className="font-mono text-[#80868B]">
                  {d.date} · {d.sourceName}
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#202124]">{d.title}</h3>
              <div className="rounded-lg border border-[#DADCE0] bg-[#E8F0FE]/40 p-3 text-xs">
                <strong className="text-[#1A73E8]">Final Choice: </strong>
                <span className="text-[#202124]">{d.finalChoice}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <div className="font-semibold text-[#5F6368]">Reasoning & Outcomes</div>
                  <p className="mt-1 text-[#202124]">{d.reasoning}</p>
                  <p className="mt-1 text-[#5F6368]">Outcome: {d.outcomes}</p>
                </div>
                <div>
                  <div className="font-semibold text-[#5F6368]">Alternatives Considered</div>
                  <ul className="mt-1 list-disc pl-4 text-[#5F6368] space-y-0.5">
                    {d.alternatives.map((alt, i) => (
                      <li key={i}>{alt}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                onClick={() => openMemoryDrawer(d.linkedMemoryId)}
                className="text-xs font-medium text-[#1A73E8] hover:underline"
              >
                Inspect Supporting Evidence
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: COMMITMENTS */}
      {activeTab === 'commitments' && (
        <div className="space-y-3">
          {commitments.map((c) => (
            <div key={c.id} className="ws-card rounded-xl p-5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className={`rounded-md px-2 py-0.5 font-medium ${getStatusPastelClass(c.status)}`}>
                  {c.status}
                </span>
                <span className="font-mono text-[#80868B]">
                  Owner: {c.owner} · Due {c.dueDate}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#202124]">{c.title}</h3>
              <p className="text-xs text-[#5F6368]">{c.statement}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DADCE0] pt-2.5 text-xs">
                <span className="text-[#80868B]">Source: {c.sourceName}</span>
                <div className="flex items-center gap-2">
                  {c.status !== 'Completed' && (
                    <button
                      onClick={() => updateCommitmentStatus(c.id, 'Completed', 'Marked complete by user')}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#CEEAD6] px-2.5 py-1 text-[11px] font-medium text-[#137333]"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Mark Complete
                    </button>
                  )}
                  <button
                    onClick={() => openMemoryDrawer(c.linkedMemoryId)}
                    className="font-medium text-[#1A73E8] hover:underline"
                  >
                    Inspect Evidence
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: HISTORY (Timeline, Graph, Time Machine, Forgotten Context, Personal Context Profile) */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="ws-card flex flex-wrap items-center gap-2 rounded-xl p-3">
            {(
              [
                { id: 'timeline', label: 'Memory Timeline', icon: CalendarClock },
                { id: 'graph', label: 'Memory Graph', icon: Network },
                { id: 'time-machine', label: 'Time Machine', icon: History },
                { id: 'recovery', label: 'Forgotten Context', icon: Compass },
                { id: 'profile', label: 'Personal Context', icon: UserCircle },
              ] as const
            ).map((sub) => {
              const Icon = sub.icon;
              const active = historySub === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setHistorySub(sub.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#E8F0FE] text-[#1A73E8]'
                      : 'text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {sub.label}
                </button>
              );
            })}
          </div>

          {historySub === 'timeline' && (
            <div className="ws-card rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#202124]">
                Chronological Memory History (Event Time vs Recorded Time)
              </h3>
              <div className="space-y-3">
                {[...memories]
                  .filter((m) => m.verificationStatus !== 'Archived')
                  .sort((a, b) => b.recordedTime.localeCompare(a.recordedTime))
                  .map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-4 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className={`rounded-md px-2 py-0.5 font-medium ${getCategoryPastelClass(m.category)}`}>
                          {m.category} · {m.versions.length} version(s)
                        </span>
                        <span className="font-mono text-[#5F6368]">
                          Event: {m.eventTime} · Recorded: {m.recordedTime}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-[#202124]">{m.title}</div>
                      <p className="text-xs text-[#5F6368]">{m.currentInformation}</p>
                      <button
                        onClick={() => openMemoryDrawer(m.id)}
                        className="text-xs font-medium text-[#1A73E8] hover:underline"
                      >
                        Inspect All Versions
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {historySub === 'graph' && <MemoryGraph embedded />}

          {historySub === 'time-machine' && <TimeMachine embedded />}

          {historySub === 'recovery' && (
            <div className="space-y-3">
              {forgottenContext.map((f) => (
                <div key={f.id} className="ws-card rounded-xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#EDE7F6] px-2 py-0.5 font-medium text-[#5E35B1]">
                      <Sparkles className="h-3 w-3" />
                      {f.kind}
                    </span>
                    <span className="font-mono text-[#80868B]">
                      From {f.originalDate} · {f.originalSource}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#202124]">{f.title}</h3>
                  <p className="text-xs text-[#5F6368]">{f.whyRelevantNow}</p>
                  <div className="rounded-lg border border-[#DADCE0] bg-[#F8F9FA] p-3 text-xs italic text-[#202124]">
                    “{f.excerpt}”
                  </div>
                  <button
                    onClick={() => openMemoryDrawer(f.linkedMemoryId)}
                    className="text-xs font-medium text-[#1A73E8] hover:underline"
                  >
                    Open Original Record
                  </button>
                </div>
              ))}
            </div>
          )}

          {historySub === 'profile' && (
            <div className="grid gap-3 md:grid-cols-2">
              {contextProfile.map((cp) => (
                <div key={cp.id} className="ws-card rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="rounded-md bg-[#E8F0FE] px-2 py-0.5 font-medium text-[#1A73E8]">
                      {cp.section}
                    </span>
                    <span className="text-[#80868B]">{cp.confidence}</span>
                  </div>
                  <div className="text-sm font-semibold text-[#202124]">{cp.title}</div>
                  <p className="text-xs text-[#5F6368]">{cp.description}</p>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[#80868B] truncate">{cp.evidence}</span>
                    <button
                      onClick={() => removeProfileItem(cp.id)}
                      className="text-[#C5221F] hover:underline shrink-0 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
