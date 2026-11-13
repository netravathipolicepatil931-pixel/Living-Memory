-- ============================================================
-- LIVING MEMORY - Migration 001: Core 17-Table PostgreSQL Schema
-- All tables use UUID primary keys, strict FKs, and indexes.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'Alex',
  role TEXT NOT NULL DEFAULT 'Personal Workspace',
  use_mode TEXT NOT NULL DEFAULT 'Academic',
  avatar_url TEXT DEFAULT '',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. connected_accounts (stores encrypted refresh/access tokens only server-side)
CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'google_calendar')),
  provider_email TEXT NOT NULL DEFAULT '',
  scopes TEXT[] NOT NULL DEFAULT '{}',
  encrypted_access_token TEXT NOT NULL DEFAULT '',
  encrypted_refresh_token TEXT NOT NULL DEFAULT '',
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'revoked', 'error')),
  last_error TEXT DEFAULT '',
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);

-- 3. sources
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  external_ref TEXT DEFAULT '',
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  storage_path TEXT DEFAULT '',
  mime_type TEXT DEFAULT '',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'Uploaded',
  record_count INTEGER NOT NULL DEFAULT 1,
  extracted_memories_count INTEGER NOT NULL DEFAULT 0,
  authority_basis TEXT DEFAULT '',
  verification_state TEXT DEFAULT 'Direct Source',
  ai_summary TEXT DEFAULT '',
  ocr_text TEXT DEFAULT '',
  transcript TEXT DEFAULT '',
  visible_text TEXT DEFAULT '',
  structured_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_origin TEXT NOT NULL DEFAULT 'Live',
  error_message TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sources_user_type ON sources(user_id, source_type);

-- 4. emails
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  gmail_message_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT '',
  sender_email TEXT NOT NULL DEFAULT '',
  recipients TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '(No Subject)',
  snippet TEXT DEFAULT '',
  short_summary TEXT DEFAULT '',
  body_text TEXT DEFAULT '',
  labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments_metadata JSONB NOT NULL DEFAULT '[]'::jsonb,
  gmail_url TEXT DEFAULT '',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  importance_score INTEGER NOT NULL DEFAULT 50 CHECK (importance_score >= 0 AND importance_score <= 100),
  importance_category TEXT NOT NULL DEFAULT 'Medium',
  urgency TEXT NOT NULL DEFAULT 'Low',
  importance_reason TEXT DEFAULT '',
  action_required TEXT DEFAULT '',
  requires_reply BOOLEAN NOT NULL DEFAULT FALSE,
  user_corrected_importance BOOLEAN NOT NULL DEFAULT FALSE,
  detected_deadline DATE,
  data_origin TEXT NOT NULL DEFAULT 'Live',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, gmail_message_id)
);
CREATE INDEX IF NOT EXISTS idx_emails_user_importance ON emails(user_id, importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(user_id, thread_id);

-- 5. email_sync_state
CREATE TABLE IF NOT EXISTS email_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gmail',
  history_id TEXT DEFAULT '',
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'idle',
  messages_synced INTEGER NOT NULL DEFAULT 0,
  last_error TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- 6. memories
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  current_information TEXT NOT NULL,
  category TEXT NOT NULL,
  workspace TEXT NOT NULL DEFAULT 'all',
  event_time TEXT NOT NULL DEFAULT '',
  recorded_time TEXT NOT NULL DEFAULT '',
  source_name TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'Text File',
  confidence TEXT NOT NULL DEFAULT 'Medium',
  verification_status TEXT NOT NULL DEFAULT 'Verified',
  importance_score INTEGER NOT NULL DEFAULT 60,
  importance_category TEXT NOT NULL DEFAULT 'Medium',
  urgency TEXT NOT NULL DEFAULT 'Medium',
  importance_reason TEXT DEFAULT '',
  action_required TEXT DEFAULT '',
  page_or_timestamp_ref TEXT DEFAULT '',
  user_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_origin TEXT NOT NULL DEFAULT 'Live',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memories_user_cat ON memories(user_id, category);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(user_id, importance_score DESC);

-- 7. memory_versions (Memory DNA append-only history)
CREATE TABLE IF NOT EXISTS memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  summary TEXT NOT NULL,
  value_text TEXT NOT NULL,
  event_time TEXT NOT NULL DEFAULT '',
  recorded_time TEXT NOT NULL DEFAULT '',
  source_name TEXT NOT NULL DEFAULT '',
  changed_by TEXT NOT NULL DEFAULT 'LIVING MEMORY AI',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Superseded', 'Corrected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memory_versions_mem ON memory_versions(memory_id, version_number);

-- 8. entities
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'project', 'organization', 'topic', 'location')),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  role TEXT DEFAULT '',
  organization TEXT DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, normalized_name)
);
CREATE INDEX IF NOT EXISTS idx_entities_user ON entities(user_id, entity_type);

-- 9. relationships
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  from_memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  to_memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.85,
  evidence_summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_relationships_user ON relationships(user_id, relation_type);

-- 10. evidence
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  external_ref TEXT DEFAULT '',
  excerpt TEXT NOT NULL,
  event_time TEXT NOT NULL DEFAULT '',
  recorded_time TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  page_or_timestamp_ref TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_memory ON evidence(memory_id);

-- 11. deadlines
CREATE TABLE IF NOT EXISTS deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  due_date DATE,
  due_time TEXT NOT NULL DEFAULT '23:59',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  source_name TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'Text File',
  origin_kind TEXT NOT NULL DEFAULT 'AI-Extracted' CHECK (origin_kind IN ('Google Calendar', 'AI-Extracted', 'User Reminder')),
  importance_score INTEGER NOT NULL DEFAULT 75,
  importance_category TEXT NOT NULL DEFAULT 'High',
  urgency TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Needs Confirmation')),
  supporting_evidence TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL DEFAULT 'Medium',
  is_explicit BOOLEAN NOT NULL DEFAULT TRUE,
  needs_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  confirmation_prompt TEXT DEFAULT '',
  related_task TEXT DEFAULT '',
  history_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_origin TEXT NOT NULL DEFAULT 'Live',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deadlines_user_date ON deadlines(user_id, due_date, status);

-- 12. commitments
CREATE TABLE IF NOT EXISTS commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  owner TEXT NOT NULL DEFAULT '',
  counterparty TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  statement TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  source_name TEXT NOT NULL DEFAULT '',
  follow_up_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. decisions
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  decision_date TEXT NOT NULL DEFAULT '',
  final_choice TEXT NOT NULL,
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasoning TEXT NOT NULL DEFAULT '',
  outcomes TEXT NOT NULL DEFAULT '',
  source_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. conflicts
CREATE TABLE IF NOT EXISTS conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  conflict_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'High',
  status TEXT NOT NULL DEFAULT 'Unresolved',
  claims_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_resolution TEXT NOT NULL DEFAULT '',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES memories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Important',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  source_ref TEXT NOT NULL DEFAULT '',
  action_route TEXT NOT NULL DEFAULT '/dashboard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);

-- 16. processing_jobs
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Uploaded',
  progress INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL DEFAULT '',
  result_json JSONB,
  error_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON processing_jobs(user_id, created_at DESC);

-- 17. user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  preferred_language TEXT NOT NULL DEFAULT 'en-IN',
  digest_time TEXT NOT NULL DEFAULT '08:00',
  retention_policy TEXT NOT NULL DEFAULT '1 Year',
  auto_detect_conflicts BOOLEAN NOT NULL DEFAULT TRUE,
  proactive_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  importance_correction_hints JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
