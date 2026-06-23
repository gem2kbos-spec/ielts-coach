const crypto = require('crypto');
const { getDb } = require('./client');

function createVocab(v) {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO vocab (id, word, context_sentence, source_item_id, chinese_gloss, detail, tags, needs_reinforcement)
     VALUES (@id, @word, @context_sentence, @source_item_id, @chinese_gloss, @detail, @tags, @needs_reinforcement)`
  ).run({
    id,
    word: v.word,
    context_sentence: v.contextSentence || null,
    source_item_id: v.sourceItemId || null,
    chinese_gloss: v.chineseGloss || null,
    detail: JSON.stringify(v.detail || null),
    tags: JSON.stringify(v.tags || []),
    needs_reinforcement: v.needsReinforcement ? 1 : 0,
  });
  return getVocab(id);
}

function rowToVocab(row) {
  if (!row) return null;
  return {
    ...row,
    detail: JSON.parse(row.detail || 'null'),
    tags: JSON.parse(row.tags || '[]'),
    needs_reinforcement: !!row.needs_reinforcement,
  };
}

function getVocab(id) {
  const db = getDb();
  return rowToVocab(db.prepare('SELECT * FROM vocab WHERE id = ?').get(id));
}

function listVocab({ q, needsReinforcement } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM vocab WHERE 1=1';
  const params = [];
  if (q) {
    sql += ' AND (word LIKE ? OR chinese_gloss LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (needsReinforcement) {
    sql += ' AND needs_reinforcement = 1';
  }
  sql += ' ORDER BY created_at DESC';
  return db.prepare(sql).all(...params).map(rowToVocab);
}

function updateVocab(id, patch) {
  const db = getDb();
  const existing = getVocab(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  db.prepare(
    `UPDATE vocab SET word=@word, context_sentence=@context_sentence, chinese_gloss=@chinese_gloss, detail=@detail, tags=@tags, needs_reinforcement=@needs_reinforcement WHERE id=@id`
  ).run({
    id,
    word: merged.word,
    context_sentence: merged.context_sentence,
    chinese_gloss: merged.chinese_gloss,
    detail: JSON.stringify(merged.detail || null),
    tags: JSON.stringify(merged.tags || []),
    needs_reinforcement: merged.needs_reinforcement ? 1 : 0,
  });
  return getVocab(id);
}

function deleteVocab(id) {
  const db = getDb();
  db.prepare('DELETE FROM vocab WHERE id = ?').run(id);
}

module.exports = { createVocab, getVocab, listVocab, updateVocab, deleteVocab };
