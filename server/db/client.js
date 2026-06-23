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
