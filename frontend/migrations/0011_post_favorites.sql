-- Article favorites / bookmarks

ALTER TABLE posts ADD COLUMN favorite_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS post_favorites (
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE INDEX IF NOT EXISTS idx_post_favorites_post ON post_favorites(post_id);
CREATE INDEX IF NOT EXISTS idx_post_favorites_user ON post_favorites(user_id, created_at);
