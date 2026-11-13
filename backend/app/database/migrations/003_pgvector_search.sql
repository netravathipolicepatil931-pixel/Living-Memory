-- ============================================================
-- LIVING MEMORY - Migration 003: pgvector Semantic Search
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS idx_memories_embedding
  ON memories
  USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(768),
  match_user_id UUID,
  match_threshold FLOAT DEFAULT 0.45,
  match_count INT DEFAULT 12
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  current_information TEXT,
  category TEXT,
  source_name TEXT,
  importance_score INT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id,
    m.title,
    m.current_information,
    m.category,
    m.source_name,
    m.importance_score,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE m.user_id = match_user_id
    AND m.verification_status <> 'Archived'
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) >= match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;
