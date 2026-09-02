-- Track which unread DMs already triggered an email digest
ALTER TABLE messages ADD COLUMN email_notified_at TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_email_pending
  ON messages(email_notified_at, read_at, created_at);
