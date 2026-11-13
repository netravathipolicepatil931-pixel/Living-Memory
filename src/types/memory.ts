export type ThemeMode = 'dark' | 'light';

export type ImportanceCategory = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
export type UrgencyLevel = 'High' | 'Medium' | 'Low';
export type ProcessingStage =
  | 'Uploaded'
  | 'Processing'
  | 'Analyzed'
  | 'Completed'
  | 'Needs attention'
  | 'Failed'
  | 'Indexed'
  | 'Demo Sync';

export type MemoryCategory =
  | 'Events'
  | 'Tasks'
  | 'Decisions'
  | 'Commitments'
  | 'Deadlines'
  | 'Announcements'
  | 'People'
  | 'Projects'
  | 'Relationships'
  | 'Preferences'
  | 'Questions'
  | 'Important conversations';

export type VerificationStatus = 'Verified' | 'Needs Review' | 'Conflicted' | 'Superseded' | 'Archived';

export type SourceType =
  | 'WhatsApp Export'
  | 'WhatsApp ZIP'
  | 'Gmail'
  | 'Google Calendar'
  | 'PDF Document'
  | 'DOCX Document'
  | 'Image'
  | 'Audio'
  | 'Video'
  | 'Text File';

export type WorkspaceScope = 'all' | 'academic' | 'projects' | 'personal';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  useMode: 'Personal' | 'Academic' | 'Professional';
  avatarUrl: string;
  useCases: string[];
  preferredSources: string[];
  importantCategories: string[];
  onboardingCompleted: boolean;
}

export interface Evidence {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  excerpt: string;
  eventTime: string;
  recordedTime: string;
  author: string;
  channelName?: string;
  pageOrTimestampRef?: string;
}

export interface MemoryVersion {
  id: string;
  version: number;
  summary: string;
  value: string;
  eventTime: string;
  recordedTime: string;
  sourceName: string;
  changedBy: string;
  reason: string;
  status: 'Active' | 'Superseded' | 'Corrected';
}

export interface Memory {
  id: string;
  title: string;
  description: string;
  currentInformation: string;
  category: MemoryCategory;
  workspace: WorkspaceScope;
  projectId?: string;
  eventTime: string;
  recordedTime: string;
  lastUpdated: string;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  confidence: 'High' | 'Medium' | 'Low';
  verificationStatus: VerificationStatus;
  relatedPeopleIds: string[];
  relatedGroupIds: string[];
  connectedMemoryIds: string[];
  evidence: Evidence[];
  versions: MemoryVersion[];
  userNotes: string[];
  priority: 'Urgent' | 'High' | 'Normal';
  importanceScore?: number;
  importanceCategory?: ImportanceCategory;
  urgency?: UrgencyLevel;
  importanceReason?: string;
  actionRequired?: string;
  pageOrTimestampRef?: string;
  dataOrigin?: 'Demo' | 'Live';
  healthIssue?:
    | 'Duplicate'
    | 'Outdated'
    | 'Unverified'
    | 'Conflicting'
    | 'Missing Evidence'
    | 'Low Confidence'
    | 'Unused';
}

export interface ProjectItem {
  id: string;
  name: string;
  summary: string;
  status: 'Active' | 'In Review' | 'Planning';
  lead: string;
  memberIds: string[];
  nextMilestone: string;
  nextMilestoneDate: string;
  riskSummary: string;
}

export interface Entity {
  id: string;
  name: string;
  role: string;
  organization: string;
  avatarInitials: string;
  relatedGroupIds: string[];
  projectIds: string[];
  responsibilities: string[];
  recentInteraction: string;
  collaborationCount: number;
  confidenceLabel: 'Confirmed by Source' | 'Observed Pattern';
}

export interface SourceItem {
  id: string;
  name: string;
  type: SourceType;
  uploadDate: string;
  processingStatus: ProcessingStage;
  recordCount: number;
  extractedMemoriesCount: number;
  sizeLabel: string;
  authorityBasis: string;
  verificationState: 'Official / Authoritative' | 'Direct Source' | 'Peer Discussion' | 'Personal Note';
  dataOrigin?: 'Demo' | 'Live';
  mediaUrl?: string;
  aiSummary?: string;
  ocrText?: string;
  transcript?: string;
  timestamps?: Array<{ time: string; topic: string }>;
  visibleText?: string[];
  structuredDetails?: {
    eventName?: string;
    dates?: string[];
    amounts?: string[];
    venue?: string;
    contacts?: string[];
    instructions?: string[];
  };
  importantDiscoveries?: string[];
  errorMessage?: string;
}

export interface WhatsAppGroup {
  id: string;
  name: string;
  category: 'College' | 'Announcements' | 'Projects' | 'Friends' | 'Work' | 'Personal' | 'Other';
  description: string;
  messageCount: number;
  lastMessageDate: string;
  importDate: string;
  selected: boolean;
  analyzed: boolean;
  extractedMemories: number;
  participants?: string[];
  dataOrigin?: 'Demo' | 'Live';
}

export interface GroupMessage {
  id: string;
  groupId: string;
  sender: string;
  timestamp: string;
  content: string;
  bucket:
    | 'Assignments'
    | 'Deadlines'
    | 'Events'
    | 'Announcements'
    | 'Decisions'
    | 'Responsibilities'
    | 'Important conversations'
    | 'Questions'
    | 'Updates'
    | 'Duplicate messages';
  priority: 'Urgent' | 'High' | 'Normal';
  linkedMemoryId?: string;
}

export interface GmailItem {
  id: string;
  gmailMessageId?: string;
  threadId?: string;
  from: string;
  fromEmail: string;
  recipients?: string[];
  subject: string;
  preview: string;
  body: string;
  date: string;
  label: 'Faculty' | 'Project' | 'Meetings' | 'Follow-up' | string;
  labels?: string[];
  starred: boolean;
  category:
    | 'Important emails'
    | 'Decisions'
    | 'Meeting details'
    | 'Deadlines'
    | 'Promises'
    | 'Project updates'
    | 'Follow-up requests'
    | 'Unanswered emails'
    | 'Changes in plans';
  linkedMemoryId: string;
  relatedCalendarEventId?: string;
  attachmentsMetadata?: Array<{ filename: string; mimeType: string; size: number }>;
  gmailUrl?: string;
  importanceScore?: number;
  importanceCategory?: ImportanceCategory;
  urgency?: UrgencyLevel;
  importanceReason?: string;
  shortSummary?: string;
  actionRequired?: string;
  requiresReply?: boolean;
  detectedDeadline?: string;
  userCorrectedImportance?: boolean;
  dataOrigin?: 'Demo' | 'Live';
}

export interface CalendarEventItem {
  id: string;
  googleEventId?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  calendarName: 'Academic' | 'AI Project' | 'Personal' | string;
  location: string;
  participants: string[];
  description: string;
  status: 'Confirmed' | 'Rescheduled' | 'Conflicting';
  projectId?: string;
  linkedMemoryId: string;
  linkedEmailId?: string;
  htmlLink?: string;
  dataOrigin?: 'Demo' | 'Live';
}

export interface UnifiedDeadline {
  id: string;
  title: string;
  date: string;
  time: string;
  timezone: string;
  sourceName: string;
  sourceType: SourceType;
  originKind: 'Google Calendar' | 'AI-Extracted' | 'User Reminder';
  importanceScore: number;
  importanceCategory: ImportanceCategory;
  urgency: UrgencyLevel;
  status: 'Pending' | 'Completed' | 'Overdue' | 'Needs Confirmation';
  supportingEvidence: string;
  confidence: 'High' | 'Medium' | 'Low';
  isExplicit: boolean;
  needsConfirmation?: boolean;
  confirmationPrompt?: string;
  linkedMemoryId?: string;
  relatedTask?: string;
  history?: Array<{ date: string; source: string; note: string }>;
  dataOrigin: 'Demo' | 'Live';
}

export interface Commitment {
  id: string;
  statement: string;
  title: string;
  owner: string;
  dueDate: string;
  status: 'Pending' | 'Completed' | 'Overdue' | 'Unconfirmed' | 'Cancelled';
  projectId: string;
  sourceName: string;
  followUpHistory: string[];
  linkedMemoryId: string;
}

export interface UnansweredQuestion {
  id: string;
  question: string;
  askedBy: string;
  date: string;
  sourceName: string;
  possibleAnswer?: string;
  status: 'Unanswered' | 'Possibly answered elsewhere' | 'Answer found' | 'Needs confirmation';
  linkedMemoryId: string;
}

export interface DecisionRecord {
  id: string;
  title: string;
  alternatives: string[];
  finalChoice: string;
  reasoning: string;
  peopleInvolved: string[];
  date: string;
  sourceName: string;
  outcomes: string;
  laterChanges?: string;
  linkedMemoryId: string;
}

export interface Conflict {
  id: string;
  title: string;
  conflictType:
    | 'Different deadlines'
    | 'Different meeting times'
    | 'Conflicting instructions'
    | 'Changed responsibilities'
    | 'Outdated announcements'
    | 'Contradictory decisions';
  memoryId: string;
  detectedAt: string;
  status: 'Unresolved' | 'Confirmed Latest' | 'Kept Both Versions' | 'Clarification Requested';
  confidenceLabel: string;
  suggestedResolution: string;
  claims: {
    id: string;
    value: string;
    sourceName: string;
    sourceType: SourceType;
    timestamp: string;
    reliabilityBasis: string;
    excerpt: string;
  }[];
}

export interface ProactiveAlert {
  id: string;
  type:
    | 'Deadline approaching'
    | 'Meeting changed'
    | 'Commitment not fulfilled'
    | 'Important question unanswered'
    | 'Conflicting information'
    | 'Missing document'
    | 'New important decision'
    | 'Possible dependency risk';
  title: string;
  whatHappened: string;
  whyItMatters: string;
  relatedSources: string[];
  relatedPeople: string[];
  recommendedNextStep: string;
  certaintyNote: 'Confirmed from Sources' | 'Observed Pattern / Possible Risk';
  status: 'Active' | 'Reviewed' | 'Dismissed';
  timestamp: string;
  linkedMemoryId: string;
}

export interface ContextProfileItem {
  id: string;
  section:
    | 'Goals'
    | 'Interests'
    | 'Active projects'
    | 'Important people'
    | 'Responsibilities'
    | 'Preferences'
    | 'Recurring activities'
    | 'Frequently discussed topics'
    | 'User-confirmed facts';
  title: string;
  description: string;
  evidence: string;
  confidence: 'Confirmed by User' | 'Observed Pattern (AI-Inferred)';
  lastUpdated: string;
}

export interface ForgottenMemoryItem {
  id: string;
  title: string;
  kind:
    | 'Previous project discussion'
    | 'Past decision'
    | 'Old promise'
    | 'Previously shared resource'
    | 'Unfinished task';
  whyRelevantNow: string;
  originalDate: string;
  relatedPeople: string[];
  originalSource: string;
  excerpt: string;
  linkedMemoryId: string;
}

export interface ImpactScenario {
  id: string;
  triggerTitle: string;
  triggerChange: string;
  detectedDate: string;
  linkedMemoryId: string;
  effects: {
    id: string;
    targetTitle: string;
    category: 'Team review' | 'Submission preparation' | 'Meeting schedule' | 'Assigned responsibilities';
    severity: 'High' | 'Medium' | 'Low';
    certainty: 'Confirmed Consequence' | 'Possible Consequence';
    summary: string;
    affectedPeople: string[];
    recommendedAction: string;
    evidenceExcerpt: string;
    sourceName: string;
  }[];
}

export interface LifePredictionItem {
  id: string;
  situation: string;
  knownFacts: string[];
  observedPatterns: string[];
  aiPrediction: string;
  potentialRisk: string;
  suggestedPreparation: string;
  peopleInvolved: string[];
  relatedCommitmentIds: string[];
}

export interface CrossGroupThread {
  id: string;
  topic: string;
  whyConnected: string;
  groupIds: string[];
  peopleInvolved: string[];
  originalInfo: { text: string; source: string; timestamp: string };
  newInfo: { text: string; source: string; timestamp: string };
  latestAuthoritativeInfo: string;
  whatChanged: string;
  linkedMemoryId: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'Urgent' | 'Important' | 'Updates' | 'AI Insights';
  timestamp: string;
  read: boolean;
  sourceRef: string;
  linkedMemoryId?: string;
  actionRoute?: string;
}

export interface IntegrationState {
  id: 'whatsapp' | 'gmail' | 'calendar' | 'documents' | 'pdfs' | 'images';
  name: string;
  description: string;
  status: 'Connected' | 'Demo Active' | 'Disconnected' | 'Local Uploads Only';
  accountLabel: string;
  lastSynced: string;
  permissionScope: string;
  dataCategories: string[];
  readOnly: boolean;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modeLabel?: 'Demo Context Engine (Sample Data)' | 'Gemini Grounded Synthesis (Authorized Sources)';
  confidenceLabel?: string;
  relatedMemoryIds?: string[];
  peopleMentioned?: string[];
  projectsMentioned?: string[];
  evidenceSnippets?: {
    sourceName: string;
    date: string;
    excerpt: string;
  }[];
  followUps?: string[];
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
}
