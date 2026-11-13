import React, { useState } from 'react';
import { FolderOpen, Search, Trash2, Upload } from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { SourceType } from '../types/memory';
import { getSourcePastelClass } from '../utils/categoryColors';

const SOURCE_TYPES: Array<'All' | SourceType> = [
  'All',
  'WhatsApp Export',
  'Gmail',
  'Google Calendar',
  'PDF Document',
  'Image',
  'Text File',
];

export const SourcesLibrary: React.FC = () => {
  const { sources, deleteSource, setUploadModalOpen } = useLivingMemory();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | SourceType>('All');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const visible = sources.filter((s) => {
    if (typeFilter !== 'All' && s.type !== typeFilter) return false;
    if (query.trim() && !`${s.name} ${s.type} ${s.authorityBasis}`.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 18 · Sources Library"
        title="Indexed Files & Demo Data Sources"
        subtitle="Inspect every WhatsApp export, PDF rubric, image, note, and demo connector feeding your workspace."
        actions={
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-gold)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload New Source
          </button>
        }
      />

      <div className="ws-card flex flex-wrap items-center gap-3 rounded-xl p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sources by filename or type..."
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)]"
        >
          {SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              Type: {t}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No sources match your filter"
          description="Upload a WhatsApp .txt export, PDF, or screenshot to index new context."
          actionLabel="Upload Source"
          onAction={() => setUploadModalOpen(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((s) => (
            <div
              key={s.id}
              className="ws-card flex flex-col justify-between rounded-xl p-5 transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className={`rounded-full px-2.5 py-0.5 font-medium ${getSourcePastelClass(s.type)}`}>
                        {s.type}
                      </span>
                      <span className="text-[var(--text-muted)]">{s.verificationState}</span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-[var(--text-primary)] break-all">
                      {s.name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-[var(--pastel-green)] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[var(--ink-green)] whitespace-nowrap shrink-0">
                    {s.processingStatus}
                  </span>
                </div>

                <p className="mt-2 text-xs text-[var(--text-secondary)]">{s.authorityBasis}</p>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2.5 text-[11px]">
                  <div>
                    <div className="text-[var(--text-muted)]">Added</div>
                    <div className="font-mono text-[var(--text-primary)]">{s.uploadDate}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)]">Records</div>
                    <div className="font-mono text-[var(--text-primary)]">{s.recordCount}</div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)]">Memories</div>
                    <div className="font-mono text-[var(--accent-gold)]">
                      {s.extractedMemoriesCount}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
                <span className="font-mono text-[11px] text-[var(--text-muted)]">{s.sizeLabel}</span>
                <button
                  onClick={() => setDeleteTarget(s.id)}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--status-danger)] hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Source
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove this source from Sources Library?"
        description="This removes the source entry from your local demo list."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteSource(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
