import React, { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ExternalLink, Network, Search } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';

type GraphNodeKind =
  | 'People'
  | 'Projects'
  | 'Events'
  | 'Conversations'
  | 'Decisions'
  | 'Commitments'
  | 'Documents'
  | 'Emails'
  | 'Calendar events'
  | 'WhatsApp groups';

interface GraphItem {
  id: string;
  label: string;
  kind: GraphNodeKind;
  summary: string;
  x: number;
  y: number;
  linkedMemoryId?: string;
}

const NODE_KINDS: Array<'All' | GraphNodeKind> = [
  'All',
  'People',
  'Projects',
  'Events',
  'Conversations',
  'Decisions',
  'Commitments',
  'Documents',
  'Emails',
  'Calendar events',
  'WhatsApp groups',
];

const KIND_PASTEL_NODE: Record<GraphNodeKind, { bg: string; border: string; ink: string }> = {
  People: { bg: '#F3E8FD', border: '#D7AEFB', ink: '#5E35B1' },
  Projects: { bg: '#EDE7F6', border: '#C5B3E6', ink: '#5E35B1' },
  Events: { bg: '#FEF7E0', border: '#F6D678', ink: '#B06000' },
  Conversations: { bg: '#E8F0FE', border: '#AECBFA', ink: '#1967D2' },
  Decisions: { bg: '#EDE7F6', border: '#C5B3E6', ink: '#5E35B1' },
  Commitments: { bg: '#CEEAD6', border: '#81C995', ink: '#137333' },
  Documents: { bg: '#D2EAF7', border: '#8BD3E6', ink: '#007B83' },
  Emails: { bg: '#FCE8E6', border: '#F28B82', ink: '#C5221F' },
  'Calendar events': { bg: '#D2E3FC', border: '#8AB4F8', ink: '#1967D2' },
  'WhatsApp groups': { bg: '#CEEAD6', border: '#81C995', ink: '#137333' },
};

const GRAPH_ITEMS: GraphItem[] = [
  {
    id: 'n-alex',
    label: 'Alex (Lead)',
    kind: 'People',
    summary: 'Project lead coordinating AI Assistant and Smart Campus deliverables.',
    x: 340,
    y: 40,
  },
  {
    id: 'n-sarah',
    label: 'Sarah',
    kind: 'People',
    summary: 'Responsible for AI Assistant presentation slides & Smart Campus UX.',
    x: 80,
    y: 120,
  },
  {
    id: 'n-rahul',
    label: 'Rahul',
    kind: 'People',
    summary: 'Handling Docker ingestion build & latency verification.',
    x: 600,
    y: 120,
  },
  {
    id: 'n-meera',
    label: 'Professor Meera',
    kind: 'People',
    summary: 'Faculty reviewer extending deadline to Nov 20 & running Nov 18 review.',
    x: 340,
    y: 220,
  },
  {
    id: 'n-proj-ai',
    label: 'AI Assistant Project',
    kind: 'Projects',
    summary: 'Primary context-aware memory project with review on Nov 18.',
    x: 340,
    y: 130,
    linkedMemoryId: 'mem-project-review',
  },
  {
    id: 'n-event-dl',
    label: 'Assignment Deadline (Nov 20)',
    kind: 'Events',
    summary: 'Shifted 3 times across WhatsApp & Gmail (Nov 15 → Nov 18 → Nov 20).',
    x: 120,
    y: 290,
    linkedMemoryId: 'mem-assignment-deadline',
  },
  {
    id: 'n-dec-ver',
    label: 'Append-Only Versioning',
    kind: 'Decisions',
    summary: 'Team decision: preserve every version with eventTime vs recordedTime.',
    x: 560,
    y: 270,
    linkedMemoryId: 'mem-arch-decision',
  },
  {
    id: 'n-cmt-slides',
    label: 'Sarah: Slides Due Nov 16',
    kind: 'Commitments',
    summary: 'Promised in AI Project Team chat and Gmail follow-up; file pending.',
    x: 60,
    y: 390,
    linkedMemoryId: 'mem-sarah-slides',
  },
  {
    id: 'n-doc-rubric',
    label: 'Assignment_Rubric_v2.pdf',
    kind: 'Documents',
    summary: 'Citation latency benchmark carries 15% grading weight in Section 4.',
    x: 620,
    y: 390,
    linkedMemoryId: 'mem-q-rubric-citation',
  },
  {
    id: 'n-email-office',
    label: 'Gmail: Academic Office Notice',
    kind: 'Emails',
    summary: 'Official email confirming AI Systems deadline extension to Nov 20.',
    x: 240,
    y: 440,
    linkedMemoryId: 'mem-assignment-deadline',
  },
  {
    id: 'n-cal-sync',
    label: 'Calendar: Team Sync Nov 15',
    kind: 'Calendar events',
    summary: 'Rescheduled to 16:30 in Library Room B (Demo Calendar).',
    x: 450,
    y: 440,
    linkedMemoryId: 'mem-team-meeting-shift',
  },
  {
    id: 'n-wa-team',
    label: 'WhatsApp: AI Project Team',
    kind: 'WhatsApp groups',
    summary: 'Exported .txt discussion linking Sarah, Rahul, and Alex.',
    x: 170,
    y: 520,
    linkedMemoryId: 'mem-arch-decision',
  },
  {
    id: 'n-conv-class',
    label: 'Class Discussion Thread',
    kind: 'Conversations',
    summary: 'Earlier Nov 15 deadline notice & Rahul’s rubric citation question.',
    x: 490,
    y: 520,
    linkedMemoryId: 'mem-q-rubric-citation',
  },
];

const GRAPH_LINKS: Array<{ id: string; source: string; target: string; label: string }> = [
  { id: 'e1', source: 'n-alex', target: 'n-proj-ai', label: 'leads' },
  { id: 'e2', source: 'n-sarah', target: 'n-proj-ai', label: 'contributes' },
  { id: 'e3', source: 'n-rahul', target: 'n-proj-ai', label: 'contributes' },
  { id: 'e4', source: 'n-meera', target: 'n-proj-ai', label: 'reviews' },
  { id: 'e5', source: 'n-meera', target: 'n-event-dl', label: 'extended' },
  { id: 'e6', source: 'n-email-office', target: 'n-event-dl', label: 'confirms Nov 20' },
  { id: 'e7', source: 'n-sarah', target: 'n-cmt-slides', label: 'promised' },
  { id: 'e8', source: 'n-proj-ai', target: 'n-dec-ver', label: 'architecture' },
  { id: 'e9', source: 'n-rahul', target: 'n-doc-rubric', label: 'asked about' },
  { id: 'e10', source: 'n-proj-ai', target: 'n-cal-sync', label: 'syncs on' },
  { id: 'e11', source: 'n-wa-team', target: 'n-cmt-slides', label: 'recorded in' },
  { id: 'e12', source: 'n-conv-class', target: 'n-doc-rubric', label: 'answered by' },
];

export const MemoryGraph: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { openMemoryDrawer } = useLivingMemory();
  const [kindFilter, setKindFilter] = useState<'All' | GraphNodeKind>('All');
  const [query, setQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('n-proj-ai');
  const [focusConnectedOnly, setFocusConnectedOnly] = useState(false);

  const visibleIds = useMemo(() => {
    const base = GRAPH_ITEMS.filter((item) => {
      if (kindFilter !== 'All' && item.kind !== kindFilter) return false;
      if (
        query.trim() &&
        !`${item.label} ${item.kind} ${item.summary}`.toLowerCase().includes(query.toLowerCase())
      ) {
        return false;
      }
      return true;
    }).map((i) => i.id);

    if (!focusConnectedOnly) return new Set(base);

    const neighbors = new Set<string>([selectedNodeId]);
    GRAPH_LINKS.forEach((l) => {
      if (l.source === selectedNodeId) neighbors.add(l.target);
      if (l.target === selectedNodeId) neighbors.add(l.source);
    });
    return neighbors;
  }, [kindFilter, query, focusConnectedOnly, selectedNodeId]);

  const nodes: Node[] = useMemo(
    () =>
      GRAPH_ITEMS.filter((item) => visibleIds.has(item.id)).map((item) => {
        const palette = KIND_PASTEL_NODE[item.kind];
        const isSelected = item.id === selectedNodeId;
        return {
          id: item.id,
          position: { x: item.x, y: item.y },
          data: { label: `${item.kind}: ${item.label}` },
          style: {
            background: palette.bg,
            color: '#202124',
            border: isSelected ? '2px solid #1A73E8' : `1px solid ${palette.border}`,
            borderRadius: '10px',
            padding: '9px 12px',
            fontSize: '12px',
            fontWeight: 500,
            boxShadow: isSelected
              ? '0 2px 8px rgba(26, 115, 232, 0.22)'
              : '0 1px 2px rgba(60, 64, 67, 0.08)',
            width: 210,
          },
        };
      }),
    [visibleIds, selectedNodeId]
  );

  const edges: Edge[] = useMemo(
    () =>
      GRAPH_LINKS.filter((l) => visibleIds.has(l.source) && visibleIds.has(l.target)).map((l) => {
        const isHighlighted = l.source === selectedNodeId || l.target === selectedNodeId;
        return {
          id: l.id,
          source: l.source,
          target: l.target,
          label: l.label,
          animated: isHighlighted,
          style: {
            stroke: isHighlighted ? '#1A73E8' : '#8AB4F8',
            strokeWidth: isHighlighted ? 2.2 : 1.5,
          },
          labelStyle: { fill: '#202124', fontSize: 10, fontWeight: 500 },
          labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.9 },
        };
      }),
    [visibleIds, selectedNodeId]
  );

  const selectedItem = GRAPH_ITEMS.find((i) => i.id === selectedNodeId) || GRAPH_ITEMS[0];
  const connectedEdges = GRAPH_LINKS.filter(
    (l) => l.source === selectedItem.id || l.target === selectedItem.id
  );
  const selectedPalette = KIND_PASTEL_NODE[selectedItem.kind];

  return (
    <div className="space-y-4">
      {!embedded ? (
        <PageHeader
          title="10-Entity Cross-Source Memory Graph"
          subtitle="Explore how People, Projects, Events, Conversations, Decisions, Commitments, Documents, Emails, Calendar events, and WhatsApp groups connect."
          actions={
            <button
              onClick={() => setFocusConnectedOnly((p) => !p)}
              className={`rounded-lg border px-3.5 py-2 text-xs font-medium ${
                focusConnectedOnly
                  ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
              }`}
            >
              {focusConnectedOnly ? 'Showing Neighborhood Only' : 'Expand Selected Neighborhood'}
            </button>
          }
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-[#5F6368]">
            Click any node to trace connected people, emails, calendar events, and WhatsApp groups.
          </div>
          <button
            onClick={() => setFocusConnectedOnly((p) => !p)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              focusConnectedOnly
                ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8]'
                : 'border-[#DADCE0] bg-[#FFFFFF] text-[#5F6368]'
            }`}
          >
            {focusConnectedOnly ? 'Showing Neighborhood Only' : 'Expand Selected Neighborhood'}
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="ws-card flex flex-wrap items-center gap-3 rounded-xl p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find node by name, topic, or source..."
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </div>

        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
        >
          {NODE_KINDS.map((k) => (
            <option key={k} value={k}>
              Entity Type: {k}
            </option>
          ))}
        </select>
      </div>

      {/* Graph Canvas + Node Inspector */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="ws-card lg:col-span-8 h-[540px] overflow-hidden rounded-xl bg-[#F8F9FA]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          >
            <Background color="#DADCE0" gap={20} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const match = GRAPH_ITEMS.find((i) => i.id === n.id);
                return match ? KIND_PASTEL_NODE[match.kind].border : '#1A73E8';
              }}
              maskColor="rgba(248, 249, 250, 0.72)"
            />
          </ReactFlow>
        </div>

        <div className="ws-card lg:col-span-4 rounded-xl p-5 space-y-4">
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: selectedPalette.bg, color: selectedPalette.ink }}
          >
            <Network className="h-3.5 w-3.5" />
            {selectedItem.kind}
          </span>

          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {selectedItem.label}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
              {selectedItem.summary}
            </p>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-3">
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              Connected Relationships ({connectedEdges.length})
            </div>
            <ul className="mt-2 space-y-1.5 text-xs">
              {connectedEdges.map((edge) => {
                const otherId = edge.source === selectedItem.id ? edge.target : edge.source;
                const other = GRAPH_ITEMS.find((i) => i.id === otherId);
                if (!other) return null;
                return (
                  <li key={edge.id}>
                    <button
                      onClick={() => setSelectedNodeId(other.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-left hover:bg-[var(--nav-active-bg)]"
                    >
                      <span className="truncate font-medium text-[var(--text-primary)]">
                        {other.label}
                      </span>
                      <span className="ml-2 text-[11px] font-medium text-[var(--accent-primary)] shrink-0">
                        {edge.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selectedItem.linkedMemoryId && (
            <button
              onClick={() => openMemoryDrawer(selectedItem.linkedMemoryId!)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)]"
            >
              Open Linked Memory Evidence
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
