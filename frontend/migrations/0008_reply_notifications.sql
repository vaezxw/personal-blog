-- Allow reply notifications
CREATE TABLE IF NOT EXISTS notifications_v3 (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'reply')),
  post_id TEXT,
  comment_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (actor_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

INSERT INTO notifications_v3 (id, user_id, actor_id, type, post_id, comment_id, read_at, created_at)
SELECT id, user_id, actor_id, type, post_id, comment_id, read_at, created_at
FROM notifications;

DROP TABLE notifications;
ALTER TABLE notifications_v3 RENAME TO notifications;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at);
