const crypto = require('crypto');
const { getDb } = require('./client');
const { toSqliteDatetime } = require('../lib/sqliteTime');

function createAttempt(a) {
  const db = getDb();
  const id = a.id || crypto.randomUUID();
  const row = {
    id,
    module: a.module,
    item_id: a.itemId || null,
    started_at: a.startedAt || null,
    finished_at: a.finishedAt || new Date().toISOString(),
    duration_sec: a.durationSec ?? null,
    raw_response: JSON.stringify(a.rawResponse ?? null),
    score: JSON.stringify(a.score ?? null),
    band_overall: a.bandOverall ?? null,
    error_tags: JSON.stringify(a.errorTags || []),
    audio_path: a.audioPath || null,
    transcript: a.transcript || null,
  };
  db.prepare(
    `INSERT INTO attempts (id, module, item_id, started_at, finished_at, duration_sec, raw_response, score, band_overall, error_tags, audio_path, transcript)
     VALUES (@id, @module, @item_id, @started_at, @finished_at, @duration_sec, @raw_response, @score, @band_overall, @error_tags, @audio_path, @transcript)`
  ).run(row);
  return getAttempt(id);
}

function rowToAttempt(row) {
  if (!row) return null;
  return {
    ...row,
    raw_response: JSON.parse(row.raw_response || 'null'),
    score: JSON.parse(row.score || 'null'),
    error_tags: JSON.parse(row.error_tags || '[]'),
  };
}

function getAttempt(id) {
  const db = getDb();
  return rowToAttempt(db.prepare('SELECT * FROM attempts WHERE id = ?').get(id));
}

function listAttempts({ module, since, limit = 100 } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM attempts WHERE 1=1';
  const params = [];
  if (module) {
    sql += ' AND module = ?';
    params.push(module);
  }
  if (since) {
    sql += ' AND created_at >= ?';
    params.push(toSqliteDatetime(since));
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  return db.prepare(sql).all(...params).map(rowToAttempt);
}

function getLatestAttemptForItem(itemId) {
  const db = getDb();
  return rowToAttempt(
    db.prepare('SELECT * FROM attempts WHERE item_id = ? ORDER BY created_at DESC LIMIT 1').get(itemId)
  );
}

module.exports = { createAttempt, getAttempt, listAttempts, getLatestAttemptForItem };
