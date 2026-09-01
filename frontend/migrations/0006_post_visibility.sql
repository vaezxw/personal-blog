-- Post visibility: public | friends | private
-- friends = mutual follow; private = author only
ALTER TABLE posts ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';

CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
