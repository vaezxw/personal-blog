-- Post dislikes (mutual exclusion with likes handled in API)
ALTER TABLE posts ADD COLUMN dislike_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS post_dislikes (
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE INDEX IF NOT EXISTS idx_post_dislikes_post ON post_dislikes(post_id);
