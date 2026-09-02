-- 1:1 private messages between users

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  user_low_id TEXT NOT NULL,
  user_high_id TEXT NOT NULL,
  last_message_at TEXT,
  last_message_preview TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (user_low_id, user_high_id),
  FOREIGN KEY (user_low_id) REFERENCES users(id),
  FOREIGN KEY (user_high_id) REFERENCES users(id),
  CHECK (user_low_id < user_high_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_last ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_conversations_low ON conversations(user_low_id);
CREATE INDEX IF NOT EXISTS idx_conversations_high ON conversations(user_high_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, sender_id, read_at);

-- Allow message notifications in activity feed
CREATE TABLE IF NOT EXISTS notifications_v4 (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'reply', 'message')),
  post_id TEXT,
  comment_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (actor_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

INSERT INTO notifications_v4 (id, user_id, actor_id, type, post_id, comment_id, read_at, created_at)
SELECT id, user_id, actor_id, type, post_id, comment_id, read_at, created_at
FROM notifications;

DROP TABLE notifications;
ALTER TABLE notifications_v4 RENAME TO notifications;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at);
