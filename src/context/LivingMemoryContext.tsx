import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_ALERTS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_COMMITMENTS,
  INITIAL_CONFLICTS,
  INITIAL_CONTEXT_PROFILE,
  INITIAL_CROSS_GROUPS,
  INITIAL_DECISIONS,
  INITIAL_ENTITIES,
  INITIAL_FORGOTTEN_CONTEXT,
  INITIAL_GMAIL,
  INITIAL_GROUPS,
  INITIAL_GROUP_MESSAGES,
  INITIAL_IMPACTS,
  INITIAL_INTEGRATIONS,
  INITIAL_MEMORIES,
  INITIAL_NOTIFICATIONS,
  INITIAL_PREDICTIONS,
  INITIAL_PROJECTS,
  INITIAL_QUESTIONS,
  INITIAL_SOURCES,
  INITIAL_USER,
} from '../data/mockData';
import {
  BackendHealth,
  createWorkspaceSession,
  disconnectServerGmail,
  fetchBackendHealth,
  fetchGmailStatus,
  fetchSystemStatus,
  fetchWorkspaceSnapshotFromBackend,
  JobStatusResponse,
  persistClearWorkspace,
  persistConflictResolve,
  persistDeadlineConfirm,
  persistDeadlineCreate,
  persistDeadlineToggle,
  persistEmailImportance,
  persistMemoryDelete,
  persistMemoryPatch,
  persistNotificationDismiss,
  persistNotificationRead,
  persistSourceCorrection,
  persistSourceDelete,
  pollJobUntilDone,
  ServerGmailStatus,
  startGmailSyncJob,
  startMediaIngestJob,
  startServerSideGmailOAuth,
  startWhatsAppAnalysisJob,
  syncGoogleCalendarEvents,
  SystemStatus,
  updateBackendPreferences,
} from '../services/backendApi';
import {
  getGoogleSessionInfo,
  GoogleSessionInfo,
  signInWithGoogleWorkspace,
  signOutGoogleWorkspace,
} from '../services/googleAuth';
import { memoryService } from '../services/memoryService';
import {
  CalendarEventItem,
  Commitment,
  Conflict,
  ContextProfileItem,
  CrossGroupThread,
  DecisionRecord,
  Entity,
  ForgottenMemoryItem,
  GmailItem,
  GroupMessage,
  ImpactScenario,
  ImportanceCategory,
  IntegrationState,
  LifePredictionItem,
  Memory,
  NotificationItem,
  ProactiveAlert,
  ProjectItem,
  SourceItem,
  SourceType,
  ThemeMode,
  ToastMessage,
  UnansweredQuestion,
  UnifiedDeadline,
  UrgencyLevel,
  User,
  WhatsAppGroup,
} from '../types/memory';

export interface AppSettings {
  autoDetectConflicts: boolean;
  impactSensitivity: 'Balanced' | 'High' | 'Conservative';
  retentionPolicy: '90 Days' | '1 Year' | 'Indefinite';
  digestTime: '07:30' | '08:00' | '09:00';
  emailDigest: boolean;
  proactiveAlertsEnabled: boolean;
  conflictAlerts: boolean;
  gmailLabels: string[];
  gmailIncludeStarred: boolean;
  gmailExcludeSpamTrash: boolean;
  gmailDateRange: 'Last 14 Days' | 'Last 30 Days' | 'Semester';
  gmailAfterDate: string;
  gmailBeforeDate: string;
  gmailHistoryId?: string;
  calendarSelected: string[];
  userTimezone: string;
  importanceCorrectionHints: string[];
}

const DETECTED_TZ =
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    : 'UTC';

const DEFAULT_SETTINGS: AppSettings = {
  autoDetectConflicts: true,
  impactSensitivity: 'Balanced',
  retentionPolicy: '1 Year',
  digestTime: '08:00',
  emailDigest: true,
  proactiveAlertsEnabled: true,
  conflictAlerts: true,
  gmailLabels: ['Faculty', 'Project', 'Meetings'],
  gmailIncludeStarred: true,
  gmailExcludeSpamTrash: true,
  gmailDateRange: 'Last 30 Days',
  gmailAfterDate: '',
  gmailBeforeDate: '',
  gmailHistoryId: undefined,
  calendarSelected: ['Academic', 'AI Project'],
  userTimezone: DETECTED_TZ,
  importanceCorrectionHints: [],
};

function scoreToCat(score: number): ImportanceCategory {
  if (score >= 90) return 'Critical';
  if (score >= 75) return 'High';
  if (score >= 50) return 'Medium';
  if (score >= 25) return 'Low';
  return 'Informational';
}

function enrichInitialGmail(items: GmailItem[]): GmailItem[] {
  return items.map((gm) => {
    const isUrgentDeadline = gm.id === 'gm-1' || gm.category === 'Deadlines';
    const isReview = gm.id === 'gm-2';
    const isFollowup = gm.id === 'gm-3';
    const score = isUrgentDeadline ? 95 : isReview ? 86 : isFollowup ? 78 : 60;
    return {
      ...gm,
      importanceScore: gm.importanceScore ?? score,
      importanceCategory: gm.importanceCategory ?? scoreToCat(score),
      urgency: gm.urgency ?? (isUrgentDeadline ? 'High' : isReview ? 'Medium' : 'Medium'),
      importanceReason:
        gm.importanceReason ??
        (isUrgentDeadline
          ? 'Official extension changing final submission deadline to Nov 20; impacts project schedule.'
          : isReview
          ? 'Mandatory mid-term evaluation details with Professor Meera in Lab 304.'
          : 'Teammate follow-up containing a deliverable commitment for Nov 16.'),
      shortSummary: gm.shortSummary ?? gm.preview,
      actionRequired:
        gm.actionRequired ??
        (isUrgentDeadline
          ? 'Update submission plan and verify Calendar alignment'
          : isReview
          ? 'Prepare 10-minute provenance walkthrough for Nov 18'
          : 'Confirm receipt of evaluation numbers with Sarah'),
      requiresReply: gm.requiresReply ?? isFollowup,
      detectedDeadline: isUrgentDeadline ? '2026-11-20' : isReview ? '2026-11-18' : '2026-11-16',
      gmailUrl: gm.gmailUrl ?? 'https://mail.google.com',
      dataOrigin: gm.dataOrigin ?? 'Demo',
    };
  });
}

function enrichInitialMemories(items: Memory[]): Memory[] {
  return items.map((m) => {
    const score = m.priority === 'Urgent' ? 92 : m.priority === 'High' ? 80 : 62;
    return {
      ...m,
      importanceScore: m.importanceScore ?? score,
      importanceCategory: m.importanceCategory ?? scoreToCat(score),
      urgency: m.urgency ?? (m.priority === 'Urgent' ? 'High' : m.priority === 'High' ? 'Medium' : 'Low'),
      importanceReason:
        m.importanceReason ??
        `${m.category} extracted from ${m.sourceName} (${m.confidence} confidence).`,
      dataOrigin: m.dataOrigin ?? 'Demo',
    };
  });
}

function buildInitialDeadlines(): UnifiedDeadline[] {
  return [
    {
      id: 'dl-1',
      title: 'Rahul Docker Ingestion Test Log',
      date: '2026-11-14',
      time: '18:00',
      timezone: DETECTED_TZ,
      sourceName: 'AI Project Team (WhatsApp)',
      sourceType: 'WhatsApp Export',
      originKind: 'AI-Extracted',
      importanceScore: 76,
      importanceCategory: 'High',
      urgency: 'High',
      status: 'Pending',
      supportingEvidence: 'Rahul promised to share the Docker ingestion pipeline test log tomorrow.',
      confidence: 'High',
      isExplicit: true,
      linkedMemoryId: 'mem-sarah-slides',
      relatedTask: 'Verify ingestion pipeline stability before rehearsal',
      dataOrigin: 'Demo',
    },
    {
      id: 'dl-2',
      title: 'Team Meeting (Rescheduled)',
      date: '2026-11-15',
      time: '16:30',
      timezone: DETECTED_TZ,
      sourceName: 'Google Calendar (Demo)',
      sourceType: 'Google Calendar',
      originKind: 'Google Calendar',
      importanceScore: 72,
      importanceCategory: 'Medium',
      urgency: 'Medium',
      status: 'Pending',
      supportingEvidence: 'Team Meeting moved to Library Room B 16:30–17:30.',
      confidence: 'High',
      isExplicit: true,
      linkedMemoryId: 'mem-team-meeting-shift',
      dataOrigin: 'Demo',
    },
    {
      id: 'dl-3',
      title: 'Sarah Presentation Slides 1–10',
      date: '2026-11-16',
      time: '20:00',
      timezone: DETECTED_TZ,
      sourceName: 'AI Project Team & Gmail',
      sourceType: 'Gmail',
      originKind: 'AI-Extracted',
      importanceScore: 84,
      importanceCategory: 'High',
      urgency: 'Medium',
      status: 'Pending',
      supportingEvidence: 'Sarah: "I will complete the presentation slides and error analysis tables by Nov 16 evening."',
      confidence: 'High',
      isExplicit: true,
      linkedMemoryId: 'mem-sarah-slides',
      relatedTask: 'Review slides before Nov 17 dry run',
      dataOrigin: 'Demo',
    },
    {
      id: 'dl-4',
      title: 'Project Review with Professor Meera',
      date: '2026-11-18',
      time: '14:00',
      timezone: DETECTED_TZ,
      sourceName: 'Gmail · Project review email',
      sourceType: 'Gmail',
      originKind: 'Google Calendar',
      importanceScore: 91,
      importanceCategory: 'Critical',
      urgency: 'High',
      status: 'Pending',
      supportingEvidence: 'Confirmed in Innovation Lab 304 for 10-minute provenance walkthrough.',
      confidence: 'High',
      isExplicit: true,
      linkedMemoryId: 'mem-project-review',
      dataOrigin: 'Demo',
    },
    {
      id: 'dl-5',
      title: 'AI Systems Assignment Final Submission',
      date: '2026-11-20',
      time: '23:59',
      timezone: DETECTED_TZ,
      sourceName: 'Academic Office Gmail & College Announcements',
      sourceType: 'Gmail',
      originKind: 'AI-Extracted',
      importanceScore: 96,
      importanceCategory: 'Critical',
      urgency: 'High',
      status: 'Pending',
      supportingEvidence: 'Official Notice: Assignment deadline formally extended to November 20, 23:59.',
      confidence: 'High',
      isExplicit: true,
      linkedMemoryId: 'mem-assignment-deadline',
      relatedTask: 'Submit final codebase, benchmark tables, and provenance report',
      history: [
        { date: '2026-11-15', source: 'Class Discussion (WhatsApp)', note: 'Initial discussed deadline' },
        { date: '2026-11-18', source: 'AI Project Team (WhatsApp)', note: 'Tentative extension discussed' },
        { date: '2026-11-20', source: 'Academic Office Gmail', note: 'Official extended deadline' },
      ],
      dataOrigin: 'Demo',
    },
    {
      id: 'dl-6',
      title: 'Smart Campus Presentation Session',
      date: '2026-11-22',
      time: '10:00',
      timezone: DETECTED_TZ,
      sourceName: 'Google Calendar (Demo)',
      sourceType: 'Google Calendar',
      originKind: 'Google Calendar',
      importanceScore: 78,
      importanceCategory: 'High',
      urgency: 'Low',
      status: 'Pending',
      supportingEvidence: 'Department Innovation Showcase in Auditorium B.',
      confidence: 'High',
      isExplicit: true,
      linkedMemoryId: 'mem-smart-campus-telemetry',
      dataOrigin: 'Demo',
    },
  ];
}

interface LivingMemoryContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;

  isAuthenticated: boolean;
  user: User;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;

  backendHealth: BackendHealth | null;
  systemStatus: SystemStatus | null;
  serverGmailStatus: ServerGmailStatus | null;
  googleSession: GoogleSessionInfo;
  activeJobs: JobStatusResponse[];
  syncingGmail: boolean;
  syncingCalendar: boolean;

  drawerMemoryId: string | null;
  openMemoryDrawer: (id: string) => void;
  closeMemoryDrawer: () => void;
  uploadModalOpen: boolean;
  setUploadModalOpen: (open: boolean) => void;

  toasts: ToastMessage[];
  pushToast: (title: string, tone?: ToastMessage['tone'], description?: string) => void;
  dismissToast: (id: string) => void;

  memories: Memory[];
  projects: ProjectItem[];
  entities: Entity[];
  sources: SourceItem[];
  groups: WhatsAppGroup[];
  groupMessages: GroupMessage[];
  gmailItems: GmailItem[];
  calendarEvents: CalendarEventItem[];
  deadlines: UnifiedDeadline[];
  commitments: Commitment[];
  questions: UnansweredQuestion[];
  decisions: DecisionRecord[];
  conflicts: Conflict[];
  alerts: ProactiveAlert[];
  contextProfile: ContextProfileItem[];
  forgottenContext: ForgottenMemoryItem[];
  impacts: ImpactScenario[];
  predictions: LifePredictionItem[];
  crossGroups: CrossGroupThread[];
  integrations: IntegrationState[];
  notifications: NotificationItem[];
  settings: AppSettings;

  loginDemo: (email?: string, name?: string) => void;
  logoutDemo: () => void;
  updateUser: (patch: Partial<User>) => void;
  completeOnboarding: (patch: Partial<User>, settingsPatch?: Partial<AppSettings>) => void;

  connectGoogleWorkspace: () => Promise<void>;
  disconnectGoogleWorkspace: () => Promise<void>;
  syncRealGmail: (options?: { afterDate?: string; beforeDate?: string; maxMessages?: number }) => Promise<void>;
  syncRealCalendar: () => Promise<void>;
  uploadAndAnalyzeMedia: (file: File) => Promise<SourceItem | null>;
  analyzeWhatsAppExportJob: (params: {
    groupName: string;
    messageCount: number;
    participants: string[];
    rawText: string;
    includeMedia: boolean;
    attachments: any[];
    fileSize: number;
    isZip: boolean;
    sampleMessages?: Array<{ timestamp: string; sender: string; content: string }>;
  }) => Promise<void>;

  correctEmailImportance: (emailId: string, score: number, reason: string) => void;
  correctSourceExtraction: (sourceId: string, patch: { ocrText?: string; aiSummary?: string }) => void;
  confirmDeadlineDate: (deadlineId: string, confirmedDate: string, confirmedTime?: string) => void;
  toggleDeadlineComplete: (deadlineId: string) => void;
  addUserReminder: (title: string, date: string, time: string, note?: string) => void;

  updateMemory: (id: string, patch: Partial<Memory>) => void;
  verifyMemory: (id: string) => void;
  archiveMemory: (id: string) => void;
  mergeMemory: (id: string) => void;
  correctMemoryInterpretation: (id: string, correctedInfo: string, reason: string) => void;
  addMemoryNote: (id: string, note: string) => void;
  deleteMemory: (id: string) => void;

  addSimulatedSource: (fileName: string, sizeBytes: number, type: SourceType) => SourceItem;
  deleteSource: (id: string) => void;
  deleteWhatsAppGroup: (groupId: string) => void;
  toggleGroupSelection: (groupId: string) => void;
  selectAllGroups: () => void;
  deselectAllGroups: () => void;
  analyzeSelectedGroups: () => number;

  toggleIntegrationDemo: (id: IntegrationState['id']) => void;
  syncIntegrationDemo: (id: IntegrationState['id']) => void;

  resolveConflict: (conflictId: string, status: Conflict['status'], chosenValue?: string) => void;
  updateAlertStatus: (alertId: string, status: ProactiveAlert['status']) => void;
  updateProfileItem: (id: string, patch: Partial<ContextProfileItem>) => void;
  removeProfileItem: (id: string) => void;
  updateCommitmentStatus: (id: string, status: Commitment['status'], note?: string) => void;
  updateQuestionStatus: (id: string, status: UnansweredQuestion['status'], answer?: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;

  updateSettings: (patch: Partial<AppSettings>) => void;
  deleteAllMemories: () => void;
  deleteAllSources: () => void;
  resetDemoData: () => void;
}

const LivingMemoryContext = createContext<LivingMemoryContextValue | undefined>(undefined);

export const LivingMemoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Enforce approved Google Calendar light system by default
  const [theme, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User>(INITIAL_USER);
  const [globalSearch, setGlobalSearch] = useState('');
  const [drawerMemoryId, setDrawerMemoryId] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [serverGmailStatus, setServerGmailStatus] = useState<ServerGmailStatus | null>(null);
  const [googleSession, setGoogleSession] = useState<GoogleSessionInfo>({
    connected: false,
    email: null,
    displayName: null,
    photoURL: null,
    hasAccessToken: false,
    workspaceConfigured: false,
  });
  const [activeJobs, setActiveJobs] = useState<JobStatusResponse[]>([]);
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [projects] = useState<ProjectItem[]>([]);
  const [entities] = useState<Entity[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [gmailItems, setGmailItems] = useState<GmailItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [deadlines, setDeadlines] = useState<UnifiedDeadline[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [questions, setQuestions] = useState<UnansweredQuestion[]>([]);
  const [decisions] = useState<DecisionRecord[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [contextProfile, setContextProfile] = useState<ContextProfileItem[]>([]);
  const [forgottenContext] = useState<ForgottenMemoryItem[]>([]);
  const [impacts] = useState<ImpactScenario[]>([]);
  const [predictions] = useState<LifePredictionItem[]>([]);
  const [crossGroups] = useState<CrossGroupThread[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationState[]>(INITIAL_INTEGRATIONS);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('living_memory_prefs_v2');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('living_memory_prefs_v2', JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }, [settings]);

  const refreshFromBackend = async () => {
    try {
      const [h, sys, gmStatus, snap] = await Promise.all([
        fetchBackendHealth(),
        fetchSystemStatus(),
        fetchGmailStatus(),
        fetchWorkspaceSnapshotFromBackend(),
      ]);
      setBackendHealth(h);
      setSystemStatus(sys);
      setServerGmailStatus(gmStatus);

      if (gmStatus.connected) {
        setGoogleSession({
          connected: true,
          email: gmStatus.email,
          displayName: gmStatus.email,
          photoURL: null,
          hasAccessToken: true,
          workspaceConfigured: true,
        });
        setIntegrations((prev) =>
          prev.map((intg) =>
            intg.id === 'gmail' || intg.id === 'calendar'
              ? {
                  ...intg,
                  status: 'Connected',
                  accountLabel: gmStatus.email || intg.accountLabel,
                  lastSynced: gmStatus.syncState?.last_sync_at || 'Connected — ready to sync',
                }
              : intg
          )
        );
      }

      setMemories(snap.memories);
      setSources(snap.sources);
      setDeadlines(snap.deadlines);
      setGmailItems(snap.emails);
      setConflicts(snap.conflicts);
      setNotifications(snap.notifications);
    } catch {
      // keep existing state cleanly if backend temporarily offline
    }
  };

  useEffect(() => {
    refreshFromBackend();
    getGoogleSessionInfo()
      .then((s) => {
        if (s.connected) setGoogleSession(s);
      })
      .catch(() => {});
  }, []);

  const pushToast = (
    title: string,
    tone: ToastMessage['tone'] = 'info',
    description?: string
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, description, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  const setTheme = (mode: ThemeMode) => setThemeState(mode);

  const loginDemo = (email?: string, name?: string) => {
    setIsAuthenticated(true);
    if (email || name) {
      setUser((prev) => ({
        ...prev,
        email: email || prev.email,
        name: name || prev.name,
      }));
    }
    createWorkspaceSession(email || user.email, name || user.name, 'demo')
      .then(() => refreshFromBackend())
      .catch(() => {});
    pushToast(`Signed in as ${name || user.name}`, 'success');
  };

  const logoutDemo = () => {
    setIsAuthenticated(false);
    setDrawerMemoryId(null);
    localStorage.removeItem('lm_auth_token');
    pushToast('Signed out', 'info');
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...patch }));
    updateBackendPreferences({
      full_name: patch.name,
      role: patch.role,
      use_mode: patch.useMode,
    }).catch(() => {});
  };

  const completeOnboarding = (patch: Partial<User>, settingsPatch?: Partial<AppSettings>) => {
    setUser((prev) => ({ ...prev, ...patch, onboardingCompleted: true }));
    if (settingsPatch) {
      setSettings((prev) => ({ ...prev, ...settingsPatch }));
    }
    updateBackendPreferences({
      full_name: patch.name,
      role: patch.role,
      use_mode: patch.useMode,
      onboarding_completed: true,
      timezone: settingsPatch?.userTimezone,
      digest_time: settingsPatch?.digestTime,
      retention_policy: settingsPatch?.retentionPolicy,
    }).catch(() => {});
    pushToast('Workspace preferences saved', 'success');
  };

  const upsertJob = (job: JobStatusResponse) => {
    setActiveJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === job.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = job;
        return next;
      }
      return [job, ...prev].slice(0, 8);
    });
  };

  const ingestExtractedItems = (
    sourceId: string,
    sourceName: string,
    sourceType: SourceType,
    items: any[]
  ) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newMemories: Memory[] = [];
    const newDeadlines: UnifiedDeadline[] = [];
    const newNotifs: NotificationItem[] = [];

    for (const item of items) {
      const memId = `mem-live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const score = Number(item.importanceScore ?? 65);
      const priority: Memory['priority'] = score >= 85 ? 'Urgent' : score >= 70 ? 'High' : 'Normal';

      newMemories.push({
        id: memId,
        title: item.title,
        description: item.summary,
        currentInformation: item.summary,
        category: item.memoryCategory || 'Important conversations',
        workspace: 'all',
        eventTime: item.deadline?.exactDate || now.slice(0, 10),
        recordedTime: now,
        lastUpdated: now,
        sourceId,
        sourceName,
        sourceType,
        confidence: item.confidence || 'Medium',
        verificationStatus: item.deadline?.needsConfirmation ? 'Needs Review' : 'Verified',
        relatedPeopleIds: [],
        relatedGroupIds: [],
        connectedMemoryIds: [],
        evidence: [
          {
            id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            sourceId,
            sourceName,
            sourceType,
            excerpt: item.supportingEvidence || item.summary,
            eventTime: item.deadline?.exactDate || now.slice(0, 10),
            recordedTime: now,
            author: item.peopleInvolved?.[0] || sourceName,
            pageOrTimestampRef: item.pageOrTimestampRef,
          },
        ],
        versions: [
          {
            id: `ver-${Date.now()}`,
            version: 1,
            summary: 'Extracted by Gemini AI from live source',
            value: item.summary,
            eventTime: item.deadline?.exactDate || now.slice(0, 10),
            recordedTime: now,
            sourceName,
            changedBy: 'LIVING MEMORY AI',
            reason: item.importanceReason || 'Automated extraction',
            status: 'Active',
          },
        ],
        userNotes: [],
        priority,
        importanceScore: score,
        importanceCategory: item.importanceCategory || scoreToCat(score),
        urgency: item.urgency || 'Medium',
        importanceReason: item.importanceReason,
        actionRequired: item.actionRequired,
        pageOrTimestampRef: item.pageOrTimestampRef,
        dataOrigin: 'Live',
      });

      if (item.deadline) {
        newDeadlines.push({
          id: `dl-live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: item.deadline.title || item.title,
          date: item.deadline.exactDate || '',
          time: item.deadline.time || '23:59',
          timezone: item.deadline.timezone || settings.userTimezone,
          sourceName,
          sourceType,
          originKind: 'AI-Extracted',
          importanceScore: score,
          importanceCategory: scoreToCat(score),
          urgency: item.urgency || 'Medium',
          status: item.deadline.needsConfirmation || !item.deadline.exactDate ? 'Needs Confirmation' : 'Pending',
          supportingEvidence: item.supportingEvidence || item.summary,
          confidence: item.confidence || 'Medium',
          isExplicit: Boolean(item.deadline.isExplicit),
          needsConfirmation: Boolean(item.deadline.needsConfirmation || !item.deadline.exactDate),
          confirmationPrompt: item.deadline.confirmationPrompt,
          linkedMemoryId: memId,
          relatedTask: item.deadline.relatedTask,
          dataOrigin: 'Live',
        });
      }

      if (score >= 75 || item.deadline?.needsConfirmation) {
        newNotifs.push({
          id: `ntf-live-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          title: item.deadline?.needsConfirmation
            ? `Confirm date: ${item.title}`
            : `${scoreToCat(score)}: ${item.title}`,
          message: item.summary,
          category: score >= 90 ? 'Urgent' : 'Important',
          timestamp: 'Just now',
          read: false,
          sourceRef: sourceName,
          linkedMemoryId: memId,
          actionRoute: item.deadline ? '/deadlines' : '/information',
        });
      }
    }

    if (newMemories.length > 0) setMemories((prev) => [...newMemories, ...prev]);
    if (newDeadlines.length > 0) setDeadlines((prev) => [...newDeadlines, ...prev]);
    if (newNotifs.length > 0) setNotifications((prev) => [...newNotifs, ...prev]);
  };

  const connectGoogleWorkspace = async () => {
    try {
      // Primary: Server-Side Google OAuth 2.0 flow with encrypted refresh token persistence
      if (systemStatus?.googleOAuthConfigured) {
        const res = await startServerSideGmailOAuth();
        await refreshFromBackend();
        setIsAuthenticated(true);
        if (res.email) {
          setUser((prev) => ({ ...prev, email: res.email || prev.email }));
        }
        pushToast(`Connected Gmail via Google OAuth: ${res.email || 'Authorized'}`, 'success');
        return;
      }

      // Secondary: Firebase Workspace OAuth if provisioned
      if (googleSession.workspaceConfigured) {
        const { user: gUser } = await signInWithGoogleWorkspace();
        const session = await getGoogleSessionInfo();
        setGoogleSession(session);
        setIsAuthenticated(true);
        setUser((prev) => ({
          ...prev,
          name: gUser.displayName || prev.name,
          email: gUser.email || prev.email,
          avatarUrl: gUser.photoURL || prev.avatarUrl,
        }));
        setIntegrations((prev) =>
          prev.map((intg) =>
            intg.id === 'gmail' || intg.id === 'calendar'
              ? {
                  ...intg,
                  status: 'Connected',
                  accountLabel: gUser.email || intg.accountLabel,
                  lastSynced: 'Connected — ready to sync',
                }
              : intg
          )
        );
        pushToast(`Connected Google account: ${gUser.email}`, 'success');
        return;
      }

      throw new Error(
        `Google OAuth credentials (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET) are not configured on the backend yet. Configure them with redirect URI: ${systemStatus?.googleRedirectUri || '/api/integrations/gmail/callback'}`
      );
    } catch (err: any) {
      pushToast('Google OAuth Setup Required', 'warning', err?.message);
      throw err;
    }
  };

  const disconnectGoogleWorkspace = async () => {
    await disconnectServerGmail().catch(() => {});
    await signOutGoogleWorkspace().catch(() => {});
    const st = await fetchGmailStatus().catch(() => null);
    if (st) setServerGmailStatus(st);
    setGoogleSession({
      connected: false,
      email: null,
      displayName: null,
      photoURL: null,
      hasAccessToken: false,
      workspaceConfigured: Boolean(systemStatus?.googleOAuthConfigured),
    });
    setIntegrations((prev) =>
      prev.map((intg) =>
        intg.id === 'gmail' || intg.id === 'calendar'
          ? { ...intg, status: 'Disconnected', lastSynced: 'Disconnected' }
          : intg
      )
    );
    pushToast('Disconnected Google account and revoked stored tokens', 'info');
  };

  const syncRealGmail = async (options?: {
    afterDate?: string;
    beforeDate?: string;
    maxMessages?: number;
  }) => {
    setSyncingGmail(true);
    try {
      const existingIds = gmailItems
        .map((g) => g.gmailMessageId)
        .filter((id): id is string => Boolean(id));

      const jobId = await startGmailSyncJob({
        maxMessages: options?.maxMessages ?? 20,
        afterDate: options?.afterDate ?? (settings.gmailAfterDate || undefined),
        beforeDate: options?.beforeDate ?? (settings.gmailBeforeDate || undefined),
        startHistoryId: settings.gmailHistoryId,
        existingIds,
        userTimezone: settings.userTimezone,
        userPriorities: user.importantCategories,
        correctionHints: settings.importanceCorrectionHints,
      });

      const finished = await pollJobUntilDone(jobId, upsertJob);
      const result = finished.result;
      const syncedEmails: any[] = result?.emails || [];
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

      if (result?.historyId) {
        setSettings((prev) => ({ ...prev, gmailHistoryId: result.historyId }));
      }

      const newGmailRecords: GmailItem[] = [];
      for (const em of syncedEmails) {
        const memId = `mem-gmail-${em.gmailMessageId}`;
        newGmailRecords.push({
          id: `gm-live-${em.gmailMessageId}`,
          gmailMessageId: em.gmailMessageId,
          threadId: em.threadId,
          from: em.from,
          fromEmail: em.fromEmail,
          recipients: em.recipients,
          subject: em.subject,
          preview: em.shortSummary || em.preview,
          body: em.body,
          date: em.date,
          label: em.labels?.[0] || 'Inbox',
          labels: em.labels,
          starred: (em.labels || []).includes('STARRED'),
          category: em.emailCategory || 'Important emails',
          linkedMemoryId: memId,
          attachmentsMetadata: em.attachmentsMetadata,
          gmailUrl: em.gmailUrl,
          importanceScore: em.importanceScore,
          importanceCategory: em.importanceCategory,
          urgency: em.urgency,
          importanceReason: em.importanceReason,
          shortSummary: em.shortSummary,
          actionRequired: em.actionRequired,
          requiresReply: em.requiresReply,
          detectedDeadline: em.extractedItems?.find((it: any) => it.deadline)?.deadline?.exactDate,
          dataOrigin: 'Live',
        });

        ingestExtractedItems(
          `src-gmail-live`,
          `Gmail · ${em.subject}`,
          'Gmail',
          em.extractedItems || []
        );
      }

      if (newGmailRecords.length > 0) {
        setGmailItems((prev) => {
          const existingSet = new Set(prev.map((x) => x.gmailMessageId));
          const uniqueNew = newGmailRecords.filter((x) => !existingSet.has(x.gmailMessageId));
          return [...uniqueNew, ...prev];
        });
      }

      setSources((prev) => {
        const withoutOld = prev.filter((s) => s.id !== 'src-gmail-live');
        return [
          {
            id: 'src-gmail-live',
            name: `Gmail (${result?.emailAddress || googleSession.email || 'Connected'})`,
            type: 'Gmail',
            uploadDate: now.slice(0, 10),
            processingStatus: 'Completed',
            recordCount: syncedEmails.length,
            extractedMemoriesCount: syncedEmails.reduce(
              (acc, e) => acc + (e.extractedItems?.length || 0),
              0
            ),
            sizeLabel: `${result?.syncMode || 'full'} sync`,
            authorityBasis: `Read-only Gmail API sync (${result?.skippedDuplicates || 0} duplicates skipped).`,
            verificationState: 'Direct Source',
            dataOrigin: 'Live',
          },
          ...withoutOld,
        ];
      });

      setIntegrations((prev) =>
        prev.map((intg) =>
          intg.id === 'gmail' ? { ...intg, status: 'Connected', lastSynced: now } : intg
        )
      );

      pushToast(
        `Gmail synced (${syncedEmails.length} analyzed)`,
        'success',
        `${result?.skippedDuplicates || 0} duplicates skipped.`
      );
      await refreshFromBackend();
    } catch (err: any) {
      pushToast('Gmail sync failed', 'danger', err?.message);
    } finally {
      setSyncingGmail(false);
    }
  };

  const syncRealCalendar = async () => {
    setSyncingCalendar(true);
    try {
      const events = await syncGoogleCalendarEvents();
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const mappedEvents: CalendarEventItem[] = events.map((ev) => ({
        id: `cal-live-${ev.googleEventId}`,
        googleEventId: ev.googleEventId,
        title: ev.title,
        date: ev.date,
        startTime: ev.startTime,
        endTime: ev.endTime,
        calendarName: ev.calendarName,
        location: ev.location,
        participants: ev.participants,
        description: ev.description,
        status: 'Confirmed',
        linkedMemoryId: 'mem-project-review',
        htmlLink: ev.htmlLink,
        dataOrigin: 'Live',
      }));

      setCalendarEvents((prev) => {
        const existingGoogleIds = new Set(mappedEvents.map((e) => e.googleEventId));
        const kept = prev.filter((p) => !p.googleEventId || !existingGoogleIds.has(p.googleEventId));
        return [...mappedEvents, ...kept];
      });

      const calDeadlines: UnifiedDeadline[] = mappedEvents.map((ev) => ({
        id: `dl-cal-${ev.googleEventId}`,
        title: ev.title,
        date: ev.date,
        time: ev.startTime,
        timezone: settings.userTimezone,
        sourceName: `Google Calendar (${ev.calendarName})`,
        sourceType: 'Google Calendar',
        originKind: 'Google Calendar',
        importanceScore: 72,
        importanceCategory: 'Medium',
        urgency: 'Medium',
        status: 'Pending',
        supportingEvidence: ev.description || `${ev.location} · ${ev.startTime}–${ev.endTime}`,
        confidence: 'High',
        isExplicit: true,
        dataOrigin: 'Live',
      }));

      setDeadlines((prev) => {
        const incomingIds = new Set(calDeadlines.map((d) => d.id));
        return [...calDeadlines, ...prev.filter((d) => !incomingIds.has(d.id))];
      });

      setIntegrations((prev) =>
        prev.map((intg) =>
          intg.id === 'calendar' ? { ...intg, status: 'Connected', lastSynced: now } : intg
        )
      );
      pushToast(`Synced ${mappedEvents.length} Google Calendar events (Read-Only)`, 'success');
    } catch (err: any) {
      pushToast('Calendar sync failed', 'danger', err?.message);
    } finally {
      setSyncingCalendar(false);
    }
  };

  const uploadAndAnalyzeMedia = async (file: File): Promise<SourceItem | null> => {
    const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    const sourceType: SourceType = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext)
      ? 'Image'
      : ['.mp3', '.wav', '.m4a', '.aac', '.ogg'].includes(ext)
      ? 'Audio'
      : ['.mp4', '.mov', '.webm'].includes(ext)
      ? 'Video'
      : ext === '.pdf'
      ? 'PDF Document'
      : ext === '.docx'
      ? 'DOCX Document'
      : 'Text File';

    const localUrl =
      sourceType === 'Image' || sourceType === 'Audio' || sourceType === 'Video'
        ? URL.createObjectURL(file)
        : undefined;

    const kb = Math.max(1, Math.round(file.size / 1024));
    const sizeLabel = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
    const tempId = `src-live-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    const pendingSource: SourceItem = {
      id: tempId,
      name: file.name,
      type: sourceType,
      uploadDate: today,
      processingStatus: 'Uploaded',
      recordCount: 1,
      extractedMemoriesCount: 0,
      sizeLabel,
      authorityBasis: `User-uploaded ${sourceType} awaiting AI extraction.`,
      verificationState: 'Direct Source',
      dataOrigin: 'Live',
      mediaUrl: localUrl,
    };
    setSources((prev) => [pendingSource, ...prev]);

    try {
      const jobId = await startMediaIngestJob(file, settings.userTimezone);
      setSources((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, processingStatus: 'Processing' } : s))
      );

      const finished = await pollJobUntilDone(jobId, upsertJob);
      const res = finished.result || {};
      const items = res.extractedItems || [];

      const updatedSource: SourceItem = {
        ...pendingSource,
        processingStatus: finished.status === 'Needs attention' ? 'Needs attention' : 'Completed',
        extractedMemoriesCount: items.length,
        aiSummary: res.summary,
        ocrText: res.ocrText,
        transcript: res.transcript,
        timestamps: res.timestamps,
        visibleText: res.visibleText,
        structuredDetails: res.structuredDetails,
        importantDiscoveries: items.map((it: any) => it.title),
        authorityBasis: `Analyzed via Gemini (${sourceType}) on ${today}.`,
      };

      setSources((prev) => prev.map((s) => (s.id === tempId ? updatedSource : s)));
      ingestExtractedItems(tempId, file.name, sourceType, items);
      await refreshFromBackend();
      pushToast(`Analyzed ${file.name}`, 'success', `${items.length} important items extracted.`);
      return updatedSource;
    } catch (err: any) {
      setSources((prev) =>
        prev.map((s) =>
          s.id === tempId
            ? { ...s, processingStatus: 'Failed', errorMessage: err?.message }
            : s
        )
      );
      pushToast(`Analysis failed for ${file.name}`, 'danger', err?.message);
      return null;
    }
  };

  const analyzeWhatsAppExportJob = async (params: {
    groupName: string;
    messageCount: number;
    participants: string[];
    rawText: string;
    includeMedia: boolean;
    attachments: any[];
    fileSize: number;
    isZip: boolean;
    sampleMessages?: Array<{ timestamp: string; sender: string; content: string }>;
  }) => {
    const srcId = `src-wa-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);
    const kb = Math.max(1, Math.round(params.fileSize / 1024));
    const sizeLabel = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

    const pendingSource: SourceItem = {
      id: srcId,
      name: `${params.groupName}.${params.isZip ? 'zip' : 'txt'}`,
      type: params.isZip ? 'WhatsApp ZIP' : 'WhatsApp Export',
      uploadDate: today,
      processingStatus: 'Processing',
      recordCount: params.messageCount,
      extractedMemoriesCount: 0,
      sizeLabel,
      authorityBasis: `User-exported WhatsApp chat (${params.participants.length} participants).`,
      verificationState: 'Peer Discussion',
      dataOrigin: 'Live',
    };
    setSources((prev) => [pendingSource, ...prev]);

    try {
      const jobId = await startWhatsAppAnalysisJob({
        groupName: params.groupName,
        rawText: params.rawText,
        includeMedia: params.includeMedia,
        attachments: params.attachments,
        userTimezone: settings.userTimezone,
      });

      const finished = await pollJobUntilDone(jobId, upsertJob);
      const res = finished.result || {};
      const items = res.extractedItems || [];

      const grpId = `grp-live-${Date.now()}`;
      const newGroup: WhatsAppGroup = {
        id: grpId,
        name: params.groupName,
        category: 'Projects',
        description: res.summary || `Imported WhatsApp chat with ${params.participants.join(', ')}`,
        messageCount: params.messageCount,
        lastMessageDate: today,
        importDate: today,
        selected: true,
        analyzed: true,
        extractedMemories: items.length,
        participants: params.participants,
        dataOrigin: 'Live',
      };
      setGroups((prev) => [newGroup, ...prev]);

      if (params.sampleMessages?.length) {
        const msgs: GroupMessage[] = params.sampleMessages.map((m, i) => ({
          id: `gm-wa-${Date.now()}-${i}`,
          groupId: grpId,
          sender: m.sender,
          timestamp: m.timestamp,
          content: m.content,
          bucket: 'Updates',
          priority: 'Normal',
        }));
        setGroupMessages((prev) => [...msgs, ...prev]);
      }

      setSources((prev) =>
        prev.map((s) =>
          s.id === srcId
            ? {
                ...s,
                processingStatus: finished.status === 'Needs attention' ? 'Needs attention' : 'Completed',
                extractedMemoriesCount: items.length,
                aiSummary: res.summary,
                importantDiscoveries: items.map((it: any) => it.title),
              }
            : s
        )
      );

      ingestExtractedItems(srcId, `WhatsApp · ${params.groupName}`, 'WhatsApp Export', items);
      await refreshFromBackend();
      pushToast(`Analyzed WhatsApp "${params.groupName}"`, 'success', `${items.length} items extracted.`);
    } catch (err: any) {
      setSources((prev) =>
        prev.map((s) =>
          s.id === srcId ? { ...s, processingStatus: 'Failed', errorMessage: err?.message } : s
        )
      );
      pushToast('WhatsApp analysis failed', 'danger', err?.message);
    }
  };

  const correctEmailImportance = (emailId: string, score: number, reason: string) => {
    const clamped = Math.max(0, Math.min(100, score));
    const cat = scoreToCat(clamped);
    const target = gmailItems.find((g) => g.id === emailId);

    setGmailItems((prev) =>
      prev.map((gm) =>
        gm.id === emailId
          ? {
              ...gm,
              importanceScore: clamped,
              importanceCategory: cat,
              importanceReason: reason || gm.importanceReason,
              userCorrectedImportance: true,
            }
          : gm
      )
    );

      if (target) {
      setSettings((prev) => ({
        ...prev,
        importanceCorrectionHints: [
          ...prev.importanceCorrectionHints.slice(-9),
          `For emails like "${target.subject}" from ${target.from}: user set score ${clamped}/100 (${cat}) because: ${reason}`,
        ],
      }));
    }
    if (target?.dataOrigin === 'Live') {
      persistEmailImportance(emailId, clamped, reason).catch(() => {});
    }
    pushToast(`Importance updated to ${clamped}/100 (${cat})`, 'success');
  };

  const correctSourceExtraction = (
    sourceId: string,
    patch: { ocrText?: string; aiSummary?: string }
  ) => {
    const target = sources.find((s) => s.id === sourceId);
    setSources((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, ...patch } : s))
    );
    if (target?.dataOrigin === 'Live') {
      persistSourceCorrection(sourceId, patch).catch(() => {});
    }
    pushToast('Saved extraction correction', 'success');
  };

  const confirmDeadlineDate = (deadlineId: string, confirmedDate: string, confirmedTime?: string) => {
    const target = deadlines.find((d) => d.id === deadlineId);
    setDeadlines((prev) =>
      prev.map((d) =>
        d.id === deadlineId
          ? {
              ...d,
              date: confirmedDate,
              time: confirmedTime || d.time,
              status: 'Pending',
              needsConfirmation: false,
              isExplicit: true,
              history: [
                ...(d.history || []),
                {
                  date: confirmedDate,
                  source: 'User Confirmation',
                  note: `User confirmed exact date ${confirmedDate}`,
                },
              ],
            }
          : d
      )
    );
    if (target?.dataOrigin === 'Live') {
      persistDeadlineConfirm(deadlineId, confirmedDate, confirmedTime).catch(() => {});
    }
    pushToast(`Confirmed deadline date: ${confirmedDate}`, 'success');
  };

  const toggleDeadlineComplete = (deadlineId: string) => {
    const target = deadlines.find((d) => d.id === deadlineId);
    setDeadlines((prev) =>
      prev.map((d) =>
        d.id === deadlineId
          ? { ...d, status: d.status === 'Completed' ? 'Pending' : 'Completed' }
          : d
      )
    );
    if (target?.dataOrigin === 'Live') {
      persistDeadlineToggle(deadlineId).catch(() => {});
    }
  };

  const addUserReminder = (title: string, date: string, time: string, note?: string) => {
    const newDl: UnifiedDeadline = {
      id: `dl-user-${Date.now()}`,
      title: title.trim(),
      date,
      time: time || '09:00',
      timezone: settings.userTimezone,
      sourceName: 'Personal Reminder',
      sourceType: 'Text File',
      originKind: 'User Reminder',
      importanceScore: 75,
      importanceCategory: 'High',
      urgency: 'Medium',
      status: 'Pending',
      supportingEvidence: note?.trim() || 'User-created reminder inside Living Memory.',
      confidence: 'High',
      isExplicit: true,
      dataOrigin: 'Live',
    };
    setDeadlines((prev) => [newDl, ...prev]);
    persistDeadlineCreate({
      title: title.trim(),
      date,
      time: time || '09:00',
      timezone: settings.userTimezone,
      supportingEvidence: note?.trim() || 'User-created reminder inside Living Memory.',
    })
      .then(() => refreshFromBackend())
      .catch(() => {});
    pushToast(`Added reminder: ${title}`, 'success');
  };

  const updateMemory = (id: string, patch: Partial<Memory>) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch, lastUpdated: now } : m))
    );
  };

  const verifyMemory = (id: string) => {
    const target = memories.find((m) => m.id === id);
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setMemories((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              verificationStatus: 'Verified',
              confidence: 'High',
              healthIssue: undefined,
              lastUpdated: now,
            }
          : m
      )
    );
    if (target?.dataOrigin === 'Live') {
      persistMemoryPatch(id, { verificationStatus: 'Verified' }).catch(() => {});
    }
    pushToast('Memory marked as Verified', 'success');
  };

  const archiveMemory = (id: string) => {
    const target = memories.find((m) => m.id === id);
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, verificationStatus: 'Archived' } : m))
    );
    if (target?.dataOrigin === 'Live') {
      persistMemoryPatch(id, { verificationStatus: 'Archived' }).catch(() => {});
    }
    pushToast('Memory archived (history preserved)', 'info');
  };

  const mergeMemory = (id: string) => {
    setMemories((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, healthIssue: undefined, verificationStatus: 'Verified' }
          : m
      )
    );
    pushToast('Duplicate memory consolidated with primary record', 'success');
  };

  const correctMemoryInterpretation = (id: string, correctedInfo: string, reason: string) => {
    const target = memories.find((m) => m.id === id);
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        return {
          ...m,
          currentInformation: correctedInfo,
          verificationStatus: 'Verified',
          confidence: 'High',
          healthIssue: undefined,
          lastUpdated: now,
          versions: [
            ...m.versions.map((v) => ({ ...v, status: 'Superseded' as const })),
            {
              id: `ver-${Date.now()}`,
              version: m.versions.length + 1,
              summary: 'Manual correction by user',
              value: correctedInfo,
              eventTime: m.eventTime,
              recordedTime: now,
              sourceName: 'Manual Verification',
              changedBy: user.name,
              reason: reason || 'User corrected interpretation',
              status: 'Corrected',
            },
          ],
        };
      })
    );
    if (target?.dataOrigin === 'Live') {
      persistMemoryPatch(id, {
        currentInformation: correctedInfo,
        verificationStatus: 'Verified',
        reason,
      }).catch(() => {});
    }
    pushToast('Correction appended as new verified version', 'success');
  };

  const addMemoryNote = (id: string, note: string) => {
    if (!note.trim()) return;
    const target = memories.find((m) => m.id === id);
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, userNotes: [...m.userNotes, note.trim()] } : m))
    );
    if (target?.dataOrigin === 'Live') {
      persistMemoryPatch(id, { note: note.trim() }).catch(() => {});
    }
    pushToast('Note added to memory record', 'success');
  };

  const deleteMemory = (id: string) => {
    const target = memories.find((m) => m.id === id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
    if (drawerMemoryId === id) setDrawerMemoryId(null);
    if (target?.dataOrigin === 'Live') {
      persistMemoryDelete(id).catch(() => {});
    }
    pushToast('Memory removed', 'info');
  };

  const addSimulatedSource = (fileName: string, sizeBytes: number, type: SourceType): SourceItem => {
    const newSource = {
      ...memoryService.createSimulatedSource(fileName, sizeBytes, type),
      dataOrigin: 'Demo' as const,
    };
    setSources((prev) => [newSource, ...prev]);
    pushToast(`Added demo source: ${fileName}`, 'success');
    return newSource;
  };

  const deleteSource = (id: string) => {
    const target = sources.find((s) => s.id === id);
    setSources((prev) => prev.filter((s) => s.id !== id));
    if (target) {
      setMemories((prev) => prev.filter((m) => m.sourceId !== id));
      if (target.dataOrigin === 'Live') {
        persistSourceDelete(id).catch(() => {});
      }
    }
    pushToast('Source and associated extracted records removed', 'info');
  };

  const deleteWhatsAppGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setGroupMessages((prev) => prev.filter((m) => m.groupId !== groupId));
    pushToast('WhatsApp group deleted', 'info');
  };

  const toggleGroupSelection = (groupId: string) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, selected: !g.selected } : g)));
  };

  const selectAllGroups = () => setGroups((prev) => prev.map((g) => ({ ...g, selected: true })));
  const deselectAllGroups = () => setGroups((prev) => prev.map((g) => ({ ...g, selected: false })));

  const analyzeSelectedGroups = () => {
    const count = groups.filter((g) => g.selected).length;
    setGroups((prev) => prev.map((g) => ({ ...g, analyzed: g.selected })));
    pushToast(`Updated WhatsApp analysis scope (${count} groups active)`, 'success');
    return count;
  };

  const toggleIntegrationDemo = (id: IntegrationState['id']) => {
    setIntegrations((prev) =>
      prev.map((intg) => {
        if (intg.id !== id) return intg;
        const nextStatus =
          intg.status === 'Disconnected'
            ? intg.id === 'gmail' || intg.id === 'calendar'
              ? 'Demo Active'
              : 'Local Uploads Only'
            : 'Disconnected';
        return { ...intg, status: nextStatus };
      })
    );
  };

  const syncIntegrationDemo = (id: IntegrationState['id']) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setIntegrations((prev) =>
      prev.map((intg) =>
        intg.id === id ? { ...intg, lastSynced: `${now} (Demo Refresh)` } : intg
      )
    );
    pushToast('Demo feed refreshed locally', 'info');
  };

  const resolveConflict = (
    conflictId: string,
    status: Conflict['status'],
    chosenValue?: string
  ) => {
    const target = conflicts.find((c) => c.id === conflictId);
    setConflicts((prev) => prev.map((c) => (c.id === conflictId ? { ...c, status } : c)));
    if (target && status === 'Confirmed Latest' && chosenValue) {
      updateMemory(target.memoryId, {
        verificationStatus: 'Verified',
        healthIssue: undefined,
        currentInformation: `Confirmed current value: ${chosenValue}. Prior values retained in version history.`,
      });
    }
    persistConflictResolve(conflictId, status, chosenValue).catch(() => {});
    pushToast(`Conflict updated: ${status}`, 'success');
  };

  const updateAlertStatus = (alertId: string, status: ProactiveAlert['status']) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status } : a)));
    pushToast(`Alert marked as ${status}`, 'info');
  };

  const updateProfileItem = (id: string, patch: Partial<ContextProfileItem>) => {
    setContextProfile((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...patch, lastUpdated: new Date().toISOString().slice(0, 10) }
          : item
      )
    );
    pushToast('Context profile item updated', 'success');
  };

  const removeProfileItem = (id: string) => {
    setContextProfile((prev) => prev.filter((item) => item.id !== id));
    pushToast('Removed item from Context Profile', 'info');
  };

  const updateCommitmentStatus = (id: string, status: Commitment['status'], note?: string) => {
    setCommitments((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              followUpHistory: note
                ? [...c.followUpHistory, `${new Date().toISOString().slice(0, 10)}: ${note}`]
                : c.followUpHistory,
            }
          : c
      )
    );
    pushToast(`Commitment marked ${status}`, 'success');
  };

  const updateQuestionStatus = (
    id: string,
    status: UnansweredQuestion['status'],
    answer?: string
  ) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, status, possibleAnswer: answer ?? q.possibleAnswer } : q
      )
    );
    pushToast(`Question status updated: ${status}`, 'success');
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    persistNotificationRead(id).catch(() => {});
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    persistNotificationRead().catch(() => {});
    pushToast('All notifications marked as read', 'info');
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    persistNotificationDismiss(id).catch(() => {});
  };

  const clearNotifications = () => {
    setNotifications([]);
    persistNotificationDismiss().catch(() => {});
    pushToast('Notification feed cleared', 'info');
  };

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    updateBackendPreferences({
      timezone: patch.userTimezone,
      digest_time: patch.digestTime,
      retention_policy: patch.retentionPolicy,
      auto_detect_conflicts: patch.autoDetectConflicts,
      proactive_alerts_enabled: patch.proactiveAlertsEnabled,
    }).catch(() => {});
  };

  const deleteAllMemories = () => {
    setMemories([]);
    setDeadlines([]);
    setDrawerMemoryId(null);
    persistClearWorkspace('memories').catch(() => {});
    pushToast('All stored memories and extracted deadlines deleted', 'warning');
  };

  const deleteAllSources = () => {
    setSources([]);
    persistClearWorkspace('sources').catch(() => {});
    pushToast('All imported sources deleted', 'warning');
  };

  const resetDemoData = () => {
    setMemories(enrichInitialMemories(INITIAL_MEMORIES));
    setSources(INITIAL_SOURCES.map((s) => ({ ...s, dataOrigin: 'Demo' as const })));
    setGroups(INITIAL_GROUPS.map((g) => ({ ...g, dataOrigin: 'Demo' as const })));
    setGroupMessages(INITIAL_GROUP_MESSAGES);
    setGmailItems(enrichInitialGmail(INITIAL_GMAIL));
    setCalendarEvents(INITIAL_CALENDAR_EVENTS.map((c) => ({ ...c, dataOrigin: 'Demo' as const })));
    setDeadlines(buildInitialDeadlines());
    setCommitments(INITIAL_COMMITMENTS);
    setQuestions(INITIAL_QUESTIONS);
    setConflicts(INITIAL_CONFLICTS);
    setAlerts(INITIAL_ALERTS);
    setContextProfile(INITIAL_CONTEXT_PROFILE);
    setIntegrations(INITIAL_INTEGRATIONS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setSettings(DEFAULT_SETTINGS);
    pushToast('Demo dataset restored to initial state', 'success');
  };

  const value = useMemo<LivingMemoryContextValue>(
    () => ({
      theme,
      toggleTheme,
      setTheme,
      isAuthenticated,
      user,
      globalSearch,
      setGlobalSearch,
      backendHealth,
      systemStatus,
      serverGmailStatus,
      googleSession,
      activeJobs,
      syncingGmail,
      syncingCalendar,
      drawerMemoryId,
      openMemoryDrawer: (id) => setDrawerMemoryId(id),
      closeMemoryDrawer: () => setDrawerMemoryId(null),
      uploadModalOpen,
      setUploadModalOpen,
      toasts,
      pushToast,
      dismissToast,
      memories,
      projects,
      entities,
      sources,
      groups,
      groupMessages,
      gmailItems,
      calendarEvents,
      deadlines,
      commitments,
      questions,
      decisions,
      conflicts,
      alerts,
      contextProfile,
      forgottenContext,
      impacts,
      predictions,
      crossGroups,
      integrations,
      notifications,
      settings,
      loginDemo,
      logoutDemo,
      updateUser,
      completeOnboarding,
      connectGoogleWorkspace,
      disconnectGoogleWorkspace,
      syncRealGmail,
      syncRealCalendar,
      uploadAndAnalyzeMedia,
      analyzeWhatsAppExportJob,
      correctEmailImportance,
      correctSourceExtraction,
      confirmDeadlineDate,
      toggleDeadlineComplete,
      addUserReminder,
      updateMemory,
      verifyMemory,
      archiveMemory,
      mergeMemory,
      correctMemoryInterpretation,
      addMemoryNote,
      deleteMemory,
      addSimulatedSource,
      deleteSource,
      deleteWhatsAppGroup,
      toggleGroupSelection,
      selectAllGroups,
      deselectAllGroups,
      analyzeSelectedGroups,
      toggleIntegrationDemo,
      syncIntegrationDemo,
      resolveConflict,
      updateAlertStatus,
      updateProfileItem,
      removeProfileItem,
      updateCommitmentStatus,
      updateQuestionStatus,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      clearNotifications,
      updateSettings,
      deleteAllMemories,
      deleteAllSources,
      resetDemoData,
    }),
    [
      theme,
      isAuthenticated,
      user,
      globalSearch,
      backendHealth,
      systemStatus,
      serverGmailStatus,
      googleSession,
      activeJobs,
      syncingGmail,
      syncingCalendar,
      drawerMemoryId,
      uploadModalOpen,
      toasts,
      memories,
      projects,
      entities,
      sources,
      groups,
      groupMessages,
      gmailItems,
      calendarEvents,
      deadlines,
      commitments,
      questions,
      decisions,
      conflicts,
      alerts,
      contextProfile,
      forgottenContext,
      impacts,
      predictions,
      crossGroups,
      integrations,
      notifications,
      settings,
    ]
  );

  return (
    <LivingMemoryContext.Provider value={value}>
      {children}
    </LivingMemoryContext.Provider>
  );
};

export function useLivingMemory() {
  const ctx = useContext(LivingMemoryContext);
  if (!ctx) {
    throw new Error('useLivingMemory must be used within LivingMemoryProvider');
  }
  return ctx;
}
