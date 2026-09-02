-- Comment replies (one-level threading via parent_id)
ALTER TABLE comments ADD COLUMN parent_id TEXT REFERENCES comments(id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
