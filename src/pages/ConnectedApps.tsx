import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';

export const ConnectedApps: React.FC = () => {
  const { integrations, toggleIntegrationDemo, syncIntegrationDemo, setUploadModalOpen } =
    useLivingMemory();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 24 · Connected Apps Management"
        title="Connected Apps & Data Channels"
        subtitle="Manage active local upload pipelines, inspect demo feeds, and see which external connectors remain on the backend roadmap."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((item) => {
          const isActive = item.status !== 'Disconnected';
          const detailRoute =
            item.id === 'gmail'
              ? '/integrations/gmail'
              : item.id === 'calendar'
              ? '/integrations/calendar'
              : item.id === 'whatsapp'
              ? '/groups/select'
              : '/sources';

          return (
            <div
              key={item.id}
              className="ws-card flex flex-col justify-between rounded-xl p-5 transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{item.name}</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">{item.accountLabel}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      isActive
                        ? 'bg-[var(--pastel-green)] text-[var(--ink-green)]'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {item.description}
                </p>

                <div className="mt-3 text-[11px] text-[var(--text-muted)]">
                  Last refreshed: {item.lastSynced}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
                <Link
                  to={detailRoute}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-gold)] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Open
                  <ArrowRight className="h-3 w-3" />
                </Link>
                {item.id === 'gmail' || item.id === 'calendar' ? (
                  <>
                    <button
                      onClick={() => syncIntegrationDemo(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh
                    </button>
                    <button
                      onClick={() => toggleIntegrationDemo(item.id)}
                      className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)]"
                    >
                      {isActive ? 'Pause Demo' : 'Enable Demo'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
                  >
                    Upload File
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Future Integrations */}
      <div className="ws-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Future Integrations (Not Yet Connected in Demo Stage)
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
          {[
            {
              name: 'Google Drive & Docs',
              note: 'Planned OAuth read-only integration in FastAPI backend.',
            },
            {
              name: 'Slack Workspaces',
              note: 'Planned channel & thread ingestion with citation tracking.',
            },
            {
              name: 'Audio Lecture Transcription',
              note: 'Planned voice memo timestamp extraction via Gemini.',
            },
          ].map((f) => (
            <div
              key={f.name}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--text-primary)]">{f.name}</span>
                <span className="text-[11px] text-[var(--text-muted)]">Not Available Yet</span>
              </div>
              <p className="mt-1 text-[var(--text-secondary)]">{f.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
