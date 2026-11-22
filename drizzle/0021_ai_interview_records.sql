CREATE TABLE IF NOT EXISTS ai_interview_records (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed',
  interaction_id TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_interview_records_user
  ON ai_interview_records(user_id, kind, updated_at DESC);
