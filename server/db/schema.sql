CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  subtype TEXT NOT NULL,
  difficulty TEXT,
  tags TEXT,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'builtin_public',
  file_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  item_id TEXT REFERENCES items(id),
  started_at TEXT,
  finished_at TEXT,
  duration_sec INTEGER,
  raw_response TEXT,
  score TEXT,
  band_overall REAL,
  error_tags TEXT,
  audio_path TEXT,
  transcript TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  scheduled_at TEXT,
  locked_until TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  progress TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vocab (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  context_sentence TEXT,
  source_item_id TEXT REFERENCES items(id),
  chinese_gloss TEXT,
  detail TEXT,
  tags TEXT,
  needs_reinforcement INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usage_log (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  feature TEXT NOT NULL,
  cost_usd REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_module ON items(module);
CREATE INDEX IF NOT EXISTS idx_attempts_module ON attempts(module);
CREATE INDEX IF NOT EXISTS idx_attempts_created ON attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocab(word);
CREATE INDEX IF NOT EXISTS idx_usage_log_created ON usage_log(created_at);
