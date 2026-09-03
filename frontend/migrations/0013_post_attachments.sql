-- Downloadable file attachments for posts (stored in R2; metadata in D1)
CREATE TABLE IF NOT EXISTS post_attachments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_post_attachments_post
  ON post_attachments(post_id, sort_order);
