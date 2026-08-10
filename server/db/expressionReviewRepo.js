const crypto = require('crypto');
const { getDb } = require('./client');
const { computeNextReview } = require('../lib/expressionReview');

function getReviewState(itemId, userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM expression_review WHERE item_id = ? AND user_id = ?').get(itemId, userId) || null;
}

// 答完一题后调用：没有记录就当作"第一次见"(consecutiveCorrect=0/intervalDays=0)算起，
// 有记录就基于已有状态推进。同一道题不同用户各自维护自己的熟练度，靠(user_id, item_id)的唯一索引区分。
function recordResult(itemId, userId, result) {
  const db = getDb();
  const existing = getReviewState(itemId, userId);
  const next = computeNextReview({
    consecutiveCorrect: existing?.consecutive_correct || 0,
    intervalDays: existing?.interval_days || 0,
    result,
  });
  const id = existing?.id || crypto.randomUUID();
  db.prepare(
    `INSERT INTO expression_review (id, user_id, item_id, status, consecutive_correct, interval_days, next_due_at, last_result, updated_at)
     VALUES (@id, @user_id, @item_id, @status, @consecutive_correct, @interval_days, @next_due_at, @last_result, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       status=excluded.status, consecutive_correct=excluded.consecutive_correct, interval_days=excluded.interval_days,
       next_due_at=excluded.next_due_at, last_result=excluded.last_result, updated_at=datetime('now')`
  ).run({
    id,
    user_id: userId,
    item_id: itemId,
    status: next.status,
    consecutive_correct: next.consecutiveCorrect,
    interval_days: next.intervalDays,
    next_due_at: next.nextDueAt,
    last_result: next.lastResult,
  });
  return getReviewState(itemId, userId);
}

module.exports = { getReviewState, recordResult };
