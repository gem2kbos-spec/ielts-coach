const crypto = require('crypto');
const { getDb } = require('./client');

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function monthKey() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    planType: row.plan_type,
    subscriptionExpiresAt: row.subscription_expires_at,
    aiCallsToday: row.ai_calls_today,
    aiCallsMonth: row.ai_calls_month,
    createdAt: row.created_at,
  };
}

function countUsers() {
  const db = getDb();
  return db.prepare('SELECT COUNT(*) as c FROM users').get().c;
}

function createUser({ email, passwordHash }) {
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, plan_type, ai_calls_today_date, ai_calls_month_key)
     VALUES (?, ?, ?, 'pro', ?, ?)`
  ).run(id, email, passwordHash, todayKey(), monthKey());
  return getUserById(id);
}

function getUserByEmail(email) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
}

function getUserById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

// 第一个注册的用户（本地版从单用户切到多用户那一刻）认领之前所有"没有主人"的练习数据，
// 这样升级用户系统不会丢掉之前已经攒下的真实练习记录。只在count(users)===0时调用一次。
function claimOrphanedData(userId) {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare('UPDATE attempts SET user_id = ? WHERE user_id IS NULL').run(userId);
    db.prepare('UPDATE exam_sessions SET user_id = ? WHERE user_id IS NULL').run(userId);
    db.prepare('UPDATE vocab SET user_id = ? WHERE user_id IS NULL').run(userId);
    db.prepare('UPDATE expression_review SET user_id = ? WHERE user_id IS NULL').run(userId);
  });
  tx();
}

// 每次成功调用一次AI评分就+1——现在只计数不限额，给后续加限额逻辑用。
// 跨天/跨月自动归零，靠存的date/month key跟当前比对，不需要定时任务。
function incrementAiCalls(userId) {
  const db = getDb();
  const user = getUserById(userId);
  if (!user) return;
  const today = todayKey();
  const month = monthKey();
  const nextToday = user.ai_calls_today_date === today ? user.ai_calls_today + 1 : 1;
  const nextMonth = user.ai_calls_month_key === month ? user.ai_calls_month + 1 : 1;
  db.prepare(
    `UPDATE users SET ai_calls_today = ?, ai_calls_today_date = ?, ai_calls_month = ?, ai_calls_month_key = ? WHERE id = ?`
  ).run(nextToday, today, nextMonth, month, userId);
}

module.exports = {
  toPublicUser,
  countUsers,
  createUser,
  getUserByEmail,
  getUserById,
  claimOrphanedData,
  incrementAiCalls,
};
