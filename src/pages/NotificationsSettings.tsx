import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertOctagon,
  Bell,
  CheckCheck,
  ExternalLink,
  HelpCircle,
  Trash2,
  X,
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { PageHeader } from '../components/common/PageHeader';
import { useLivingMemory } from '../context/LivingMemoryContext';
import { NotificationItem } from '../types/memory';
import { PASTEL_BADGES } from '../utils/categoryColors';

const CATEGORIES: Array<'All' | NotificationItem['category']> = [
  'All',
  'Urgent',
  'Important',
  'Updates',
  'AI Insights',
];

export const NotificationsSettings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  const {
    notifications,
    conflicts,
    questions,
    settings,
    updateSettings,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    clearNotifications,
    resolveConflict,
    updateQuestionStatus,
    openMemoryDrawer,
    pushToast,
  } = useLivingMemory();

  const [catFilter, setCatFilter] = useState<'All' | NotificationItem['category']>('All');
  const [viewSection, setViewSection] = useState<'feed' | 'conflicts' | 'questions'>(
    urlTab === 'conflicts' || urlTab === 'questions' ? urlTab : 'feed'
  );

  useEffect(() => {
    if (urlTab === 'conflicts' || urlTab === 'questions' || urlTab === 'feed') {
      setViewSection(urlTab);
    }
  }, [urlTab]);

  const selectSection = (sec: 'feed' | 'conflicts' | 'questions') => {
    setViewSection(sec);
    setSearchParams(sec === 'feed' ? {} : { tab: sec });
  };

  const visible = notifications.filter(
    (n) => catFilter === 'All' || n.category === catFilter
  );

  const unresolvedConflicts = conflicts.filter((c) => c.status === 'Unresolved');
  const openQuestions = questions.filter((q) => q.status !== 'Answer found');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Important discoveries, deadline shifts, cross-source conflicts, unanswered questions, and alert preferences."
        actions={
          <>
            <button
              onClick={markAllNotificationsRead}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-medium text-[#202124] hover:bg-[#F8F9FA]"
            >
              <CheckCheck className="h-3.5 w-3.5 text-[#1A73E8]" />
              Mark All Read
            </button>
            <button
              onClick={clearNotifications}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3.5 py-2 text-xs text-[#C5221F] hover:bg-[#FCE8E6]/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Feed
            </button>
          </>
        }
      />

      {/* Contextual Tabs: Feed | Conflicts | Unanswered Questions */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#DADCE0] pb-3">
        <button
          onClick={() => selectSection('feed')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${
            viewSection === 'feed'
              ? 'bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8]/30'
              : 'border border-[#DADCE0] bg-[#FFFFFF] text-[#5F6368]'
          }`}
        >
          Notifications ({notifications.length})
        </button>
        <button
          onClick={() => selectSection('conflicts')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium ${
            viewSection === 'conflicts'
              ? 'bg-[#FCE8E6] text-[#C5221F] border border-[#C5221F]/30'
              : 'border border-[#DADCE0] bg-[#FFFFFF] text-[#5F6368]'
          }`}
        >
          <AlertOctagon className="h-3.5 w-3.5" />
          Conflicts ({unresolvedConflicts.length} unresolved)
        </button>
        <button
          onClick={() => selectSection('questions')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium ${
            viewSection === 'questions'
              ? 'bg-[#FEF7E0] text-[#B06000] border border-[#B06000]/30'
              : 'border border-[#DADCE0] bg-[#FFFFFF] text-[#5F6368]'
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Unanswered Questions ({openQuestions.length})
        </button>
      </div>

      {/* Preferences Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <label className="ws-card flex items-center justify-between rounded-xl p-4 cursor-pointer">
          <div>
            <div className="text-xs font-semibold text-[#202124]">
              Proactive Context Alerts
            </div>
            <div className="text-[11px] text-[#5F6368]">
              Notify only for important discoveries & overdue items.
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.proactiveAlertsEnabled}
            onChange={(e) => {
              updateSettings({ proactiveAlertsEnabled: e.target.checked });
              pushToast('Notification preference updated', 'success');
            }}
            className="h-4 w-4 accent-[#1A73E8]"
          />
        </label>

        <label className="ws-card flex items-center justify-between rounded-xl p-4 cursor-pointer">
          <div>
            <div className="text-xs font-semibold text-[#202124]">
              Conflict & Date Shift Alerts
            </div>
            <div className="text-[11px] text-[#5F6368]">
              Detect when Gmail, Calendar, and WhatsApp diverge.
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.conflictAlerts}
            onChange={(e) => {
              updateSettings({ conflictAlerts: e.target.checked });
              pushToast('Conflict alert setting updated', 'success');
            }}
            className="h-4 w-4 accent-[#1A73E8]"
          />
        </label>

        <div className="ws-card flex items-center justify-between rounded-xl p-4">
          <div>
            <div className="text-xs font-semibold text-[#202124]">Morning Digest Time</div>
            <div className="text-[11px] text-[#5F6368]">Daily attention summary.</div>
          </div>
          <select
            value={settings.digestTime}
            onChange={(e) =>
              updateSettings({ digestTime: e.target.value as '07:30' | '08:00' | '09:00' })
            }
            className="rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-2.5 py-1.5 font-mono text-xs text-[#202124]"
          >
            <option value="07:30">07:30 AM</option>
            <option value="08:00">08:00 AM</option>
            <option value="09:00">09:00 AM</option>
          </select>
        </div>
      </div>

      {/* SECTION: NOTIFICATION FEED */}
      {viewSection === 'feed' && (
        <>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  catFilter === c
                    ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8]'
                    : 'border-[#DADCE0] bg-[#FFFFFF] text-[#5F6368] hover:bg-[#F8F9FA]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Notifications are clear"
              description="Important deadlines, conflicts, and newly analyzed discoveries will appear here."
            />
          ) : (
            <div className="space-y-3">
              {visible.map((n) => {
                const catClass =
                  n.category === 'Urgent'
                    ? PASTEL_BADGES.red
                    : n.category === 'Important'
                    ? PASTEL_BADGES.yellow
                    : n.category === 'AI Insights'
                    ? PASTEL_BADGES.lavender
                    : PASTEL_BADGES.blue;
                return (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`ws-card cursor-pointer rounded-xl p-4 transition-all ${
                      n.read ? 'opacity-80' : 'border-[#1A73E8]/50 bg-[#E8F0FE]/25'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${catClass}`}>
                          {n.category}
                        </span>
                        <span className="text-[#5F6368]">{n.sourceRef}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[#80868B]">
                          {n.timestamp} {n.read ? '· Read' : '· Unread'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(n.id);
                          }}
                          className="rounded p-1 text-[#80868B] hover:bg-[#F1F3F4] hover:text-[#202124]"
                          aria-label="Dismiss notification"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-1.5 text-sm font-semibold text-[#202124]">{n.title}</h3>
                    <p className="mt-1 text-xs text-[#5F6368]">{n.message}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      {n.linkedMemoryId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openMemoryDrawer(n.linkedMemoryId!);
                          }}
                          className="inline-flex items-center gap-1 font-medium text-[#1A73E8] hover:underline"
                        >
                          Review Evidence
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                      {n.actionRoute && (
                        <Link
                          to={n.actionRoute}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#202124] hover:underline"
                        >
                          Open Related Information
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SECTION: CONFLICT DETECTION */}
      {viewSection === 'conflicts' && (
        <div className="space-y-4">
          {conflicts.map((c) => (
            <div key={c.id} className="ws-card rounded-xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="rounded-md bg-[#FCE8E6] px-2.5 py-0.5 font-medium text-[#C5221F]">
                  {c.conflictType} · {c.status}
                </span>
                <span className="font-mono text-[#80868B]">{c.detectedAt}</span>
              </div>
              <h3 className="text-base font-semibold text-[#202124]">{c.title}</h3>
              <p className="text-xs text-[#5F6368]">{c.suggestedResolution}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                {c.claims.map((cl) => (
                  <div
                    key={cl.id}
                    className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-3.5 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#202124]">{cl.sourceName}</span>
                      <span className="font-mono text-[11px] text-[#80868B]">{cl.timestamp}</span>
                    </div>
                    <div className="font-medium text-[#1A73E8]">{cl.value}</div>
                    <p className="italic text-[#5F6368]">“{cl.excerpt}”</p>
                    <div className="text-[11px] text-[#80868B]">{cl.reliabilityBasis}</div>
                    {c.status === 'Unresolved' && (
                      <button
                        onClick={() => resolveConflict(c.id, 'Confirmed Latest', cl.value)}
                        className="mt-1 rounded-lg bg-[#1A73E8] px-3 py-1 text-[11px] font-medium text-white"
                      >
                        Confirm This Version
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION: UNANSWERED QUESTIONS */}
      {viewSection === 'questions' && (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="ws-card rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="rounded-md bg-[#FEF7E0] px-2 py-0.5 font-medium text-[#B06000]">
                  {q.status}
                </span>
                <span className="font-mono text-[#80868B]">
                  Asked by {q.askedBy} · {q.date}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#202124]">{q.question}</h3>
              <div className="text-xs text-[#5F6368]">Source: {q.sourceName}</div>
              {q.possibleAnswer && (
                <div className="rounded-lg bg-[#CEEAD6]/60 p-2.5 text-xs text-[#137333]">
                  <strong>Possible Answer Found: </strong>
                  {q.possibleAnswer}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                {q.status !== 'Answer found' && (
                  <button
                    onClick={() => updateQuestionStatus(q.id, 'Answer found')}
                    className="rounded-lg bg-[#1A73E8] px-3 py-1.5 text-[11px] font-medium text-white"
                  >
                    Mark Answered
                  </button>
                )}
                <button
                  onClick={() => openMemoryDrawer(q.linkedMemoryId)}
                  className="text-xs font-medium text-[#1A73E8] hover:underline"
                >
                  Inspect Evidence
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
