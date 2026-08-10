CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'pro',
  subscription_expires_at TEXT,
  ai_calls_today INTEGER NOT NULL DEFAULT 0,
  ai_calls_month INTEGER NOT NULL DEFAULT 0,
  ai_calls_today_date TEXT,
  ai_calls_month_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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
  user_id TEXT REFERENCES users(id),
  module TEXT NOT NULL,
  session_id TEXT,
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
  user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  scheduled_at TEXT,
  locked_until TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  progress TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vocab (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
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

CREATE TABLE IF NOT EXISTS expression_review (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  status TEXT NOT NULL DEFAULT 'new',
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  interval_days INTEGER NOT NULL DEFAULT 0,
  next_due_at TEXT,
  last_result TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_module ON items(module);
CREATE INDEX IF NOT EXISTS idx_attempts_module ON attempts(module);
CREATE INDEX IF NOT EXISTS idx_attempts_created ON attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocab(word);
CREATE INDEX IF NOT EXISTS idx_usage_log_created ON usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_expression_review_item ON expression_review(item_id);
CREATE INDEX IF NOT EXISTS idx_expression_review_due ON expression_review(next_due_at);

-- user_id相关的索引放在 client.js 的 runMigrations 里创建（不是这里）：
-- 这几列在已存在的旧库上要靠 ALTER TABLE 补，这个文件在旧库上每次启动都会先整个 exec 一遍，
-- 如果索引在这里建，旧库还没补列就会因为"no such column: user_id"直接崩掉。
