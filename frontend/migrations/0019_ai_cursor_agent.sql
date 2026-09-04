-- Mark conversations that are backed by a local Cursor Agent relay.
-- The relay itself is deliberately local-only; this table stores no CLI path,
-- token, or model credential.

CREATE TABLE IF NOT EXISTS ai_conversation_sources (
  conversation_id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('cursor-agent')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_sources_provider
  ON ai_conversation_sources(provider, conversation_id);
