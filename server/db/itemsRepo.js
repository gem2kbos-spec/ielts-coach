const crypto = require('crypto');
const { getDb } = require('./client');
const { assertValidItem } = require('../lib/itemSchema');

function upsertItem(item) {
  assertValidItem(item);
  const db = getDb();
  const id = item.id || crypto.randomUUID();
  const row = {
    id,
    module: item.module,
    subtype: item.subtype,
    difficulty: item.difficulty || null,
    tags: JSON.stringify(item.tags || []),
    content: JSON.stringify(item.content),
    source: item.source || 'builtin_public',
    file_path: item.file_path || null,
  };
  db.prepare(
    `INSERT INTO items (id, module, subtype, difficulty, tags, content, source, file_path)
     VALUES (@id, @module, @subtype, @difficulty, @tags, @content, @source, @file_path)
     ON CONFLICT(id) DO UPDATE SET
       module=excluded.module, subtype=excluded.subtype, difficulty=excluded.difficulty,
       tags=excluded.tags, content=excluded.content, source=excluded.source, file_path=excluded.file_path`
  ).run(row);
  return getItem(id);
}

function rowToItem(row) {
  if (!row) return null;
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    content: JSON.parse(row.content),
  };
}

function getItem(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  return rowToItem(row);
}

function listItems({ module, subtype } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM items WHERE 1=1';
  const params = [];
  if (module) {
    sql += ' AND module = ?';
    params.push(module);
  }
  if (subtype) {
    sql += ' AND subtype = ?';
    params.push(subtype);
  }
  sql += ' ORDER BY created_at DESC';
  return db.prepare(sql).all(...params).map(rowToItem);
}

function deleteItem(id) {
  const db = getDb();
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
}

module.exports = { upsertItem, getItem, listItems, deleteItem };
