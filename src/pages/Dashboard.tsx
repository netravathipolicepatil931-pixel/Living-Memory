import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  FileText,
  GitBranch,
  HelpCircle,
  Mail,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import {
  getCategoryPastelClass,
  getImportancePastelClass,
  getSourcePastelClass,
  getStatusPastelClass,
} from '../utils/categoryColors';

export const Dashboard: React.FC = () => {
  const {
    user,
    memories,
    gmailItems,
    deadlines,
    conflicts,
    commitments,
    questions,
    crossGroups,
    sources,
    googleSession,
    syncingGmail,
    connectGoogleWorkspace,
    syncRealGmail,
    openMemoryDrawer,
    setUploadModalOpen,
  } = useLivingMemory();

  const activeMemories = memories.filter((m) => m.verificationStatus !== 'Archived');
  const importantMemories = activeMemories.filter(
    (m) => (m.importanceScore ?? 60) >= 75 || m.priority !== 'Normal'
  );
  const upcomingDeadlines = deadlines
    .filter((d) => d.status !== 'Completed')
    .sort((a, b) => (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99'));

  const urgentEmails = gmailItems.filter(
    (g) => g.urgency === 'High' || (g.importanceScore ?? 0) >= 85
  );
  const activeConflicts = conflicts.filter((c) => c.status === 'Unresolved');
  const urgentItemsCount =
    urgentEmails.length +
    activeConflicts.length +
    upcomingDeadlines.filter((d) => d.status === 'Overdue').length;

  const openCommitments = commitments.filter(
    (c) => c.status === 'Pending' || c.status === 'Overdue' || c.status === 'Unconfirmed'
  );
  const openQuestions = questions.filter((q) => q.status !== 'Answer found');
  const replyEmails = gmailItems.filter((g) => g.requiresReply);
  const confirmDeadlines = deadlines.filter((d) => d.status === 'Needs Confirmation');
  const pendingActionsCount =
    openCommitments.length + openQuestions.length + replyEmails.length + confirmDeadlines.length;

  // Strictly 4 Key Metrics
  const keyMetrics = [
    {
      label: 'Important information',
      value: importantMemories.length + gmailItems.filter((g) => (g.importanceScore ?? 0) >= 75).length,
      to: '/information',
      badge: 'bg-[#1967D2]',
    },
    {
      label: 'Upcoming deadlines',
      value: upcomingDeadlines.length,
      to: '/deadlines',
      badge: 'bg-[#B06000]',
    },
    {
      label: 'Urgent items',
      value: urgentItemsCount,
      to: '/notifications',
      badge: 'bg-[#C5221F]',
    },
    {
      label: 'Pending actions',
      value: pendingActionsCount,
      to: '/deadlines',
      badge: 'bg-[#5E35B1]',
    },
  ];

  // Priority Inbox unified across sources
  const priorityInbox = [
    ...gmailItems.map((g) => ({
      id: g.id,
      title: g.subject,
      summary: g.shortSummary || g.preview,
      source: `Gmail · ${g.from}`,
      sourceType: 'Gmail',
      score: g.importanceScore ?? 70,
      category: g.importanceCategory || 'Medium',
      urgency: g.urgency || 'Medium',
      reason: g.importanceReason || 'Analyzed email thread',
      date: g.date,
      linkedMemoryId: g.linkedMemoryId,
      origin: g.dataOrigin || 'Demo',
    })),
    ...activeMemories
      .filter((m) => m.sourceType !== 'Gmail')
      .map((m) => ({
        id: m.id,
        title: m.title,
        summary: m.currentInformation,
        source: m.sourceName,
        sourceType: m.sourceType,
        score: m.importanceScore ?? 72,
        category: m.importanceCategory || 'Medium',
        urgency: m.urgency || 'Medium',
        reason: m.importanceReason || `${m.category} discovered in ${m.sourceName}`,
        date: m.lastUpdated,
        linkedMemoryId: m.id,
        origin: m.dataOrigin || 'Demo',
      })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const imageSourcesCount = sources.filter((s) => s.type === 'Image').length;
  const mediaSourcesCount = sources.filter((s) => s.type === 'Audio' || s.type === 'Video').length;
  const docSourcesCount = sources.filter(
    (s) => s.type === 'PDF Document' || s.type === 'DOCX Document' || s.type === 'Text File'
  ).length;
  const waSourcesCount = sources.filter(
    (s) => s.type === 'WhatsApp Export' || s.type === 'WhatsApp ZIP'
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good morning, ${user.name}`}
        subtitle="Here is what needs your attention."
        demoBanner={
          !googleSession.connected
            ? 'Showing sample workspace data alongside any files you import. Connect Gmail to analyze your live mailbox.'
            : undefined
        }
        actions={
          <>
            {!googleSession.connected ? (
              <GoogleSignInButton
                onClick={() => connectGoogleWorkspace().catch(() => {})}
                label="Connect Gmail"
              />
            ) : (
              <button
                onClick={() => syncRealGmail()}
                disabled={syncingGmail}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA] whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#1A73E8] ${syncingGmail ? 'animate-spin' : ''}`} />
                {syncingGmail ? 'Syncing...' : 'Sync Gmail'}
              </button>
            )}
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA] whitespace-nowrap shrink-0"
            >
              <Upload className="h-3.5 w-3.5 text-[#1A73E8]" />
              Import
            </button>
            <Link
              to="/ask"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1765CC] whitespace-nowrap shrink-0 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask Living Memory
            </Link>
          </>
        }
      />

      {/* 4 Key Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {keyMetrics.map((m) => (
          <Link
            key={m.label}
            to={m.to}
            className="ws-card rounded-xl p-4 transition-colors hover:border-[#1A73E8]/50"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-semibold tabular-nums text-[#202124]">
                {m.value}
              </span>
              <span className={`h-2.5 w-2.5 rounded-full ${m.badge}`} aria-hidden="true" />
            </div>
            <div className="mt-1.5 text-xs font-medium text-[#5F6368]">{m.label}</div>
          </Link>
        ))}
      </div>

      {/* Main Grid: Sections A–F */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* A. Priority Inbox */}
          <section className="ws-card rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#202124]">Priority Inbox</h2>
                <p className="text-xs text-[#5F6368]">
                  Most important information discovered across all sources
                </p>
              </div>
              <Link to="/information" className="text-xs font-medium text-[#1A73E8] hover:underline">
                Open My Information
              </Link>
            </div>

            <div className="mt-4 divide-y divide-[#DADCE0]">
              {priorityInbox.map((item) => (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-md px-2 py-0.5 font-medium ${getSourcePastelClass(item.sourceType)}`}>
                        {item.sourceType}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 font-mono font-medium tabular-nums ${getImportancePastelClass(item.category)}`}>
                        {item.score}/100 · {item.category}
                      </span>
                      <span className="rounded-md bg-[#F1F3F4] px-2 py-0.5 text-[#5F6368]">
                        Urgency: {item.urgency}
                      </span>
                    </div>
                    <span className="font-mono text-[#80868B]">{item.date}</span>
                  </div>

                  <h3 className="mt-1.5 text-sm font-semibold text-[#202124]">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#5F6368]">{item.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="text-[#80868B]">
                      Why: <span className="text-[#5F6368]">{item.reason}</span>
                    </span>
                    <button
                      onClick={() => openMemoryDrawer(item.linkedMemoryId)}
                      className="font-medium text-[#1A73E8] hover:underline whitespace-nowrap shrink-0"
                    >
                      Inspect Evidence
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* C. Recent Updates */}
          <section className="ws-card rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#202124]">Recent Updates</h2>
                <p className="text-xs text-[#5F6368]">
                  Newly discovered changes, cross-source connections, and conflicts
                </p>
              </div>
              <Link to="/notifications" className="text-xs font-medium text-[#1A73E8] hover:underline">
                View Notifications
              </Link>
            </div>

            <div className="mt-3 space-y-3">
              {activeConflicts.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-[#DADCE0] bg-[#FCE8E6]/45 p-3.5"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#FCE8E6] px-2 py-0.5 font-medium text-[#C5221F]">
                      <AlertCircle className="h-3 w-3" />
                      Conflict Detected · {c.conflictType}
                    </span>
                    <span className="font-mono text-[#80868B]">{c.detectedAt}</span>
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-[#202124]">{c.title}</div>
                  <p className="mt-1 text-xs text-[#5F6368]">{c.suggestedResolution}</p>
                  <button
                    onClick={() => openMemoryDrawer(c.memoryId)}
                    className="mt-2 text-xs font-medium text-[#1A73E8] hover:underline"
                  >
                    Compare Sources
                  </button>
                </div>
              ))}

              {crossGroups.map((cg) => (
                <div
                  key={cg.id}
                  className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-3.5"
                >
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-[#EDE7F6] px-2 py-0.5 text-[11px] font-medium text-[#5E35B1]">
                    <GitBranch className="h-3 w-3" />
                    Cross-Source Update
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-[#202124]">{cg.topic}</div>
                  <p className="mt-1 text-xs text-[#5F6368]">{cg.whatChanged}</p>
                  <button
                    onClick={() => openMemoryDrawer(cg.linkedMemoryId)}
                    className="mt-2 text-xs font-medium text-[#1A73E8] hover:underline"
                  >
                    View Version History
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* F. Recent Memories */}
          <section className="ws-card rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#202124]">Recent Memories</h2>
                <p className="text-xs text-[#5F6368]">
                  Important details LIVING MEMORY has preserved with source evidence
                </p>
              </div>
              <Link to="/memories" className="text-xs font-medium text-[#1A73E8] hover:underline">
                All Memories
              </Link>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {activeMemories.slice(0, 4).map((m) => (
                <button
                  key={m.id}
                  onClick={() => openMemoryDrawer(m.id)}
                  className="rounded-xl border border-[#DADCE0] bg-[#FFFFFF] p-3.5 text-left hover:border-[#1A73E8]/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={`rounded-md px-2 py-0.5 font-medium ${getCategoryPastelClass(m.category)}`}>
                      {m.category}
                    </span>
                    <span className="font-mono text-[#80868B]">{m.eventTime}</span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-[#202124] line-clamp-1">
                    {m.title}
                  </div>
                  <p className="mt-1 text-[11px] text-[#5F6368] line-clamp-2">
                    {m.currentInformation}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* B. Upcoming Deadlines */}
          <section className="ws-card rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#202124]">Upcoming Deadlines</h2>
                <p className="text-xs text-[#5F6368]">Chronological schedule across sources</p>
              </div>
              <Link to="/deadlines" className="text-xs font-medium text-[#1A73E8] hover:underline">
                Open Calendar
              </Link>
            </div>

            <div className="mt-3 space-y-2.5">
              {upcomingDeadlines.slice(0, 5).map((dl) => (
                <div
                  key={dl.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[#DADCE0] bg-[#FFFFFF] p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span
                        className={`rounded px-1.5 py-0.5 font-medium ${
                          dl.originKind === 'Google Calendar'
                            ? 'bg-[#D2E3FC] text-[#1967D2]'
                            : dl.originKind === 'User Reminder'
                            ? 'bg-[#EDE7F6] text-[#5E35B1]'
                            : 'bg-[#FEF7E0] text-[#B06000]'
                        }`}
                      >
                        {dl.originKind}
                      </span>
                      <span className="font-mono tabular-nums text-[#5F6368]">
                        {dl.date || 'Date needs confirmation'} · {dl.time}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#202124] truncate">
                      {dl.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#5F6368] truncate">
                      {dl.sourceName}
                    </div>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium whitespace-nowrap shrink-0 ${getStatusPastelClass(
                      dl.status
                    )}`}
                  >
                    {dl.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* D. Needs Your Attention */}
          <section className="ws-card rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#202124]">Needs Your Attention</h2>
                <p className="text-xs text-[#5F6368]">
                  Pending tasks, unanswered questions, and follow-ups
                </p>
              </div>
              <Link to="/memories?tab=commitments" className="text-xs font-medium text-[#1A73E8] hover:underline">
                Review All
              </Link>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              {confirmDeadlines.slice(0, 2).map((dl) => (
                <Link
                  key={dl.id}
                  to="/deadlines"
                  className="block rounded-xl border border-[#DADCE0] bg-[#FEF7E0]/60 p-3 hover:border-[#B06000]"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#B06000]">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Confirm Ambiguous Deadline
                  </div>
                  <div className="mt-1 font-medium text-[#202124]">{dl.title}</div>
                </Link>
              ))}

              {openCommitments.slice(0, 2).map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-3"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1 font-medium text-[#5E35B1]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Commitment · {c.owner}
                    </span>
                    <span className="font-mono text-[#80868B]">Due {c.dueDate}</span>
                  </div>
                  <div className="mt-1 font-medium text-[#202124]">{c.title}</div>
                </div>
              ))}

              {openQuestions.slice(0, 2).map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-3"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1 font-medium text-[#B06000]">
                      <HelpCircle className="h-3.5 w-3.5" />
                      Unanswered Question · {q.askedBy}
                    </span>
                    <span className="text-[#80868B]">{q.status}</span>
                  </div>
                  <div className="mt-1 text-[#202124]">{q.question}</div>
                </div>
              ))}
            </div>
          </section>

          {/* E. Connected Sources */}
          <section className="ws-card rounded-xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#202124]">Connected Sources</h2>
              <Link to="/information" className="text-xs font-medium text-[#1A73E8] hover:underline">
                Manage Sources
              </Link>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2.5">
                <span className="flex items-center gap-2 font-medium text-[#202124]">
                  <Mail className="h-4 w-4 text-[#C5221F]" />
                  Gmail
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                    googleSession.connected
                      ? 'bg-[#CEEAD6] text-[#137333]'
                      : 'bg-[#FEF7E0] text-[#B06000]'
                  }`}
                >
                  {googleSession.connected ? `Connected (${gmailItems.length})` : 'Demo / Not Linked'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2.5">
                <span className="flex items-center gap-2 font-medium text-[#202124]">
                  <Calendar className="h-4 w-4 text-[#1967D2]" />
                  Google Calendar
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                    googleSession.connected
                      ? 'bg-[#CEEAD6] text-[#137333]'
                      : 'bg-[#FEF7E0] text-[#B06000]'
                  }`}
                >
                  {googleSession.connected ? 'Read-Only Connected' : 'Demo Schedule'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2.5">
                <span className="flex items-center gap-2 font-medium text-[#202124]">
                  <MessageSquareText className="h-4 w-4 text-[#137333]" />
                  WhatsApp Exports
                </span>
                <span className="rounded bg-[#CEEAD6] px-2 py-0.5 font-mono text-[11px] font-medium text-[#137333]">
                  {waSourcesCount} imported
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3 py-2.5">
                <span className="flex items-center gap-2 font-medium text-[#202124]">
                  <FileText className="h-4 w-4 text-[#007B83]" />
                  Documents & Media
                </span>
                <span className="rounded bg-[#D2EAF7] px-2 py-0.5 font-mono text-[11px] font-medium text-[#007B83]">
                  {docSourcesCount} docs · {imageSourcesCount} imgs · {mediaSourcesCount} A/V
                </span>
              </div>
            </div>

            <Link
              to="/information"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-2 text-xs font-medium text-[#1A73E8] hover:bg-[#F8F9FA]"
            >
              Explore All Information
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
};
