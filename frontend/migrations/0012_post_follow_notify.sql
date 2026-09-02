-- Notify followers when an author publishes a new post (in-site + email outbox)

CREATE TABLE IF NOT EXISTS notifications_v5 (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'reply', 'message', 'post')),
  post_id TEXT,
  comment_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (actor_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

INSERT INTO notifications_v5 (id, user_id, actor_id, type, post_id, comment_id, read_at, created_at)
SELECT id, user_id, actor_id, type, post_id, comment_id, read_at, created_at
FROM notifications;

DROP TABLE notifications;
ALTER TABLE notifications_v5 RENAME TO notifications;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_post_type ON notifications(post_id, type);

-- Email outbox: one row per follower × post; cron marks email_notified_at after send
CREATE TABLE IF NOT EXISTS post_follow_emails (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  email_notified_at TEXT,
  UNIQUE (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_post_follow_emails_pending
  ON post_follow_emails(email_notified_at, created_at);
CREATE INDEX IF NOT EXISTS idx_post_follow_emails_post
  ON post_follow_emails(post_id);
