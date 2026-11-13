import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';

export const IntegrationPermissions: React.FC = () => {
  const { integrations, settings, updateSettings, toggleIntegrationDemo, pushToast } =
    useLivingMemory();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 39 · Integration Permissions"
        title="Granular Read-Only Integration Scopes"
        subtitle="Configure exactly which labels, calendars, and exported files are included in extraction."
      />

      <div className="space-y-4">
        {integrations.map((intg) => {
          const isActive = intg.status !== 'Disconnected';
          return (
            <div
              key={intg.id}
              className="ws-card rounded-xl p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--pastel-green)] text-[var(--ink-green)]">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {intg.name}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Scope: {intg.permissionScope}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toggleIntegrationDemo(intg.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--pastel-green)] text-[var(--ink-green)]'
                      : 'border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                  }`}
                >
                  {isActive ? `Active (${intg.status})` : 'Disabled'}
                </button>
              </div>

              {intg.id === 'gmail' && (
                <div className="flex flex-wrap items-center gap-4 border-t border-[var(--border-subtle)] pt-3 text-xs">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={settings.gmailIncludeStarred}
                      onChange={(e) => {
                        updateSettings({ gmailIncludeStarred: e.target.checked });
                        pushToast('Gmail scope updated', 'info');
                      }}
                      className="accent-[var(--accent-gold)]"
                    />
                    Include Starred Threads
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={settings.gmailExcludeSpamTrash}
                      onChange={(e) => {
                        updateSettings({ gmailExcludeSpamTrash: e.target.checked });
                        pushToast('Spam/Trash exclusion updated', 'info');
                      }}
                      className="accent-[var(--accent-gold)]"
                    />
                    Strictly Exclude Spam & Trash
                  </label>

                  <select
                    value={settings.gmailDateRange}
                    onChange={(e) =>
                      updateSettings({
                        gmailDateRange: e.target.value as 'Last 14 Days' | 'Last 30 Days' | 'Semester',
                      })
                    }
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs text-[var(--text-primary)]"
                  >
                    <option value="Last 14 Days">Range: Last 14 Days</option>
                    <option value="Last 30 Days">Range: Last 30 Days</option>
                    <option value="Semester">Range: Entire Semester</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
