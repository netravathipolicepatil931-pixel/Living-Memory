import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckSquare, ShieldAlert, Upload } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';

export const GroupSelection: React.FC = () => {
  const {
    groups,
    toggleGroupSelection,
    selectAllGroups,
    deselectAllGroups,
    analyzeSelectedGroups,
    addSimulatedSource,
  } = useLivingMemory();
  const navigate = useNavigate();
  const [exportName, setExportName] = useState('Research_Lab_Export.txt');

  const selectedCount = groups.filter((g) => g.selected).length;

  const handleImportExport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addSimulatedSource(file.name, file.size || 48000, 'WhatsApp Export');
    e.target.value = '';
  };

  const handleAnalyze = () => {
    analyzeSelectedGroups();
    navigate('/groups/intelligence');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 19 · WhatsApp Group Selection"
        title="Select User-Exported WhatsApp Groups"
        subtitle="Choose which exported WhatsApp chat files Living Memory should analyze. Unselected groups stay excluded."
        actions={
          <button
            onClick={handleAnalyze}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-gold)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Analyze Selected Groups ({selectedCount})
          </button>
        }
      />

      {/* Explicit Privacy & Export Boundary */}
      <div className="ws-card flex flex-col justify-between gap-4 rounded-xl p-5 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--pastel-green)] text-[var(--ink-green)]">
            <ShieldAlert className="h-4 w-4" />
          </span>
          <div className="text-xs leading-relaxed text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">No Private Account Scraping: </strong>
            Living Memory only inspects WhatsApp chat `.txt` files you intentionally export from
            WhatsApp and upload here. Personal chats like Campus Study Group remain unchecked by
            default.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
            <Upload className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
            Import .txt Export
            <input type="file" accept=".txt" className="hidden" onChange={handleImportExport} />
          </label>
          <button
            type="button"
            onClick={() => addSimulatedSource(exportName, 64200, 'WhatsApp Export')}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Stage Sample .txt
          </button>
        </div>
      </div>

      {/* Bulk Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-[var(--text-secondary)]">
          <strong className="font-mono text-[var(--text-primary)]">{selectedCount}</strong> of{' '}
          <strong className="font-mono text-[var(--text-primary)]">{groups.length}</strong>{' '}
          exported chats selected for intelligence extraction
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={exportName}
            onChange={(e) => setExportName(e.target.value)}
            aria-label="Sample export filename"
            className="hidden sm:block rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
          />
          <button
            onClick={selectAllGroups}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          >
            Select All
          </button>
          <button
            onClick={deselectAllGroups}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((grp) => (
          <button
            key={grp.id}
            type="button"
            onClick={() => toggleGroupSelection(grp.id)}
            className={`ws-card flex flex-col justify-between rounded-xl p-5 text-left transition-all ${
              grp.selected
                ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/20 bg-[var(--nav-active-bg)]/45'
                : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block rounded-full bg-[var(--pastel-green)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ink-green)]">
                  {grp.category} · Imported {grp.importDate}
                </span>
                <h3 className="mt-1.5 text-base font-semibold text-[var(--text-primary)]">
                  {grp.name}
                </h3>
              </div>
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                  grp.selected
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]'
                }`}
              >
                {grp.selected && <Check className="h-3.5 w-3.5" />}
              </div>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              {grp.description}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-[11px] text-[var(--text-muted)]">
              <span className="font-mono">{grp.messageCount} messages</span>
              <span>Last msg: {grp.lastMessageDate}</span>
              <span className="font-mono font-medium text-[var(--ink-green)]">
                {grp.extractedMemories} memories
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
