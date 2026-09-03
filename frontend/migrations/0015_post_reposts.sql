-- Repost / reprint of another post (source card)
ALTER TABLE posts ADD COLUMN repost_of_post_id TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_repost_of ON posts(repost_of_post_id);
