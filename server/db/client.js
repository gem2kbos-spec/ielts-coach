const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'ielts.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

// schema.sql 用 CREATE TABLE IF NOT EXISTS，表已存在时不会自动补字段，
// 给已有表加列要靠这种轻量迁移（按需检查+ALTER，不需要专门的迁移框架）。
function addColumnIfMissing(database, table, column, definition) {
  const existing = database.prepare(`PRAGMA table_info(${table})`).all();
  if (!existing.some((c) => c.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function runMigrations(database) {
  addColumnIfMissing(database, 'vocab', 'needs_reinforcement', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(database, 'exam_sessions', 'progress', 'TEXT');

  // 用户系统：给已有的几张"个人数据"表补user_id列(新建库走schema.sql已经带这列，这里是兼容旧库)。
  // 索引必须在列确实存在之后才能建，所以也放在这里而不是schema.sql里。
  addColumnIfMissing(database, 'attempts', 'user_id', 'TEXT REFERENCES users(id)');
  addColumnIfMissing(database, 'exam_sessions', 'user_id', 'TEXT REFERENCES users(id)');
  addColumnIfMissing(database, 'vocab', 'user_id', 'TEXT REFERENCES users(id)');
  addColumnIfMissing(database, 'expression_review', 'user_id', 'TEXT REFERENCES users(id)');
  addColumnIfMissing(database, 'attempts', 'session_id', 'TEXT');
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
    CREATE INDEX IF NOT EXISTS idx_vocab_user ON vocab(user_id);
    CREATE INDEX IF NOT EXISTS idx_exam_sessions_user ON exam_sessions(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_expression_review_user_item ON expression_review(user_id, item_id);
  `);
  // 清理重复词条（同用户+同词，保留最早插入的那条），再建唯一索引防止后续重复
  database.exec(`
    DELETE FROM vocab WHERE rowid NOT IN (
      SELECT MIN(rowid) FROM vocab GROUP BY user_id, LOWER(TRIM(word))
    );
  `);
  try {
    database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_vocab_user_word ON vocab(user_id, LOWER(TRIM(word)));`);
  } catch (_) {
    // 如果还有重复导致索引建不上，跳过——运行时插入逻辑会兜底
  }
  addColumnIfMissing(database, 'items', 'deleted_at', 'TEXT');
}

function getDb() {
  if (db) return db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  runMigrations(db);
  return db;
}

// 数据恢复(导入备份)需要先关掉当前连接再换文件，否则在WAL模式下直接覆盖磁盘上的db文件
// 可能跟还活着的连接状态冲突。关闭后把单例置空，下一次getDb()会用新文件重新开一个连接，
// 不需要重启整个Node进程。
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb, DB_PATH };
