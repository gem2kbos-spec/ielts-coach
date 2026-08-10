const crypto = require('crypto');
const { getDb } = require('./client');
const { toSqliteDatetime } = require('../lib/sqliteTime');
const { getAttemptLabel } = require('../lib/attemptLabel');
const { computeAttemptDelta } = require('../lib/attemptCompare');

function createAttempt(a) {
  const db = getDb();
  const id = a.id || crypto.randomUUID();
  const row = {
    id,
    user_id: a.userId,
    module: a.module,
    session_id: a.sessionId || null,
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
    `INSERT INTO attempts (id, user_id, module, session_id, item_id, started_at, finished_at, duration_sec, raw_response, score, band_overall, error_tags, audio_path, transcript)
     VALUES (@id, @user_id, @module, @session_id, @item_id, @started_at, @finished_at, @duration_sec, @raw_response, @score, @band_overall, @error_tags, @audio_path, @transcript)`
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

function listAttempts({ userId, module, since, limit = 100 } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM attempts WHERE user_id = ?';
  const params = [userId];
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

function getLatestAttemptForItem(itemId, userId) {
  const db = getDb();
  return rowToAttempt(
    db.prepare('SELECT * FROM attempts WHERE item_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1').get(itemId, userId)
  );
}

// 历史记录列表用：在内存里给label分类筛选+分页(个人本地用量级，几百条attempt不需要在SQL层面
// 优化子类型筛选——子类型本来就不是DB列，是从item.subtype/rawResponse特征推出来的)。
function listAttemptsEnriched({ userId, module, subtypeKey, limit = 20, offset = 0 } = {}) {
  // 避免循环依赖：itemsRepo不依赖attemptsRepo，这里require是安全的，
  // 放在函数内部而不是顶层只是为了让依赖关系在文件里更直观
  const { getItem } = require('./itemsRepo');
  const db = getDb();
  let sql = 'SELECT * FROM attempts WHERE user_id = ?';
  const params = [userId];
  if (module) {
    sql += ' AND module = ?';
    params.push(module);
  }
  sql += ' ORDER BY created_at DESC';
  const all = db.prepare(sql).all(...params).map(rowToAttempt);

  const enriched = all.map((a) => {
    const item = a.item_id ? getItem(a.item_id) : null;
    const label = getAttemptLabel({ module: a.module, item, rawResponse: a.raw_response, score: a.score });
    const summary =
      typeof a.band_overall === 'number'
        ? { kind: 'band', value: a.band_overall }
        : typeof a.score?.accuracy === 'number'
          ? { kind: 'accuracy', value: a.score.accuracy }
          : { kind: 'none', value: null };
    return {
      id: a.id,
      module: a.module,
      created_at: a.created_at,
      durationSec: a.duration_sec,
      errorTags: a.error_tags,
      title:
        item?.content?.title ||
        item?.content?.topic ||
        item?.content?.prompt?.slice(0, 40) ||
        item?.content?.description?.slice(0, 40) ||
        null,
      label,
      summary,
    };
  });

  const filtered = subtypeKey ? enriched.filter((a) => a.label.key === subtypeKey) : enriched;
  return { items: filtered.slice(offset, offset + limit), total: filtered.length };
}

// 找"上一次同类型"的attempt——子类型不是DB列，没法直接SQL筛，
// 就按created_at往前翻同module的记录，边翻边算label，命中第一个key相同的就是"上一次"。
// 个人本地用量级，翻50条找不到就放弃，不值得无限翻。
function getPreviousSameTypeAttempt(current, labelKey) {
  const { getItem } = require('./itemsRepo');
  const db = getDb();
  const candidates = db
    .prepare(`SELECT * FROM attempts WHERE user_id = ? AND module = ? AND created_at < ? AND id != ? ORDER BY created_at DESC LIMIT 50`)
    .all(current.user_id, current.module, current.created_at, current.id)
    .map(rowToAttempt);

  for (const c of candidates) {
    const item = c.item_id ? getItem(c.item_id) : null;
    const label = getAttemptLabel({ module: c.module, item, rawResponse: c.raw_response, score: c.score });
    if (label.key === labelKey) return c;
  }
  return null;
}

function getAttemptDetail(id, userId) {
  const { getItem } = require('./itemsRepo');
  const attempt = getAttempt(id);
  if (!attempt || attempt.user_id !== userId) return null;
  const item = attempt.item_id ? getItem(attempt.item_id) : null;
  const label = getAttemptLabel({ module: attempt.module, item, rawResponse: attempt.raw_response, score: attempt.score });
  const previous = getPreviousSameTypeAttempt(attempt, label.key);
  const delta = previous ? computeAttemptDelta(attempt, previous) : null;
  return {
    ...attempt,
    item,
    label,
    previous: previous ? { id: previous.id, created_at: previous.created_at, band_overall: previous.band_overall, score: previous.score } : null,
    delta,
  };
}

module.exports = {
  createAttempt,
  getAttempt,
  listAttempts,
  getLatestAttemptForItem,
  listAttemptsEnriched,
  getAttemptDetail,
};
