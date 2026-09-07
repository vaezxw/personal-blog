-- Fine-grained feature flags for authors. Empty JSON {} means all allowed (compat).
-- Admin role always bypasses these checks in application code.

ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT '{}';
