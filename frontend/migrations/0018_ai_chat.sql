-- User-owned OpenAI-compatible model connections and persistent AI chats

CREATE TABLE IF NOT EXISTS ai_connections (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'openai-compatible' CHECK (protocol = 'openai-compatible'),
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  api_key_ciphertext TEXT NOT NULL,
  api_key_iv TEXT NOT NULL,
  api_key_masked TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  last_test_at TEXT,
  last_test_status TEXT CHECK (last_test_status IN ('success', 'error')),
  last_test_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_connections_user
  ON ai_connections(user_id, updated_at);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  connection_id TEXT,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (connection_id) REFERENCES ai_connections(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user
  ON ai_conversations(user_id, updated_at);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('complete', 'partial', 'error')),
  error_code TEXT,
  sequence_no INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
  UNIQUE (conversation_id, sequence_no)
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON ai_messages(conversation_id, sequence_no);

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  user_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  input_chars INTEGER NOT NULL DEFAULT 0,
  output_chars INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, usage_date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
