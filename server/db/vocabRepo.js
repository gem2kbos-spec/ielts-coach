const crypto = require('crypto');
const { getDb } = require('./client');

// 同一个词(大小写/首尾空格不敏感)在自己词库里已经有几条——加词前先查这个，
// 避免连续点几次"标记生词"就插进去好几条重复记录(之前没有这个检查，纯靠前端按钮disable防抖，
// 网络慢一点/手抖多点几下还是会重复插入)。
function countByWord(userId, word) {
  const db = getDb();
  const normalized = word.trim().toLowerCase();
  return db
    .prepare('SELECT COUNT(*) as c FROM vocab WHERE user_id = ? AND LOWER(TRIM(word)) = ?')
    .get(userId, normalized).c;
}

function createVocab(v) {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO vocab (id, user_id, word, context_sentence, source_item_id, chinese_gloss, detail, tags, needs_reinforcement)
     VALUES (@id, @user_id, @word, @context_sentence, @source_item_id, @chinese_gloss, @detail, @tags, @needs_reinforcement)`
  ).run({
    id,
    user_id: v.userId,
    word: v.word,
    context_sentence: v.contextSentence || null,
    source_item_id: v.sourceItemId || null,
    chinese_gloss: v.chineseGloss || null,
    detail: JSON.stringify(v.detail || null),
    tags: JSON.stringify(v.tags || []),
    needs_reinforcement: v.needsReinforcement ? 1 : 0,
  });
  return getVocab(id, v.userId);
}

// 标记来源是哪个模块——给前端展示"这个词是从阅读文章/表达训练哪道题冒出来的"用，
// 不是attempt的归因标签，所以不复用attemptLabel.js那套(那个是给做题记录用的，输入形状不一样)。
function sourceLabel(module, subtype) {
  if (module === 'reading') return '阅读';
  if (module === 'listening') return '听力';
  if (module === 'writing_expression') return subtype === 'phrase_drill' ? '表达训练·词组' : '表达训练·句子翻译';
  return null;
}

function rowToVocab(row) {
  if (!row) return null;
  return {
    ...row,
    detail: JSON.parse(row.detail || 'null'),
    tags: JSON.parse(row.tags || '[]'),
    needs_reinforcement: !!row.needs_reinforcement,
    source: row.source_module ? { module: row.source_module, label: sourceLabel(row.source_module, row.source_subtype) } : null,
  };
}

const SELECT_WITH_SOURCE = `
  SELECT v.*, i.module as source_module, i.subtype as source_subtype
  FROM vocab v
  LEFT JOIN items i ON v.source_item_id = i.id
`;

function getVocab(id, userId) {
  const db = getDb();
  return rowToVocab(db.prepare(`${SELECT_WITH_SOURCE} WHERE v.id = ? AND v.user_id = ?`).get(id, userId));
}

function listVocab({ userId, q, needsReinforcement } = {}) {
  const db = getDb();
  let sql = `${SELECT_WITH_SOURCE} WHERE v.user_id = ?`;
  const params = [userId];
  if (q) {
    sql += ' AND (v.word LIKE ? OR v.chinese_gloss LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (needsReinforcement) {
    sql += ' AND v.needs_reinforcement = 1';
  }
  sql += ' ORDER BY v.created_at DESC';
  return db.prepare(sql).all(...params).map(rowToVocab);
}

function updateVocab(id, userId, patch) {
  const db = getDb();
  const existing = getVocab(id, userId);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  db.prepare(
    `UPDATE vocab SET word=@word, context_sentence=@context_sentence, chinese_gloss=@chinese_gloss, detail=@detail, tags=@tags, needs_reinforcement=@needs_reinforcement WHERE id=@id AND user_id=@user_id`
  ).run({
    id,
    user_id: userId,
    word: merged.word,
    context_sentence: merged.context_sentence,
    chinese_gloss: merged.chinese_gloss,
    detail: JSON.stringify(merged.detail || null),
    tags: JSON.stringify(merged.tags || []),
    needs_reinforcement: merged.needs_reinforcement ? 1 : 0,
  });
  return getVocab(id, userId);
}

function deleteVocab(id, userId) {
  const db = getDb();
  db.prepare('DELETE FROM vocab WHERE id = ? AND user_id = ?').run(id, userId);
}

module.exports = { createVocab, getVocab, listVocab, updateVocab, deleteVocab, countByWord };
