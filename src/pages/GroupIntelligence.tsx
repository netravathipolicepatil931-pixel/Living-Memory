import React, { useState } from 'react';
import { ExternalLink, MessageSquareText } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { GroupMessage } from '../types/memory';
import { getStatusPastelClass } from '../utils/categoryColors';

const BUCKETS: Array<'All' | GroupMessage['bucket']> = [
  'All',
  'Assignments',
  'Deadlines',
  'Events',
  'Announcements',
  'Decisions',
  'Responsibilities',
  'Important conversations',
  'Questions',
  'Updates',
  'Duplicate messages',
];

export const GroupIntelligence: React.FC = () => {
  const { groups, groupMessages, openMemoryDrawer } = useLivingMemory();
  const [groupFilter, setGroupFilter] = useState<string>('All');
  const [bucketFilter, setBucketFilter] = useState<'All' | GroupMessage['bucket']>('All');

  const activeGroups = groups.filter((g) => g.selected);
  const activeGroupIds = new Set(activeGroups.map((g) => g.id));

  const filteredMessages = groupMessages.filter((msg) => {
    if (!activeGroupIds.has(msg.groupId)) return false;
    if (groupFilter !== 'All' && msg.groupId !== groupFilter) return false;
    if (bucketFilter !== 'All' && msg.bucket !== bucketFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 20 · Group Intelligence"
        title="Analyzed WhatsApp Group Intelligence"
        subtitle="Extracted signals from your selected .txt exports, organized across 10 structured buckets including duplicate message detection."
      />

      {/* Group Selector + Stats */}
      <div className="ws-card flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setGroupFilter('All')}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              groupFilter === 'All'
                ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            All Selected ({activeGroups.length})
          </button>
          {activeGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroupFilter(g.id)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                groupFilter === g.id
                  ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
        <span className="rounded-full bg-[var(--pastel-green)] px-2.5 py-0.5 font-mono text-xs font-medium text-[var(--ink-green)]">
          {filteredMessages.length} extracted entries
        </span>
      </div>

      {/* 10 Bucket Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {BUCKETS.map((b) => (
          <button
            key={b}
            onClick={() => setBucketFilter(b)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
              bucketFilter === b
                ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {filteredMessages.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No messages in this bucket"
          description="Select another intelligence bucket or enable more WhatsApp group exports in Group Selection."
          actionLabel="Show All Buckets"
          onAction={() => {
            setGroupFilter('All');
            setBucketFilter('All');
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredMessages.map((msg) => {
            const group = groups.find((g) => g.id === msg.groupId);
            return (
              <div
                key={msg.id}
                className="ws-card rounded-xl p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--pastel-green)] px-2.5 py-0.5 font-medium text-[var(--ink-green)]">
                      {msg.bucket}
                    </span>
                    <span className="font-medium text-[var(--text-primary)]">{group?.name}</span>
                    <span className="text-[var(--text-muted)]">·</span>
                    <span className="text-[var(--text-secondary)]">Sender: {msg.sender}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getStatusPastelClass(msg.priority)}`}>
                      {msg.priority}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>

                <p className="mt-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3.5 text-xs leading-relaxed text-[var(--text-primary)]">
                  “{msg.content}”
                </p>

                {msg.linkedMemoryId && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => openMemoryDrawer(msg.linkedMemoryId!)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-gold)] hover:underline"
                    >
                      Inspect Connected Memory
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
