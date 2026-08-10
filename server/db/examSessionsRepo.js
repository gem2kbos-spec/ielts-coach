const crypto = require('crypto');
const { getDb } = require('./client');
const { listAttempts, getAttempt } = require('./attemptsRepo');
const { getItem } = require('./itemsRepo');
const { accuracyToApproxBand } = require('../lib/readingBand');

function getExamSession(id, userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM exam_sessions WHERE id = ? AND user_id = ?').get(id, userId);
}

function listExamSessions(userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM exam_sessions WHERE user_id = ? ORDER BY scheduled_at DESC').all(userId);
}

// 当前时间点这个用户是否处于某个已安排的模考锁定窗口内——锁是按用户隔离的，
// 不会因为另一个账号在模考就锁住所有人。
function getActiveLock(userId) {
  const db = getDb();
  const now = new Date().toISOString();
  return db
    .prepare(
      `SELECT * FROM exam_sessions
       WHERE user_id = ? AND status != 'cancelled' AND scheduled_at <= ? AND locked_until > ?
       ORDER BY scheduled_at DESC LIMIT 1`
    )
    .get(userId, now, now);
}

function cancelExamSession(id, userId) {
  const db = getDb();
  db.prepare("UPDATE exam_sessions SET status = 'cancelled' WHERE id = ? AND user_id = ?").run(id, userId);
}

const MOCK_STAGES = ['writing', 'speaking', 'reading', 'listening'];

// 完整模考：默认立刻开始，也可以传scheduledAt安排到未来某个时间点
// (锁定要等到那个时间点才生效，getActiveLock本来就只认scheduled_at<=now的)。
// 锁定窗口给足够长的余量(3.5小时)，具体哪一关该放行哪些/api/*由examTimer.js
// 按progress.currentStageIndex动态判断，不是简单的"模考期间只放行写作+口语"这种固定allowlist。
function createMockFullSession(userId, { scheduledAt } = {}) {
  const db = getDb();
  const id = crypto.randomUUID();
  const startAt = scheduledAt ? new Date(scheduledAt) : new Date();
  const lockedUntil = new Date(startAt.getTime() + 210 * 60_000);
  const progress = {
    stages: MOCK_STAGES,
    currentStageIndex: 0,
    stageStartedAt: startAt.toISOString(),
    results: [],
  };
  db.prepare(
    `INSERT INTO exam_sessions (id, user_id, type, scheduled_at, locked_until, status, progress)
     VALUES (?, ?, 'mock_full', ?, ?, 'scheduled', ?)`
  ).run(id, userId, startAt.toISOString(), lockedUntil.toISOString(), JSON.stringify(progress));
  return getMockSession(id, userId);
}

function getMockSession(id, userId) {
  const row = getExamSession(id, userId);
  if (!row) return null;
  return { ...row, progress: JSON.parse(row.progress || 'null') };
}

// 有没有一个还没走完(没cancel/没completed)的模考——不管是已经在锁定窗口里，
// 还是安排在未来还没到点——用来防止用户在已有一个进行中/已安排的模考时又开一个新的。
function getPendingMockSession(userId) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM exam_sessions WHERE user_id = ? AND type = 'mock_full' AND status = 'scheduled' ORDER BY scheduled_at DESC LIMIT 1`
    )
    .get(userId);
  if (!row) return null;
  return { ...row, progress: JSON.parse(row.progress || 'null') };
}

// 哪些attempt算"这一关交的卷"，服务端自己查——按"这一关开始之后、对应模块创建的attempt"来认，
// 不需要前端知道/传attemptId(前端各个练习页面本来就没有"汇报给模考"的概念，硬塞一个回传机制
// 成本更高，不如服务端自己按时间窗口找)。
// 写作关比较特殊：真实雅思写作是Task1+Task2两篇按1:2权重算一个分，所以这一关要分别找
// 最新的task1_chart和task2_argumentative两条attempt，不是随便抓"最新一条module=writing"。
function findStageAttemptIds(userId, stage, stageStartedAt) {
  if (stage === 'writing') {
    const candidates = listAttempts({ userId, module: 'writing', since: stageStartedAt, limit: 10 });
    const bySubtype = {};
    for (const a of candidates) {
      if (!a.item_id) continue;
      const item = getItem(a.item_id);
      const subtype = item?.subtype;
      if ((subtype === 'task1_chart' || subtype === 'task2_argumentative') && !bySubtype[subtype]) {
        bySubtype[subtype] = a.id;
      }
    }
    return [bySubtype.task1_chart, bySubtype.task2_argumentative].filter(Boolean);
  }
  const candidates = listAttempts({ userId, module: stage, since: stageStartedAt, limit: 5 });
  return candidates[0] ? [candidates[0].id] : [];
}

function advanceMockSession(id, userId) {
  const db = getDb();
  const session = getMockSession(id, userId);
  if (!session) throw new Error('模考session不存在');
  const progress = session.progress;
  const stage = progress.stages[progress.currentStageIndex];
  const attemptIds = findStageAttemptIds(userId, stage, progress.stageStartedAt);
  progress.results.push({ stage, attemptIds, completedAt: new Date().toISOString() });
  progress.currentStageIndex += 1;
  progress.stageStartedAt = new Date().toISOString();

  const isDone = progress.currentStageIndex >= progress.stages.length;
  db.prepare('UPDATE exam_sessions SET progress = ?, status = ? WHERE id = ?').run(
    JSON.stringify(progress),
    isDone ? 'completed' : 'scheduled',
    id
  );
  if (isDone) {
    // 模考全部跑完，立刻解锁，不用等满3.5小时的硬窗口
    db.prepare("UPDATE exam_sessions SET locked_until = ? WHERE id = ?").run(new Date().toISOString(), id);
  }
  return getMockSession(id, userId);
}

const STAGE_LABEL = { writing: '写作', speaking: '口语', reading: '阅读', listening: '听力' };

// 汇总报告：四关里每一关找到的attempt，尽量给个band估计——
// 写作关有可能是Task1+Task2两条attempt，按1:2权重合并成一个band(跟真实雅思写作算分方式一致)；
// 口语关用的是完整流程(Part1→2→3)自己存的那一条合并attempt，本身就是一个综合band；
// 听力全真模拟attempt自带band；阅读模块是自由练习单篇，没有统一的"满分40原始分"，
// 只能用正确率粗略换算，标注清楚是估计值。
function getMockReport(id, userId) {
  const session = getMockSession(id, userId);
  if (!session) return null;

  const legs = session.progress.results.map((r) => {
    const attemptIds = r.attemptIds || (r.attemptId ? [r.attemptId] : []);
    const attempts = attemptIds.map((aid) => getAttempt(aid)).filter(Boolean);
    let band = null;
    let approxBand = false;
    let detail = null;

    if (r.stage === 'writing' && attempts.length > 0) {
      // task1权重1，task2权重2——按item的subtype认，不是按attempts数组顺序
      const byType = {};
      for (const a of attempts) {
        const item = a.item_id ? getItem(a.item_id) : null;
        if (item?.subtype === 'task1_chart') byType.task1 = a;
        if (item?.subtype === 'task2_argumentative') byType.task2 = a;
      }
      const weighted = [];
      if (byType.task1) weighted.push({ band: byType.task1.band_overall, weight: 1 });
      if (byType.task2) weighted.push({ band: byType.task2.band_overall, weight: 2 });
      if (weighted.length > 0) {
        const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
        band = Math.round((weighted.reduce((s, w) => s + w.band * w.weight, 0) / totalWeight) * 2) / 2;
        approxBand = weighted.length < 2; // 只做了一篇的话只能算近似
      }
      detail = { task1: byType.task1?.score || null, task2: byType.task2?.score || null };
    } else if (attempts.length > 0) {
      const attempt = attempts[0];
      const score = attempt.score;
      if (typeof attempt.band_overall === 'number') {
        band = attempt.band_overall;
        detail = score;
      } else if (r.stage === 'reading' && score && typeof score.accuracy === 'number') {
        band = accuracyToApproxBand(score.accuracy);
        approxBand = true;
        detail = score;
      } else if (score && typeof score.accuracy === 'number') {
        detail = score;
      }
    }

    return {
      stage: r.stage,
      label: STAGE_LABEL[r.stage] || r.stage,
      attemptIds,
      completedAt: r.completedAt,
      band,
      approxBand,
      detail,
      skipped: attemptIds.length === 0,
    };
  });

  const bandsForOverall = legs.filter((l) => typeof l.band === 'number').map((l) => l.band);
  const overallBand =
    bandsForOverall.length > 0
      ? Math.round((bandsForOverall.reduce((a, b) => a + b, 0) / bandsForOverall.length) * 2) / 2
      : null;

  return { sessionId: id, status: session.status, legs, overallBand };
}

module.exports = {
  getExamSession,
  listExamSessions,
  getActiveLock,
  cancelExamSession,
  MOCK_STAGES,
  createMockFullSession,
  getMockSession,
  getPendingMockSession,
  advanceMockSession,
  getMockReport,
};
