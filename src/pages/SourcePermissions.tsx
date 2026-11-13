import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  FileText,
  Image as ImageIcon,
  Mail,
  MessageSquareText,
  NotebookPen,
  ShieldCheck,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { IntegrationState } from '../types/memory';

const ICON_MAP: Record<IntegrationState['id'], React.ElementType> = {
  whatsapp: MessageSquareText,
  gmail: Mail,
  calendar: Calendar,
  pdfs: FileText,
  images: ImageIcon,
  documents: NotebookPen,
};

const ICON_PASTEL_MAP: Record<IntegrationState['id'], string> = {
  whatsapp: 'bg-[var(--pastel-green)] text-[var(--ink-green)]',
  gmail: 'bg-[var(--pastel-red)] text-[var(--ink-red)]',
  calendar: 'bg-[var(--pastel-blue)] text-[var(--ink-blue)]',
  pdfs: 'bg-[var(--pastel-cyan)] text-[var(--ink-cyan)]',
  images: 'bg-[var(--pastel-cyan)] text-[var(--ink-cyan)]',
  documents: 'bg-[var(--pastel-cyan)] text-[var(--ink-cyan)]',
};

export const SourcePermissions: React.FC = () => {
  const {
    integrations,
    toggleIntegrationDemo,
    syncIntegrationDemo,
    setUploadModalOpen,
    pushToast,
  } = useLivingMemory();
  const [inspectingId, setInspectingId] = useState<IntegrationState['id'] | null>(null);
  const navigate = useNavigate();

  const inspected = integrations.find((i) => i.id === inspectingId) || null;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Screen 05 · Source Connection & Permissions"
        title="Source Permissions & Read-Only Boundaries"
        subtitle="Review exactly what Living Memory can inspect across your uploaded files and demo connectors."
        demoBanner="WhatsApp relies strictly on user-exported .txt files. Gmail and Google Calendar operate on local sample Demo Data without external OAuth credentials."
        actions={
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-gold)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            Open Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((item) => {
          const Icon = ICON_MAP[item.id] || FileText;
          const isActive = item.status !== 'Disconnected';

          return (
            <div
              key={item.id}
              className="ws-card flex flex-col justify-between rounded-xl p-5 transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${ICON_PASTEL_MAP[item.id] || 'bg-[var(--pastel-lavender)] text-[var(--ink-lavender)]'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-[var(--text-muted)]">{item.accountLabel}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${
                      isActive ? 'bg-[var(--pastel-green)] text-[var(--ink-green)]' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {item.description}
                </p>

                <div className="mt-4 space-y-1.5 border-t border-[var(--border-subtle)] pt-3 text-[11px] text-[var(--text-secondary)]">
                  <div>
                    <span className="text-[var(--text-muted)]">Scope: </span>
                    {item.permissionScope}
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Extracted types: </span>
                    {item.dataCategories.join(' · ')}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setInspectingId(item.id)}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                >
                  Inspect Permissions
                </button>

                {item.id === 'whatsapp' ? (
                  <Link
                    to="/groups/select"
                    className="rounded-lg bg-[var(--accent-gold)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Select Group Exports
                  </Link>
                ) : item.id === 'pdfs' || item.id === 'images' || item.id === 'documents' ? (
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="rounded-lg bg-[var(--accent-gold)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Upload File
                  </button>
                ) : (
                  <button
                    onClick={() => toggleIntegrationDemo(item.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      isActive
                        ? 'border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                        : 'bg-[var(--accent-gold)] text-white'
                    }`}
                  >
                    {isActive ? 'Disable Demo Feed' : 'Enable Demo Feed'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission Inspection Modal */}
      {inspected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#202124]/40 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="ws-card w-full max-w-lg rounded-2xl p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-[var(--accent-sage)]" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {inspected.name} · Permission Details
                </h3>
              </div>
              <button
                onClick={() => setInspectingId(null)}
                className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed text-[var(--text-secondary)]">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-2">
                <div>
                  <span className="font-medium text-[var(--text-primary)]">Access Mode: </span>
                  {inspected.readOnly ? 'Strictly Read-Only' : 'User-Selected'}
                </div>
                <div>
                  <span className="font-medium text-[var(--text-primary)]">Permission Scope: </span>
                  {inspected.permissionScope}
                </div>
                <div>
                  <span className="font-medium text-[var(--text-primary)]">Last Refresh: </span>
                  {inspected.lastSynced}
                </div>
              </div>

              <p>
                {inspected.id === 'whatsapp'
                  ? 'Living Memory cannot read private WhatsApp accounts directly. You decide which exported .txt chats to upload and which groups to analyze.'
                  : inspected.id === 'gmail' || inspected.id === 'calendar'
                  ? 'In this frontend demo stage, data comes from local sample fixtures so you can inspect email/calendar correlation safely without linking real Google OAuth tokens.'
                  : 'Uploaded documents and images remain scoped to your workspace with source citations preserved on every extracted memory.'}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              {(inspected.id === 'gmail' || inspected.id === 'calendar') && (
                <button
                  onClick={() => {
                    syncIntegrationDemo(inspected.id);
                    setInspectingId(null);
                  }}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)]"
                >
                  Simulate Demo Refresh
                </button>
              )}
              <button
                onClick={() => {
                  pushToast(`Reviewed permissions for ${inspected.name}`, 'success');
                  setInspectingId(null);
                }}
                className="rounded-lg bg-[var(--accent-gold)] px-4 py-2 text-xs font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
