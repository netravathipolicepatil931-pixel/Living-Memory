import React, { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Check,
  ExternalLink,
  FileAudio,
  FileText,
  FileVideo,
  FolderOpen,
  GitBranch,
  Image as ImageIcon,
  Loader2,
  Mail,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Unlink,
  Upload,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { GmailItem, ImportanceCategory, SourceItem } from '../types/memory';
import {
  getImportancePastelClass,
  getSourcePastelClass,
  getStatusPastelClass,
} from '../utils/categoryColors';

type InfoTab =
  | 'all'
  | 'gmail'
  | 'whatsapp'
  | 'images'
  | 'videos'
  | 'audio'
  | 'documents'
  | 'calendar';

const SOURCE_TABS: Array<{ id: InfoTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'gmail', label: 'Gmail' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'images', label: 'Images and Screenshots' },
  { id: 'videos', label: 'Videos' },
  { id: 'audio', label: 'Audio' },
  { id: 'documents', label: 'Documents and PDFs' },
  { id: 'calendar', label: 'Calendar' },
];

type GmailSubView =
  | 'all'
  | 'important'
  | 'urgent'
  | 'deadlines'
  | 'replies'
  | 'informational';

function parseTimestampToSeconds(ts: string): number {
  const parts = ts.replace(/[\[\]]/g, '').split(':').map(Number);
  if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export const MyInformation: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as InfoTab) || 'all';
  const [activeTab, setActiveTab] = useState<InfoTab>(
    SOURCE_TABS.some((t) => t.id === initialTab) ? initialTab : 'all'
  );

  const {
    sources,
    gmailItems,
    groups,
    groupMessages,
    crossGroups,
    calendarEvents,
    googleSession,
    serverGmailStatus,
    activeJobs,
    syncingGmail,
    syncingCalendar,
    settings,
    updateSettings,
    connectGoogleWorkspace,
    disconnectGoogleWorkspace,
    syncRealGmail,
    syncRealCalendar,
    deleteSource,
    deleteWhatsAppGroup,
    correctEmailImportance,
    correctSourceExtraction,
    openMemoryDrawer,
    setUploadModalOpen,
  } = useLivingMemory();

  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d'>('all');
  const [importanceFilter, setImportanceFilter] = useState<'All' | ImportanceCategory>('All');
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'source' | 'group'; id: string; name: string } | null>(
    null
  );

  // Gmail sub-views & editor state
  const [gmailSubView, setGmailSubView] = useState<GmailSubView>('all');
  const [selectedEmailId, setSelectedEmailId] = useState<string>(gmailItems[0]?.id || '');
  const [editingImportance, setEditingImportance] = useState(false);
  const [editScore, setEditScore] = useState(75);
  const [editReason, setEditReason] = useState('');

  // WhatsApp bucket filter
  const [waBucket, setWaBucket] = useState<string>('All');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('All');

  // Rich Source Detail modal state
  const [detailSource, setDetailSource] = useState<SourceItem | null>(null);
  const [ocrDraft, setOcrDraft] = useState('');
  const [summaryDraft, setSummaryDraft] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const selectTab = (tab: InfoTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'all' ? {} : { tab });
  };

  const openSourceDetail = (s: SourceItem) => {
    setDetailSource(s);
    setOcrDraft(s.ocrText || '');
    setSummaryDraft(s.aiSummary || '');
  };

  const filteredSources = useMemo(() => {
    const nowMs = Date.now();
    return sources.filter((s) => {
      if (activeTab === 'gmail' && s.type !== 'Gmail') return false;
      if (activeTab === 'whatsapp' && s.type !== 'WhatsApp Export' && s.type !== 'WhatsApp ZIP') {
        return false;
      }
      if (activeTab === 'images' && s.type !== 'Image') return false;
      if (activeTab === 'videos' && s.type !== 'Video') return false;
      if (activeTab === 'audio' && s.type !== 'Audio') return false;
      if (
        activeTab === 'documents' &&
        s.type !== 'PDF Document' &&
        s.type !== 'DOCX Document' &&
        s.type !== 'Text File'
      ) {
        return false;
      }
      if (activeTab === 'calendar' && s.type !== 'Google Calendar') return false;

      if (dateFilter !== 'all') {
        const dt = Date.parse(s.uploadDate);
        if (!Number.isNaN(dt)) {
          const days = (nowMs - dt) / 86400000;
          if (dateFilter === '7d' && days > 7) return false;
          if (dateFilter === '30d' && days > 30) return false;
        }
      }

      if (query.trim()) {
        const hay = `${s.name} ${s.type} ${s.aiSummary || ''} ${s.ocrText || ''} ${s.authorityBasis}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [sources, activeTab, dateFilter, query]);

  const filteredEmails = useMemo(() => {
    return gmailItems.filter((gm) => {
      if (gmailSubView === 'important' && (gm.importanceScore ?? 0) < 75) return false;
      if (gmailSubView === 'urgent' && gm.urgency !== 'High') return false;
      if (gmailSubView === 'deadlines' && !gm.detectedDeadline && gm.category !== 'Deadlines') {
        return false;
      }
      if (gmailSubView === 'replies' && !gm.requiresReply) return false;
      if (gmailSubView === 'informational' && (gm.importanceScore ?? 50) >= 50) return false;

      if (importanceFilter !== 'All' && gm.importanceCategory !== importanceFilter) return false;

      if (query.trim()) {
        const hay = `${gm.subject} ${gm.from} ${gm.shortSummary || gm.preview} ${gm.body}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [gmailItems, gmailSubView, importanceFilter, query]);

  const activeEmail: GmailItem | undefined =
    filteredEmails.find((e) => e.id === selectedEmailId) || filteredEmails[0];

  const runningJobs = activeJobs.filter(
    (j) => j.status === 'Uploaded' || j.status === 'Processing'
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Information"
        subtitle="Connect Gmail and Google Calendar, import WhatsApp exports, images, audio, video, and documents in one source hub."
        actions={
          <>
            {!googleSession.connected ? (
              <GoogleSignInButton
                onClick={() => connectGoogleWorkspace().catch(() => {})}
                label="Connect Gmail"
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => syncRealGmail()}
                  disabled={syncingGmail}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-2 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA] whitespace-nowrap shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-[#1A73E8] ${syncingGmail ? 'animate-spin' : ''}`} />
                  {syncingGmail ? 'Syncing Gmail...' : 'Sync Gmail'}
                </button>
                <button
                  onClick={() => disconnectGoogleWorkspace()}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-2 text-xs font-medium text-[#5F6368] hover:text-[#C5221F] whitespace-nowrap shrink-0"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Disconnect
                </button>
              </div>
            )}
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1765CC] whitespace-nowrap shrink-0 shadow-xs"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </button>
          </>
        }
      />

      {/* Active Background Processing Status Banner */}
      {runningJobs.length > 0 && (
        <div className="ws-card rounded-xl border-[#1A73E8]/30 bg-[#E8F0FE]/60 p-4 space-y-2">
          {runningJobs.map((job) => (
            <div key={job.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2 font-medium text-[#1967D2]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {job.title} — {job.status}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-[#1967D2]">
                  {job.progress}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#D2E3FC]">
                <div
                  className="h-full bg-[#1A73E8] transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <div className="text-[11px] text-[#5F6368]">{job.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* 8 Source Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-[#DADCE0] pb-3">
        {SOURCE_TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8]/30'
                  : 'border border-[#DADCE0] bg-[#FFFFFF] text-[#5F6368] hover:bg-[#F8F9FA] hover:text-[#202124]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search & Filters Bar */}
      <div className="ws-card flex flex-wrap items-center gap-3 rounded-xl p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#80868B]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sources, emails, OCR text, transcripts, or summaries..."
            className="w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] py-2 pl-9 pr-3 text-xs text-[#202124] placeholder:text-[#80868B] focus:border-[#1A73E8] focus:bg-[#FFFFFF] focus:outline-none"
          />
        </div>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
          aria-label="Date filter"
          className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#202124]"
        >
          <option value="all">Date: Any time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>

        {activeTab === 'gmail' && (
          <select
            value={importanceFilter}
            onChange={(e) => setImportanceFilter(e.target.value as typeof importanceFilter)}
            aria-label="Importance filter"
            className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#202124]"
          >
            <option value="All">Importance: All</option>
            <option value="Critical">Critical (90–100)</option>
            <option value="High">High (75–89)</option>
            <option value="Medium">Medium (50–74)</option>
            <option value="Low">Low (25–49)</option>
            <option value="Informational">Informational (0–24)</option>
          </select>
        )}
      </div>

      {/* GMAIL TAB CONTENT */}
      {activeTab === 'gmail' && (
        <div className="space-y-4">
          {/* Connection Status & Optional Sync Date Range */}
          <div className="ws-card rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FCE8E6] text-[#C5221F]">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#202124]">
                      {googleSession.connected && googleSession.email
                        ? googleSession.email
                        : 'Gmail (Sample Demo Preview)'}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                        googleSession.connected
                          ? 'bg-[#CEEAD6] text-[#137333]'
                          : 'bg-[#FEF7E0] text-[#B06000]'
                      }`}
                    >
                      {googleSession.connected
                        ? 'Read-Only Connected'
                        : serverGmailStatus && !serverGmailStatus.oauthConfigured
                        ? 'Not configured'
                        : 'Not Connected'}
                    </span>
                  </div>
                  <p className="text-xs text-[#5F6368]">
                    Synchronizes accessible non-spam, non-trash messages (inbox, archived, and sent) with Gemini AI importance scoring.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <label className="flex items-center gap-1.5 text-[#5F6368]">
                  <span>From:</span>
                  <input
                    type="date"
                    value={settings.gmailAfterDate}
                    onChange={(e) => updateSettings({ gmailAfterDate: e.target.value })}
                    className="rounded-md border border-[#DADCE0] bg-[#F8F9FA] px-2 py-1 text-xs text-[#202124]"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[#5F6368]">
                  <span>To:</span>
                  <input
                    type="date"
                    value={settings.gmailBeforeDate}
                    onChange={(e) => updateSettings({ gmailBeforeDate: e.target.value })}
                    className="rounded-md border border-[#DADCE0] bg-[#F8F9FA] px-2 py-1 text-xs text-[#202124]"
                  />
                </label>
                {googleSession.connected && (
                  <button
                    onClick={() => syncRealGmail()}
                    disabled={syncingGmail}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#1765CC] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncingGmail ? 'animate-spin' : ''}`} />
                    Sync Now
                  </button>
                )}
              </div>
            </div>

            {!googleSession.connected && serverGmailStatus && !serverGmailStatus.oauthConfigured && (
              <div className="rounded-lg border border-[#DADCE0] bg-[#FEF7E0]/60 px-3.5 py-2.5 text-xs text-[#5F6368]">
                <span className="font-semibold text-[#B06000]">Google OAuth setup required:</span>{' '}
                Configure <span className="font-mono text-[#202124]">GOOGLE_CLIENT_ID</span> and{' '}
                <span className="font-mono text-[#202124]">GOOGLE_CLIENT_SECRET</span> with authorized redirect URI{' '}
                <span className="font-mono text-[#1A73E8] break-all">{serverGmailStatus.redirectUri}</span>.
              </div>
            )}

            {/* Gmail Sub-view Chips */}
            <div className="flex flex-wrap gap-1.5 border-t border-[#DADCE0] pt-3">
              {(
                [
                  { id: 'all', label: 'All emails' },
                  { id: 'important', label: 'Important emails' },
                  { id: 'urgent', label: 'Urgent emails' },
                  { id: 'deadlines', label: 'Emails with deadlines' },
                  { id: 'replies', label: 'Emails requiring replies' },
                  { id: 'informational', label: 'Informational emails' },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setGmailSubView(v.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    gmailSubView === v.id
                      ? 'bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8]/30'
                      : 'border border-[#DADCE0] bg-[#FFFFFF] text-[#5F6368] hover:bg-[#F8F9FA]'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gmail Master-Detail */}
          {filteredEmails.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No emails match this filter"
              description="Adjust your importance or sub-view filter, or sync your Gmail account."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5 space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
                {filteredEmails.map((gm) => (
                  <button
                    key={gm.id}
                    onClick={() => {
                      setSelectedEmailId(gm.id);
                      setEditingImportance(false);
                    }}
                    className={`ws-card w-full rounded-xl p-4 text-left transition-colors ${
                      activeEmail?.id === gm.id
                        ? 'border-[#1A73E8] bg-[#E8F0FE]/45'
                        : 'hover:bg-[#F8F9FA]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono font-medium tabular-nums ${getImportancePastelClass(
                            gm.importanceCategory || 'Medium'
                          )}`}
                        >
                          {gm.importanceScore ?? 70}/100 · {gm.importanceCategory || 'Medium'}
                        </span>
                        <span className="rounded-md bg-[#F1F3F4] px-1.5 py-0.5 text-[#5F6368]">
                          Urgency: {gm.urgency || 'Medium'}
                        </span>
                      </div>
                      <span className="font-mono text-[#80868B]">{gm.date}</span>
                    </div>

                    <div className="mt-1.5 text-sm font-semibold text-[#202124]">{gm.subject}</div>
                    <div className="mt-0.5 text-xs text-[#5F6368]">{gm.from}</div>
                    <p className="mt-1.5 line-clamp-2 text-xs text-[#5F6368]">
                      {gm.shortSummary || gm.preview}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      {gm.detectedDeadline && (
                        <span className="rounded bg-[#FEF7E0] px-2 py-0.5 font-mono text-[#B06000]">
                          Deadline: {gm.detectedDeadline}
                        </span>
                      )}
                      {gm.actionRequired && gm.actionRequired !== 'None' && (
                        <span className="text-[#1A73E8] truncate">
                          Action: {gm.actionRequired}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {activeEmail && (
                <div className="ws-card lg:col-span-7 rounded-xl p-6 space-y-4 h-fit">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#DADCE0] pb-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono font-medium tabular-nums ${getImportancePastelClass(
                            activeEmail.importanceCategory || 'Medium'
                          )}`}
                        >
                          Importance: {activeEmail.importanceScore ?? 70}/100 ({activeEmail.importanceCategory || 'Medium'})
                        </span>
                        <span className="rounded-md bg-[#F1F3F4] px-2 py-0.5 text-[#5F6368]">
                          Urgency: {activeEmail.urgency || 'Medium'}
                        </span>
                        <span className="rounded-md bg-[#FCE8E6] px-2 py-0.5 text-[#C5221F]">
                          {activeEmail.dataOrigin === 'Live' ? 'Live Gmail' : 'Demo Sample'}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-[#202124]">
                        {activeEmail.subject}
                      </h3>
                      <div className="mt-1 text-xs text-[#5F6368]">
                        From: {activeEmail.from} ({activeEmail.fromEmail}) · {activeEmail.date}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {activeEmail.gmailUrl && (
                        <a
                          href={activeEmail.gmailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-2 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA]"
                        >
                          Open in Gmail
                          <ExternalLink className="h-3.5 w-3.5 text-[#1A73E8]" />
                        </a>
                      )}
                      {activeEmail.linkedMemoryId && (
                        <button
                          onClick={() => openMemoryDrawer(activeEmail.linkedMemoryId)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1765CC]"
                        >
                          Inspect Memory
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Importance Explanation + User Correction */}
                  <div className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#202124]">
                        Why this importance score was assigned
                      </span>
                      <button
                        onClick={() => {
                          setEditScore(activeEmail.importanceScore ?? 70);
                          setEditReason(activeEmail.importanceReason || '');
                          setEditingImportance((prev) => !prev);
                        }}
                        className="inline-flex items-center gap-1 font-medium text-[#1A73E8] hover:underline"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        {editingImportance ? 'Cancel' : 'Adjust Importance'}
                      </button>
                    </div>
                    <p className="text-[#5F6368]">{activeEmail.importanceReason}</p>
                    {activeEmail.actionRequired && activeEmail.actionRequired !== 'None' && (
                      <div className="text-[#202124]">
                        <strong>Action required:</strong> {activeEmail.actionRequired}
                      </div>
                    )}

                    {editingImportance && (
                      <div className="mt-3 space-y-2.5 border-t border-[#DADCE0] pt-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[#5F6368]">
                            Corrected Importance Score: <span className="font-mono font-semibold text-[#202124]">{editScore}/100</span>
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={editScore}
                            onChange={(e) => setEditScore(Number(e.target.value))}
                            className="mt-1 w-full accent-[#1A73E8]"
                          />
                        </div>
                        <input
                          type="text"
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder="Reason for correction (helps future scoring)..."
                          className="w-full rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#202124]"
                        />
                        <button
                          onClick={() => {
                            correctEmailImportance(activeEmail.id, editScore, editReason);
                            setEditingImportance(false);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#1A73E8] px-3 py-1.5 text-xs font-medium text-white"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Save Feedback
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Email Body */}
                  <div className="whitespace-pre-line text-sm leading-relaxed text-[#202124]">
                    {activeEmail.body}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* WHATSAPP TAB CONTENT */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="ws-card flex flex-wrap items-center justify-between gap-4 rounded-xl p-5">
            <div>
              <h2 className="text-sm font-semibold text-[#202124]">
                Imported WhatsApp Groups ({groups.length})
              </h2>
              <p className="text-xs text-[#5F6368]">
                Upload exported WhatsApp `.txt` chats or `.zip` archives with media. LIVING MEMORY never scrapes private WhatsApp accounts silently.
              </p>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1765CC]"
            >
              <Upload className="h-3.5 w-3.5" />
              Import WhatsApp Export
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((grp) => (
              <div key={grp.id} className="ws-card rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="rounded-md bg-[#CEEAD6] px-2 py-0.5 font-medium text-[#137333]">
                        {grp.category}
                      </span>
                      <span className="font-mono text-[#80868B]">
                        {grp.messageCount} messages · {grp.extractedMemories} extracted
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-[#202124]">{grp.name}</h3>
                  </div>
                  <button
                    onClick={() =>
                      setDeleteTarget({ kind: 'group', id: grp.id, name: grp.name })
                    }
                    className="rounded-lg p-1.5 text-[#80868B] hover:bg-[#FCE8E6] hover:text-[#C5221F]"
                    title="Delete group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-[#5F6368]">{grp.description}</p>
                {grp.participants && grp.participants.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {grp.participants.slice(0, 6).map((p) => (
                      <span
                        key={p}
                        className="rounded bg-[#F1F3F4] px-2 py-0.5 text-[10px] text-[#5F6368]"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Cross-Group Intelligence */}
          {crossGroups.length > 0 && (
            <div className="ws-card rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#202124]">
                <GitBranch className="h-4 w-4 text-[#5E35B1]" />
                Cross-Group & Cross-Source Connections
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {crossGroups.map((cg) => (
                  <div
                    key={cg.id}
                    className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-4 space-y-2 text-xs"
                  >
                    <div className="font-semibold text-[#202124]">{cg.topic}</div>
                    <p className="text-[#5F6368]">{cg.whatChanged}</p>
                    <div className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] p-2.5 text-[11px]">
                      <div className="text-[#80868B]">Latest Authoritative Info</div>
                      <div className="mt-0.5 font-medium text-[#202124]">
                        {cg.latestAuthoritativeInfo}
                      </div>
                    </div>
                    <button
                      onClick={() => openMemoryDrawer(cg.linkedMemoryId)}
                      className="font-medium text-[#1A73E8] hover:underline"
                    >
                      Inspect Full Version History
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Organized Group Messages */}
          <div className="ws-card rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#202124]">
                Organized Group Intelligence
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-2.5 py-1.5 text-xs text-[#202124]"
                >
                  <option value="All">All Groups</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <select
                  value={waBucket}
                  onChange={(e) => setWaBucket(e.target.value)}
                  className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-2.5 py-1.5 text-xs text-[#202124]"
                >
                  {[
                    'All',
                    'Assignments',
                    'Deadlines',
                    'Events',
                    'Announcements',
                    'Decisions',
                    'Responsibilities',
                    'Questions',
                    'Updates',
                    'Duplicate messages',
                  ].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="divide-y divide-[#DADCE0]">
              {groupMessages
                .filter(
                  (m) =>
                    (selectedGroupId === 'All' || m.groupId === selectedGroupId) &&
                    (waBucket === 'All' || m.bucket === waBucket)
                )
                .slice(0, 12)
                .map((m) => (
                  <div key={m.id} className="py-3 first:pt-0 last:pb-0 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#202124]">{m.sender}</span>
                        <span className="rounded bg-[#E8F0FE] px-2 py-0.5 text-[10px] font-medium text-[#1A73E8]">
                          {m.bucket}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-[#80868B]">{m.timestamp}</span>
                    </div>
                    <p className="mt-1 text-[#5F6368]">{m.content}</p>
                    {m.linkedMemoryId && (
                      <button
                        onClick={() => openMemoryDrawer(m.linkedMemoryId!)}
                        className="mt-1 text-[11px] font-medium text-[#1A73E8] hover:underline"
                      >
                        Inspect Connected Memory
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR TAB CONTENT */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="ws-card flex flex-wrap items-center justify-between gap-4 rounded-xl p-5">
            <div>
              <h2 className="text-sm font-semibold text-[#202124]">
                Google Calendar (Read-Only)
              </h2>
              <p className="text-xs text-[#5F6368]">
                LIVING MEMORY reads calendar events to correlate with emails and deadlines, and never silently alters your Google Calendar.
              </p>
            </div>
            {googleSession.connected ? (
              <button
                onClick={() => syncRealCalendar()}
                disabled={syncingCalendar}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#1765CC]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncingCalendar ? 'animate-spin' : ''}`} />
                {syncingCalendar ? 'Syncing...' : 'Sync Calendar'}
              </button>
            ) : (
              <GoogleSignInButton
                onClick={() => connectGoogleWorkspace().catch(() => {})}
                label="Connect Google Calendar"
              />
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {calendarEvents.map((ev) => (
              <div key={ev.id} className="ws-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="rounded-md bg-[#D2E3FC] px-2 py-0.5 font-medium text-[#1967D2]">
                    {ev.calendarName} · {ev.dataOrigin === 'Live' ? 'Live' : 'Demo'}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 font-medium ${getStatusPastelClass(ev.status)}`}>
                    {ev.status}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#202124]">{ev.title}</div>
                <div className="font-mono text-xs text-[#5F6368]">
                  {ev.date} · {ev.startTime}–{ev.endTime} · {ev.location}
                </div>
                <p className="text-xs text-[#5F6368]">{ev.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IMPORTED SOURCES GRID (Shown on All, Images, Videos, Audio, Documents) */}
      {activeTab !== 'gmail' && activeTab !== 'calendar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#202124]">
              Imported & Indexed Sources ({filteredSources.length})
            </h2>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="text-xs font-medium text-[#1A73E8] hover:underline"
            >
              + Import {activeTab === 'all' ? 'new source' : activeTab}
            </button>
          </div>

          {filteredSources.length === 0 ? (
            <EmptyState
              icon={
                activeTab === 'images'
                  ? ImageIcon
                  : activeTab === 'audio'
                  ? FileAudio
                  : activeTab === 'videos'
                  ? FileVideo
                  : FolderOpen
              }
              title={`No ${activeTab === 'all' ? 'sources' : activeTab} found`}
              description="Click Import to upload screenshots, photos, audio recordings, videos, PDFs, DOCX, or WhatsApp exports."
              actionLabel="Import Now"
              onAction={() => setUploadModalOpen(true)}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredSources.map((s) => (
                <div
                  key={s.id}
                  className="ws-card flex flex-col justify-between rounded-xl p-5 transition-shadow hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className={`rounded-md px-2 py-0.5 font-medium ${getSourcePastelClass(s.type)}`}>
                            {s.type}
                          </span>
                          <span className="text-[#80868B]">
                            {s.dataOrigin === 'Live' ? 'Live Import' : 'Demo Sample'}
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-sm font-semibold text-[#202124] break-all">
                          {s.name}
                        </h3>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium whitespace-nowrap shrink-0 ${getStatusPastelClass(
                          s.processingStatus
                        )}`}
                      >
                        {s.processingStatus}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-[#5F6368]">
                      {s.aiSummary || s.authorityBasis}
                    </p>

                    {s.importantDiscoveries && s.importantDiscoveries.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {s.importantDiscoveries.slice(0, 3).map((disc, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-[#E8F0FE] px-2 py-0.5 text-[11px] text-[#1A73E8]"
                          >
                            {disc}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-[#DADCE0] bg-[#F8F9FA] p-2.5 text-[11px]">
                      <div>
                        <div className="text-[#80868B]">Imported</div>
                        <div className="font-mono text-[#202124]">{s.uploadDate}</div>
                      </div>
                      <div>
                        <div className="text-[#80868B]">Items Analyzed</div>
                        <div className="font-mono text-[#202124]">{s.recordCount}</div>
                      </div>
                      <div>
                        <div className="text-[#80868B]">Discovered</div>
                        <div className="font-mono font-semibold text-[#1A73E8]">
                          {s.extractedMemoriesCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#DADCE0] pt-3 text-xs">
                    <button
                      onClick={() => openSourceDetail(s)}
                      className="font-medium text-[#1A73E8] hover:underline"
                    >
                      Open Details
                    </button>
                    <button
                      onClick={() =>
                        setDeleteTarget({ kind: 'source', id: s.id, name: s.name })
                      }
                      className="inline-flex items-center gap-1 text-xs text-[#C5221F] hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Source
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rich Source Detail Modal (Image OCR correction, Audio/Video player + timestamps, Document reliability) */}
      {detailSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#202124]/45 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-[#DADCE0] bg-[#FFFFFF] p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#DADCE0] pb-3">
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`rounded-md px-2 py-0.5 font-medium ${getSourcePastelClass(detailSource.type)}`}>
                    {detailSource.type}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 font-medium ${getStatusPastelClass(detailSource.processingStatus)}`}>
                    {detailSource.processingStatus}
                  </span>
                </div>
                <h3 className="mt-1.5 text-base font-semibold text-[#202124] break-all">
                  {detailSource.name}
                </h3>
              </div>
              <button
                onClick={() => setDetailSource(null)}
                className="rounded-lg p-1.5 text-[#5F6368] hover:bg-[#F8F9FA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Source Reliability Basis */}
            <div className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-3.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#202124]">
                <ShieldCheck className="h-4 w-4 text-[#137333]" />
                Source Reliability: {detailSource.verificationState}
              </div>
              <p className="mt-1 text-[#5F6368]">{detailSource.authorityBasis}</p>
            </div>

            {/* Media Previews */}
            {detailSource.type === 'Image' && detailSource.mediaUrl && (
              <div className="overflow-hidden rounded-xl border border-[#DADCE0] bg-[#F8F9FA]">
                <img
                  src={detailSource.mediaUrl}
                  alt={detailSource.name}
                  className="max-h-72 w-full object-contain"
                />
              </div>
            )}

            {detailSource.type === 'Audio' && detailSource.mediaUrl && (
              <div className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-4">
                <div className="text-xs font-medium text-[#202124] mb-2">Original Audio</div>
                <audio ref={audioRef} controls src={detailSource.mediaUrl} className="w-full" />
              </div>
            )}

            {detailSource.type === 'Video' && detailSource.mediaUrl && (
              <div className="overflow-hidden rounded-xl border border-[#DADCE0] bg-black">
                <video
                  ref={videoRef}
                  controls
                  src={detailSource.mediaUrl}
                  className="max-h-72 w-full"
                />
              </div>
            )}

            {/* Clickable Timestamps for Audio / Video */}
            {detailSource.timestamps && detailSource.timestamps.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#202124]">Important Timestamps</div>
                <div className="flex flex-wrap gap-2">
                  {detailSource.timestamps.map((ts, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const sec = parseTimestampToSeconds(ts.time);
                        if (videoRef.current) {
                          videoRef.current.currentTime = sec;
                          videoRef.current.play().catch(() => {});
                        }
                        if (audioRef.current) {
                          audioRef.current.currentTime = sec;
                          audioRef.current.play().catch(() => {});
                        }
                      }}
                      className="rounded-lg border border-[#DADCE0] bg-[#E8F0FE] px-2.5 py-1.5 text-xs text-[#1A73E8] hover:bg-[#D2E3FC]"
                    >
                      <span className="font-mono font-semibold">{ts.time}</span> · {ts.topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Editable AI Summary & OCR / Transcript */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#202124]">AI Summary (Editable)</label>
                <textarea
                  rows={3}
                  value={summaryDraft}
                  onChange={(e) => setSummaryDraft(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] p-2.5 text-xs text-[#202124]"
                />
              </div>

              {(detailSource.ocrText !== undefined || detailSource.type === 'Image') && (
                <div>
                  <label className="block font-semibold text-[#202124]">
                    Extracted OCR Text (Correct any errors)
                  </label>
                  <textarea
                    rows={4}
                    value={ocrDraft}
                    onChange={(e) => setOcrDraft(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] p-2.5 font-mono text-xs text-[#202124]"
                  />
                </div>
              )}

              {detailSource.transcript && (
                <div>
                  <div className="font-semibold text-[#202124]">Transcript</div>
                  <div className="mt-1 max-h-48 overflow-y-auto whitespace-pre-line rounded-lg border border-[#DADCE0] bg-[#F8F9FA] p-3 text-xs text-[#202124]">
                    {detailSource.transcript}
                  </div>
                </div>
              )}

              {detailSource.visibleText && detailSource.visibleText.length > 0 && (
                <div>
                  <div className="font-semibold text-[#202124]">Visible Text Detected in Video</div>
                  <ul className="mt-1 list-disc pl-5 text-[#5F6368] space-y-0.5">
                    {detailSource.visibleText.map((vt, i) => (
                      <li key={i}>{vt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#DADCE0] pt-3">
              <button
                onClick={() => setDetailSource(null)}
                className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#5F6368]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  correctSourceExtraction(detailSource.id, {
                    ocrText: ocrDraft,
                    aiSummary: summaryDraft,
                  });
                  setDetailSource(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1765CC]"
              >
                <Check className="h-3.5 w-3.5" />
                Save Corrections
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This deletes the imported source and its associated extracted records from LIVING MEMORY without altering your original external accounts or files."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget?.kind === 'source') deleteSource(deleteTarget.id);
          if (deleteTarget?.kind === 'group') deleteWhatsAppGroup(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
