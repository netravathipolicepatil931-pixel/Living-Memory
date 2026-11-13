import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, List, Search, SlidersHorizontal } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { memoryService } from '../services/memoryService';
import { MemoryCategory, SourceType } from '../types/memory';
import {
  getCategoryPastelClass,
  getSourcePastelClass,
  getStatusPastelClass,
} from '../utils/categoryColors';

const CATEGORIES: Array<'All' | MemoryCategory> = [
  'All',
  'Events',
  'Tasks',
  'Decisions',
  'Commitments',
  'Deadlines',
  'Announcements',
  'People',
  'Projects',
  'Relationships',
  'Preferences',
  'Questions',
  'Important conversations',
];

const SOURCE_TYPES: Array<'All' | SourceType> = [
  'All',
  'WhatsApp Export',
  'Gmail',
  'Google Calendar',
  'PDF Document',
  'Image',
  'Text File',
];

export const MemoryExplorer: React.FC = () => {
  const { memories, entities, projects, globalSearch, setGlobalSearch, openMemoryDrawer } =
    useLivingMemory();

  const [category, setCategory] = useState<'All' | MemoryCategory>('All');
  const [sourceType, setSourceType] = useState<'All' | SourceType>('All');
  const [personId, setPersonId] = useState<string>('All');
  const [projectId, setProjectId] = useState<string>('All');
  const [priority, setPriority] = useState<string>('All');
  const [confidence, setConfidence] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const filtered = useMemo(
    () =>
      memoryService.filterMemories(memories, {
        query: globalSearch,
        category,
        sourceType,
        personId,
        projectId,
        priority,
        confidence,
        dateFilter,
      }),
    [memories, globalSearch, category, sourceType, personId, projectId, priority, confidence, dateFilter]
  );

  const clearFilters = () => {
    setGlobalSearch('');
    setCategory('All');
    setSourceType('All');
    setPersonId('All');
    setProjectId('All');
    setPriority('All');
    setConfidence('All');
    setDateFilter('all');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 11 · Memory Explorer"
        title="Search & Filter Connected Memories"
        subtitle="Browse all extracted memories across 12 categories, 6 source types, people, projects, priority, and confidence."
        actions={
          <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                viewMode === 'cards'
                  ? 'bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                viewMode === 'list'
                  ? 'bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="ws-card rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search titles, claims, evidence, or source names..."
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>

          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as typeof sourceType)}
            aria-label="Filter by source type"
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
          >
            {SOURCE_TYPES.map((st) => (
              <option key={st} value={st}>
                Source: {st}
              </option>
            ))}
          </select>

          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            aria-label="Filter by person"
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
          >
            <option value="All">Person: All</option>
            {entities.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            aria-label="Filter by project"
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
          >
            <option value="All">Project: All</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-label="Filter by priority"
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
          >
            <option value="All">Priority: All</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
          </select>

          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
            aria-label="Filter by confidence"
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
          >
            <option value="All">Confidence: All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
            aria-label="Filter by date"
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
          >
            <option value="all">Date: Any</option>
            <option value="today">Updated Nov 13</option>
            <option value="week">Nov 10 – Nov 20</option>
          </select>
        </div>

        {/* Category Strip */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border-subtle)] pt-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                category === cat
                  ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>
          Showing <strong className="font-mono text-[var(--text-primary)]">{filtered.length}</strong>{' '}
          memories
        </span>
        {(globalSearch ||
          category !== 'All' ||
          sourceType !== 'All' ||
          personId !== 'All' ||
          projectId !== 'All') && (
          <button
            onClick={clearFilters}
            className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
          >
            Reset all filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="No memories match these filters"
          description="Try broadening your category, person, or date selection."
          actionLabel="Clear Filters"
          onAction={clearFilters}
        />
      ) : viewMode === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="ws-card flex flex-col justify-between rounded-xl p-5"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-md px-2 py-0.5 font-medium ${getCategoryPastelClass(
                        m.category
                      )}`}
                    >
                      {m.category}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 font-medium ${getSourcePastelClass(
                        m.sourceType
                      )}`}
                    >
                      {m.sourceType}
                    </span>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 font-medium ${getStatusPastelClass(
                      m.verificationStatus
                    )}`}
                  >
                    {m.verificationStatus}
                  </span>
                </div>

                <h3 className="mt-2.5 text-base font-semibold text-[var(--text-primary)]">
                  {m.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {m.currentInformation}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2.5 text-[11px]">
                  <div>
                    <span className="text-[var(--text-muted)]">Event time: </span>
                    <span className="font-mono text-[var(--text-primary)]">{m.eventTime}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Recorded: </span>
                    <span className="font-mono text-[var(--text-primary)]">{m.recordedTime}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
                <span className="text-[var(--text-muted)] truncate">
                  {m.sourceName} · {m.confidence} confidence
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => openMemoryDrawer(m.id)}
                    className="font-medium text-[var(--accent-primary)] hover:underline"
                  >
                    Quick Inspect
                  </button>
                  <Link
                    to={`/memories/${m.id}`}
                    className="font-medium text-[var(--text-primary)] hover:underline"
                  >
                    Full Page
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ws-card overflow-x-auto rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-medium">Memory Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Event Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-[var(--bg-primary)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{m.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${getCategoryPastelClass(
                        m.category
                      )}`}
                    >
                      {m.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{m.sourceName}</td>
                  <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">{m.eventTime}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${getStatusPastelClass(
                        m.verificationStatus
                      )}`}
                    >
                      {m.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => openMemoryDrawer(m.id)}
                      className="font-medium text-[var(--accent-primary)] hover:underline"
                    >
                      Inspect
                    </button>
                    <Link
                      to={`/memories/${m.id}`}
                      className="text-[var(--text-primary)] hover:underline"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
