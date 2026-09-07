-- Soft moderation flags for users.
-- muted_at: set when muted (禁言); cleared when unmuted
-- deleted_at: soft-delete; login blocked

ALTER TABLE users ADD COLUMN muted_at TEXT;
ALTER TABLE users ADD COLUMN deleted_at TEXT;
