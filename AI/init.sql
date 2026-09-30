-- SQL Init Migration Script for Multimodal Agent
-- Enables vector extension and creates required tables and views.

CREATE EXTENSION IF NOT EXISTS vector;

-- Drop views if they exist to prevent dependency issues during table drop
DROP VIEW IF EXISTS view_meetings CASCADE;
DROP VIEW IF EXISTS view_meeting_analytics CASCADE;

-- Drop old unused tables if they exist to start with a clean state matching spec
DROP TABLE IF EXISTS meeting_chunks CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;

-- 1. Create meeting_chunks table for sémantique RAG chunks
CREATE TABLE meeting_chunks (
    id SERIAL PRIMARY KEY,
    meeting_id UUID NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
    chunk_type VARCHAR(50) NOT NULL, -- 'transcript', 'summary', 'decision', 'action_item', 'behavior'
    content TEXT NOT NULL,
    embedding VECTOR(1024) NOT NULL,
    allowed_participant_ids UUID[] NOT NULL, -- Array of allowed users (for instant permission update)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS meeting_chunks_meeting_id_idx ON meeting_chunks(meeting_id);
-- Optional HNSW index for high performance vector search. Fall back to flat if HNSW is not installed.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_am WHERE amname = 'hnsw'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'meeting_chunks_embedding_idx' AND n.nspname = 'public'
        ) THEN
            CREATE INDEX meeting_chunks_embedding_idx ON meeting_chunks USING hnsw (embedding vector_cosine_ops);
        END IF;
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'meeting_chunks_embedding_idx' AND n.nspname = 'public'
        ) THEN
            CREATE INDEX meeting_chunks_embedding_idx ON meeting_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
        END IF;
    END IF;
END $$;

-- 2. Create chat_messages table for conversational sliding memory persistence
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,
    audio_b64 TEXT, -- base64 audio response (null if text-only or TTS failed)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS chat_messages_user_idx ON chat_messages(user_id);

-- 3. Create token_denylist table for JWT token revocations
CREATE TABLE IF NOT EXISTS token_denylist (
    id SERIAL PRIMARY KEY,
    jti VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS token_denylist_jti_idx ON token_denylist(jti);

-- 4. Create read-only View view_meetings masking deleted meetings and sensitive data
CREATE OR REPLACE VIEW view_meetings AS
SELECT id, title, start_at, duration_minutes, status, participants, description, starred, owner_id, project_id, created_at, updated_at
FROM meeting
WHERE deleted_at IS NULL;

-- 5. Create read-only View view_meeting_analytics mapping key-value metric columns
CREATE OR REPLACE VIEW view_meeting_analytics AS
SELECT 
    a.id, 
    a.meeting_id, 
    a.metric_key AS speaker, 
    (a.metric_value->>'temps_de_parole_pct')::float AS talk_time_percentage, 
    (a.metric_value->>'nombre_interventions')::int AS interventions_count, 
    (a.metric_value->>'pitch_mean')::float AS average_pitch, 
    (a.metric_value->>'duree_moyenne_intervention')::float AS average_intervention_duration, 
    (a.metric_value->>'energy_presence')::float AS energy_level, 
    (a.metric_value->>'interruptions_faites')::int AS interruption_count, 
    (a.metric_value->>'interruptions_subies')::int AS interruptions_received,
    m.title AS meeting_title
FROM analytic_data a
JOIN meeting m ON a.meeting_id = m.id
WHERE m.deleted_at IS NULL AND a.metric_key != 'summaryMetrics';
