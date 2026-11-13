import React, { useState } from 'react';
import { Download, Lock, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { memoryService } from '../services/memoryService';

export const PrivacyControls: React.FC = () => {
  const {
    memories,
    sources,
    settings,
    updateSettings,
    deleteAllMemories,
    deleteAllSources,
    pushToast,
  } = useLivingMemory();

  const [confirmAction, setConfirmAction] = useState<'memories' | 'sources' | null>(null);

  const handleExportJson = () => {
    const json = memoryService.exportMemoriesAsJson(memories);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `living-memory-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Exported all local memories as JSON', 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 37 · Privacy & Data Controls"
        title="Data Retention, Portability & Deletion"
        subtitle="Control how long extracted memories stay retained, export your entire memory store as JSON, or wipe local demo records."
        actions={
          <button
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-gold)] px-4 py-2 text-xs font-semibold text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Export Memories (.JSON)
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="ws-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--pastel-blue)] text-[var(--ink-blue)]">
              <Lock className="h-4 w-4" />
            </span>
            Retention & Detection Rules
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Memory Retention Window
            </label>
            <select
              value={settings.retentionPolicy}
              onChange={(e) => {
                updateSettings({
                  retentionPolicy: e.target.value as '90 Days' | '1 Year' | 'Indefinite',
                });
                pushToast('Retention policy updated', 'success');
              }}
              className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)]"
            >
              <option value="90 Days">90 Days</option>
              <option value="1 Year">1 Year</option>
              <option value="Indefinite">Indefinite (Preserve Version History)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Impact Sensitivity
            </label>
            <select
              value={settings.impactSensitivity}
              onChange={(e) => {
                updateSettings({
                  impactSensitivity: e.target.value as 'Balanced' | 'High' | 'Conservative',
                });
                pushToast('Impact sensitivity updated', 'success');
              }}
              className="mt-1.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--text-primary)]"
            >
              <option value="Balanced">Balanced</option>
              <option value="High">High (Flag subtle shifts)</option>
              <option value="Conservative">Conservative (High-confidence shifts only)</option>
            </select>
          </div>

          <label className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 cursor-pointer text-xs">
            <span className="text-[var(--text-primary)]">
              Automatically flag cross-source deadline & meeting conflicts
            </span>
            <input
              type="checkbox"
              checked={settings.autoDetectConflicts}
              onChange={(e) => updateSettings({ autoDetectConflicts: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent-gold)]"
            />
          </label>
        </div>

        <div className="ws-card rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Local Store Deletion Controls
          </h3>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            Currently holding <strong className="font-mono">{memories.length}</strong> memories and{' '}
            <strong className="font-mono">{sources.length}</strong> source entries in local browser
            memory. You can restore sample data anytime in Account Settings.
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => setConfirmAction('memories')}
              className="flex w-full items-center justify-between rounded-lg bg-[var(--pastel-red)]/65 px-4 py-3 text-xs font-semibold text-[var(--ink-red)] hover:bg-[var(--pastel-red)] transition-colors"
            >
              <span>Delete All Extracted Memories ({memories.length})</span>
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              onClick={() => setConfirmAction('sources')}
              className="flex w-full items-center justify-between rounded-lg bg-[var(--pastel-red)]/65 px-4 py-3 text-xs font-semibold text-[var(--ink-red)] hover:bg-[var(--pastel-red)] transition-colors"
            >
              <span>Delete All Uploaded & Demo Sources ({sources.length})</span>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction === 'memories'
            ? 'Clear all memories from local state?'
            : 'Clear all sources from local state?'
        }
        description="This immediately empties the local list. You can reload the sample dataset later from Account Settings → Reset Demo Data."
        confirmLabel="Confirm Clear"
        destructive
        onConfirm={() => {
          if (confirmAction === 'memories') deleteAllMemories();
          if (confirmAction === 'sources') deleteAllSources();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
