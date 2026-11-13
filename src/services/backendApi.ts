import { getInMemoryAccessToken } from './googleAuth';
import {
  Conflict,
  GmailItem,
  ImportanceCategory,
  Memory,
  NotificationItem,
  SourceItem,
  SourceType,
  UnifiedDeadline,
} from '../types/memory';

export interface BackendHealth {
  ok: boolean;
  geminiConfigured: boolean;
  sarvamConfigured?: boolean;
  supabaseConfigured?: boolean;
  googleOAuthConfigured?: boolean;
  googleWorkspaceConfigured: boolean;
  databaseMode?: string;
  timestamp: string;
}

export interface SystemStatus {
  ok: boolean;
  databaseMode: string;
  geminiConfigured: boolean;
  sarvamConfigured: boolean;
  supabaseConfigured: boolean;
  googleOAuthConfigured: boolean;
  googleRedirectUri: string;
  missingCredentials: string[];
  models?: Record<string, string>;
}

export interface ServerGmailStatus {
  oauthConfigured: boolean;
  redirectUri: string;
  connected: boolean;
  status: string;
  email: string | null;
  scopes: string[];
  lastError: string;
  syncState?: {
    history_id?: string;
    last_sync_at?: string;
    sync_status?: string;
    messages_synced?: number;
  };
}

export type ProcessingStageStatus =
  | 'Uploaded'
  | 'Processing'
  | 'Analyzed'
  | 'Completed'
  | 'Needs attention'
  | 'Failed';

export interface JobStatusResponse {
  id: string;
  title: string;
  kind: 'gmail' | 'whatsapp' | 'image' | 'audio' | 'video' | 'document';
  status: ProcessingStageStatus;
  progress: number;
  message: string;
  result?: any;
  error?: string;
}

function getWorkspaceHeaders(): Record<string, string> {
  const token = localStorage.getItem('lm_auth_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function apiJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...getWorkspaceHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body && !(init.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    const msg =
      typeof data?.detail === 'string'
        ? data.detail
        : data?.detail?.message || data?.error || `Request failed (${res.status})`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.detail = data?.detail;
    throw err;
  }
  return data as T;
}

function scoreToCat(score: number): ImportanceCategory {
  if (score >= 90) return 'Critical';
  if (score >= 75) return 'High';
  if (score >= 50) return 'Medium';
  if (score >= 25) return 'Low';
  return 'Informational';
}

export function mapBackendMemory(raw: any): Memory {
  const score = Number(raw.importance_score ?? 60);
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description || raw.current_information,
    currentInformation: raw.current_information || raw.description || '',
    category: (raw.category || 'Important conversations') as Memory['category'],
    workspace: (raw.workspace || 'all') as Memory['workspace'],
    eventTime: raw.event_time || (raw.created_at || '').slice(0, 10),
    recordedTime: raw.recorded_time || (raw.created_at || '').slice(0, 16).replace('T', ' '),
    lastUpdated: (raw.updated_at || raw.created_at || '').slice(0, 16).replace('T', ' '),
    sourceId: raw.source_id || '',
    sourceName: raw.source_name || 'Source',
    sourceType: (raw.source_type || 'Text File') as SourceType,
    confidence: raw.confidence || 'Medium',
    verificationStatus: raw.verification_status || 'Verified',
    relatedPeopleIds: [],
    relatedGroupIds: [],
    connectedMemoryIds: [],
    evidence: (raw.evidence || []).map((e: any) => ({
      id: e.id,
      sourceId: e.source_id || '',
      sourceName: e.source_name,
      sourceType: (e.source_type || raw.source_type || 'Text File') as SourceType,
      excerpt: e.excerpt,
      eventTime: e.event_time || '',
      recordedTime: e.recorded_time || '',
      author: e.author || '',
      pageOrTimestampRef: e.page_or_timestamp_ref || undefined,
    })),
    versions: (raw.versions || []).map((v: any) => ({
      id: v.id,
      version: Number(v.version_number ?? v.version ?? 1),
      summary: v.summary,
      value: v.value_text ?? v.value ?? '',
      eventTime: v.event_time || '',
      recordedTime: v.recorded_time || '',
      sourceName: v.source_name || '',
      changedBy: v.changed_by || 'LIVING MEMORY AI',
      reason: v.reason || '',
      status: v.status || 'Active',
    })),
    userNotes: Array.isArray(raw.user_notes) ? raw.user_notes : [],
    priority: score >= 85 ? 'Urgent' : score >= 70 ? 'High' : 'Normal',
    importanceScore: score,
    importanceCategory: raw.importance_category || scoreToCat(score),
    urgency: raw.urgency || 'Medium',
    importanceReason: raw.importance_reason || '',
    actionRequired: raw.action_required || undefined,
    pageOrTimestampRef: raw.page_or_timestamp_ref || undefined,
    dataOrigin: raw.data_origin || 'Live',
  };
}

export function mapBackendSource(raw: any): SourceItem {
  const bytes = Number(raw.size_bytes ?? 0);
  const kb = Math.max(1, Math.round(bytes / 1024));
  const sizeLabel = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
  return {
    id: raw.id,
    name: raw.name,
    type: (raw.source_type || 'Text File') as SourceType,
    uploadDate: (raw.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
    processingStatus: (raw.processing_status || 'Completed') as SourceItem['processingStatus'],
    recordCount: Number(raw.record_count ?? 1),
    extractedMemoriesCount: Number(raw.extracted_memories_count ?? 0),
    sizeLabel,
    authorityBasis: raw.authority_basis || 'Processed and persisted in backend database.',
    verificationState: (raw.verification_state || 'Direct Source') as SourceItem['verificationState'],
    dataOrigin: raw.data_origin || 'Live',
    aiSummary: raw.ai_summary || undefined,
    ocrText: raw.ocr_text || undefined,
    transcript: raw.transcript || undefined,
    visibleText: raw.visible_text ? String(raw.visible_text).split('\n').filter(Boolean) : undefined,
    timestamps: Array.isArray(raw.timestamps_json) ? raw.timestamps_json : undefined,
    structuredDetails:
      raw.structured_details && Object.keys(raw.structured_details).length > 0
        ? raw.structured_details
        : undefined,
    errorMessage: raw.error_message || undefined,
  };
}

export function mapBackendDeadline(raw: any): UnifiedDeadline {
  const score = Number(raw.importance_score ?? 75);
  return {
    id: raw.id,
    title: raw.title,
    date: raw.due_date || '',
    time: raw.due_time || '23:59',
    timezone: raw.timezone || 'UTC',
    sourceName: raw.source_name || '',
    sourceType: (raw.source_type || 'Text File') as SourceType,
    originKind: (raw.origin_kind || 'AI-Extracted') as UnifiedDeadline['originKind'],
    importanceScore: score,
    importanceCategory: raw.importance_category || scoreToCat(score),
    urgency: raw.urgency || 'Medium',
    status: raw.status || 'Pending',
    supportingEvidence: raw.supporting_evidence || '',
    confidence: raw.confidence || 'Medium',
    isExplicit: Boolean(raw.is_explicit ?? true),
    needsConfirmation: Boolean(raw.needs_confirmation ?? false),
    confirmationPrompt: raw.confirmation_prompt || undefined,
    linkedMemoryId: raw.memory_id || undefined,
    relatedTask: raw.related_task || undefined,
    history: Array.isArray(raw.history_json) ? raw.history_json : undefined,
    dataOrigin: raw.data_origin || 'Live',
  };
}

export function mapBackendEmail(raw: any): GmailItem {
  const score = Number(raw.importance_score ?? 55);
  return {
    id: raw.id,
    gmailMessageId: raw.gmail_message_id,
    threadId: raw.thread_id,
    from: raw.sender_name || raw.sender_email || 'Sender',
    fromEmail: raw.sender_email || '',
    recipients: raw.recipients ? String(raw.recipients).split(',').map((s) => s.trim()) : [],
    subject: raw.subject || '(No Subject)',
    preview: raw.short_summary || raw.snippet || '',
    body: raw.body_text || raw.snippet || '',
    date: (raw.received_at || '').slice(0, 10),
    label: (raw.labels && raw.labels[0]) || 'Inbox',
    labels: raw.labels || [],
    starred: Array.isArray(raw.labels) && raw.labels.includes('STARRED'),
    category: 'Important emails',
    linkedMemoryId: raw.source_id || '',
    attachmentsMetadata: raw.attachments_metadata || [],
    gmailUrl: raw.gmail_url || 'https://mail.google.com',
    importanceScore: score,
    importanceCategory: raw.importance_category || scoreToCat(score),
    urgency: raw.urgency || 'Low',
    importanceReason: raw.importance_reason || '',
    shortSummary: raw.short_summary || raw.snippet || '',
    actionRequired: raw.action_required || '',
    requiresReply: Boolean(raw.requires_reply),
    detectedDeadline: raw.detected_deadline || undefined,
    userCorrectedImportance: Boolean(raw.user_corrected_importance),
    dataOrigin: raw.data_origin || 'Live',
  };
}

export function mapBackendNotification(raw: any): NotificationItem {
  return {
    id: raw.id,
    title: raw.title,
    message: raw.message,
    category: (raw.category || 'Important') as NotificationItem['category'],
    timestamp: (raw.created_at || '').slice(0, 16).replace('T', ' '),
    read: Boolean(raw.read),
    sourceRef: raw.source_ref || '',
    linkedMemoryId: raw.memory_id || undefined,
    actionRoute: raw.action_route || '/dashboard',
  };
}

export function mapBackendConflict(raw: any): Conflict {
  const claims = Array.isArray(raw.claims_json) ? raw.claims_json : [];
  return {
    id: raw.id,
    title: raw.title,
    conflictType: 'Different deadlines',
    memoryId: raw.memory_id || '',
    detectedAt: (raw.detected_at || '').slice(0, 10),
    status: raw.status || 'Unresolved',
    confidenceLabel: raw.severity || 'High',
    suggestedResolution: raw.suggested_resolution || '',
    claims: claims.map((c: any, idx: number) => ({
      id: `cl-${raw.id}-${idx}`,
      value: c.value || '',
      sourceName: c.sourceName || 'Source',
      sourceType: (c.sourceType || 'Text File') as SourceType,
      timestamp: c.timestamp || '',
      reliabilityBasis: 'Extracted evidence',
      excerpt: c.excerpt || '',
    })),
  };
}

export async function fetchBackendHealth(): Promise<BackendHealth> {
  return apiJson<BackendHealth>('/api/health');
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  return apiJson<SystemStatus>('/api/system/status');
}

export async function createWorkspaceSession(email: string, name: string, mode = 'demo') {
  const data = await apiJson<{ token: string; user: any; preferences: any }>('/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({ email, name, mode }),
  });
  if (data.token) {
    localStorage.setItem('lm_auth_token', data.token);
  }
  return data;
}

export async function updateBackendPreferences(patch: Record<string, any>) {
  return apiJson('/api/auth/preferences', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function fetchGmailStatus(): Promise<ServerGmailStatus> {
  return apiJson<ServerGmailStatus>('/api/integrations/gmail/status');
}

export async function startServerSideGmailOAuth(): Promise<{ email: string }> {
  const data = await apiJson<{ configured: boolean; authUrl: string; state: string }>(
    '/api/integrations/gmail/connect?includeCalendar=true'
  );
  const width = 520;
  const height = 640;
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

  const popup = window.open(
    data.authUrl,
    'living_memory_google_oauth',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );
  if (!popup) {
    throw new Error('Popup was blocked by browser. Allow popups for this site and retry.');
  }

  return new Promise<{ email: string }>((resolve, reject) => {
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', handler);
        // Double-check backend status in case message raced with close
        fetchGmailStatus()
          .then((st) => {
            if (st.connected) {
              resolve({ email: st.email || '' });
            } else {
              reject(new Error('Google authorization window was closed before completion.'));
            }
          })
          .catch(() => reject(new Error('Google authorization did not complete.')));
      }
    }, 600);

    const handler = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || payload.provider !== 'gmail') return;
      if (payload.type === 'OAUTH_AUTH_SUCCESS') {
        clearInterval(timer);
        window.removeEventListener('message', handler);
        resolve({ email: payload.email || '' });
      } else if (payload.type === 'OAUTH_AUTH_ERROR') {
        clearInterval(timer);
        window.removeEventListener('message', handler);
        reject(new Error(payload.error || 'Google OAuth authorization failed.'));
      }
    };

    window.addEventListener('message', handler);
  });
}

export async function disconnectServerGmail(): Promise<void> {
  await apiJson('/api/integrations/gmail/disconnect', { method: 'POST' });
}

export async function pollJobUntilDone(
  jobId: string,
  onProgress?: (job: JobStatusResponse) => void
): Promise<JobStatusResponse> {
  for (let attempt = 0; attempt < 150; attempt++) {
    const data = await apiJson<{ job: JobStatusResponse }>(`/api/jobs/${encodeURIComponent(jobId)}`);
    const job = data.job;
    onProgress?.(job);
    if (job.status === 'Completed' || job.status === 'Needs attention' || job.status === 'Failed') {
      if (job.status === 'Failed') {
        throw new Error(job.error || job.message || 'Processing failed.');
      }
      return job;
    }
    await new Promise((r) => setTimeout(r, 900));
  }
  throw new Error('Processing timed out. Check background jobs shortly.');
}

export async function startGmailSyncJob(params: {
  maxMessages?: number;
  afterDate?: string;
  beforeDate?: string;
  startHistoryId?: string;
  existingIds?: string[];
  userTimezone: string;
  userPriorities: string[];
  correctionHints?: string[];
}): Promise<string> {
  const data = await apiJson<{ jobId: string }>('/api/integrations/gmail/sync', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return data.jobId;
}

export async function syncGoogleCalendarEvents(params?: { timeMin?: string; timeMax?: string }) {
  const token = getInMemoryAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const data = await apiJson<{
    events: Array<{
      googleEventId: string;
      title: string;
      date: string;
      startTime: string;
      endTime: string;
      calendarName: string;
      location: string;
      participants: string[];
      description: string;
      htmlLink?: string;
    }>;
  }>('/api/calendar/sync', {
    method: 'POST',
    headers,
    body: JSON.stringify(params || {}),
  });
  return data.events;
}

export async function previewWhatsAppExport(file: File) {
  const form = new FormData();
  form.append('file', file);
  const data = await apiJson<{ preview: any }>('/api/whatsapp/upload', {
    method: 'POST',
    body: form,
  });
  return data.preview as {
    groupName: string;
    participants: string[];
    messageCount: number;
    dateRange: string;
    mediaCount: number;
    mediaFiles: Array<{ filename: string; kind: string; mimeType: string; sizeBytes: number }>;
    sampleMessages: Array<{ timestamp: string; sender: string; content: string }>;
    messages: Array<{ timestamp: string; sender: string; content: string }>;
    rawText: string;
    attachments: any[];
  };
}

export async function startWhatsAppAnalysisJob(params: {
  groupName: string;
  rawText: string;
  includeMedia: boolean;
  attachments: any[];
  userTimezone: string;
}): Promise<string> {
  const data = await apiJson<{ jobId: string }>('/api/whatsapp/analyze', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return data.jobId;
}

export async function startMediaIngestJob(
  file: File,
  userTimezone: string,
  languageHint = 'unknown'
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('userTimezone', userTimezone);
  form.append('languageHint', languageHint);
  const data = await apiJson<{ jobId: string }>('/api/uploads', {
    method: 'POST',
    body: form,
  });
  return data.jobId;
}

export async function fetchWorkspaceSnapshotFromBackend() {
  const [memoriesRes, sourcesRes, deadlinesRes, emailsRes, notifRes] = await Promise.all([
    apiJson<{ memories: any[]; conflicts: any[] }>('/api/memories'),
    apiJson<{ sources: any[] }>('/api/sources'),
    apiJson<{ deadlines: any[] }>('/api/deadlines'),
    apiJson<{ emails: any[] }>('/api/emails'),
    apiJson<{ notifications: any[] }>('/api/notifications'),
  ]);
  return {
    memories: (memoriesRes.memories || []).map(mapBackendMemory),
    conflicts: (memoriesRes.conflicts || []).map(mapBackendConflict),
    sources: (sourcesRes.sources || []).map(mapBackendSource),
    deadlines: (deadlinesRes.deadlines || []).map(mapBackendDeadline),
    emails: (emailsRes.emails || []).map(mapBackendEmail),
    notifications: (notifRes.notifications || []).map(mapBackendNotification),
  };
}

export async function persistMemoryPatch(memoryId: string, patch: Record<string, any>) {
  return apiJson(`/api/memories/${encodeURIComponent(memoryId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function persistMemoryDelete(memoryId: string) {
  return apiJson(`/api/memories/${encodeURIComponent(memoryId)}`, { method: 'DELETE' });
}

export async function persistSourceDelete(sourceId: string) {
  return apiJson(`/api/sources/${encodeURIComponent(sourceId)}`, { method: 'DELETE' });
}

export async function persistSourceCorrection(
  sourceId: string,
  patch: { ocrText?: string; aiSummary?: string }
) {
  return apiJson(`/api/sources/${encodeURIComponent(sourceId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function persistEmailImportance(emailId: string, score: number, reason: string) {
  return apiJson(`/api/emails/${encodeURIComponent(emailId)}/importance`, {
    method: 'POST',
    body: JSON.stringify({ importanceScore: score, reason }),
  });
}

export async function persistDeadlineCreate(payload: {
  title: string;
  date: string;
  time: string;
  timezone: string;
  supportingEvidence: string;
}) {
  return apiJson<{ deadline: any }>('/api/deadlines', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function persistDeadlineConfirm(
  deadlineId: string,
  confirmedDate: string,
  confirmedTime?: string
) {
  return apiJson<{ deadline: any }>(`/api/deadlines/${encodeURIComponent(deadlineId)}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ confirmedDate, confirmedTime }),
  });
}

export async function persistDeadlineToggle(deadlineId: string) {
  return apiJson<{ deadline: any }>(`/api/deadlines/${encodeURIComponent(deadlineId)}/toggle`, {
    method: 'POST',
  });
}

export async function persistConflictResolve(
  conflictId: string,
  status: string,
  chosenValue?: string
) {
  return apiJson(`/api/conflicts/${encodeURIComponent(conflictId)}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ status, chosenValue }),
  });
}

export async function persistNotificationRead(notifId?: string) {
  if (notifId) {
    return apiJson(`/api/notifications/${encodeURIComponent(notifId)}/read`, { method: 'POST' });
  }
  return apiJson('/api/notifications/read-all', { method: 'POST' });
}

export async function persistNotificationDismiss(notifId?: string) {
  if (notifId) {
    return apiJson(`/api/notifications/${encodeURIComponent(notifId)}`, { method: 'DELETE' });
  }
  return apiJson('/api/notifications', { method: 'DELETE' });
}

export async function persistClearWorkspace(scope: 'all' | 'sources' | 'memories') {
  return apiJson(`/api/workspace/clear?scope=${scope}`, { method: 'POST' });
}

export async function queryAskLivingMemoryBackend(params: {
  question: string;
  contextSnapshot: any;
  preferredLanguage?: string;
}) {
  return apiJson<{
    answer: string;
    confidenceLabel: string;
    citations: Array<{ sourceName: string; date: string; excerpt: string; memoryId?: string }>;
    peopleMentioned: string[];
    projectsMentioned: string[];
    followUps: string[];
  }>('/api/ask-ai', {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      useSemanticSearch: true,
    }),
  });
}
