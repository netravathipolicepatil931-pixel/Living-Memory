import React, { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { ContextProfileItem } from '../types/memory';

const SECTIONS: Array<'All' | ContextProfileItem['section']> = [
  'All',
  'Goals',
  'Active projects',
  'Responsibilities',
  'Important people',
  'Preferences',
  'Interests',
  'Recurring activities',
  'Frequently discussed topics',
  'User-confirmed facts',
];

export const ContextProfile: React.FC = () => {
  const { contextProfile, updateProfileItem, removeProfileItem } = useLivingMemory();
  const [sectionFilter, setSectionFilter] = useState<'All' | ContextProfileItem['section']>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const visible = contextProfile.filter(
    (item) => sectionFilter === 'All' || item.section === sectionFilter
  );

  const startEdit = (item: ContextProfileItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDesc(item.description);
  };

  const saveEdit = (id: string) => {
    updateProfileItem(id, {
      title: editTitle,
      description: editDesc,
      confidence: 'Confirmed by User',
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 10 · Personal Context Profile"
        title="Alex’s Evolving Context Profile"
        subtitle="Living Memory separates facts you confirmed from patterns observed across your conversations. Edit, confirm, or remove any entry."
      />

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((sec) => (
          <button
            key={sec}
            onClick={() => setSectionFilter(sec)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              sectionFilter === sec
                ? 'border-[var(--accent-primary)] bg-[var(--nav-active-bg)] text-[var(--accent-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((item) => {
          const isEditing = editingId === item.id;
          const isConfirmed = item.confidence === 'Confirmed by User';

          return (
            <div
              key={item.id}
              className="ws-card rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-[var(--pastel-purple)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ink-purple)]">
                    {item.section}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      isConfirmed
                        ? 'bg-[var(--pastel-green)] text-[var(--ink-green)]'
                        : 'bg-[var(--pastel-lavender)] text-[var(--ink-lavender)]'
                    }`}
                  >
                    {item.confidence}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  Updated {item.lastUpdated}
                </span>
              </div>

              {isEditing ? (
                <div className="mt-3 space-y-2.5">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  />
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveEdit(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-gold)] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save & Confirm
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                  <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
                    Basis: {item.evidence}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {!isConfirmed && (
                      <button
                        onClick={() =>
                          updateProfileItem(item.id, { confidence: 'Confirmed by User' })
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--pastel-green)] px-2.5 py-1 text-xs font-medium text-[var(--ink-green)] hover:opacity-90"
                      >
                        <Check className="h-3 w-3" />
                        Confirm as Fact
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs text-[var(--text-primary)]"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => removeProfileItem(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs text-[var(--status-danger)]"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
