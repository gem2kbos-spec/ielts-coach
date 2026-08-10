const { getDb } = require('../db/client');

// 统计用户阅读错题里，按题型分组的出错率，取出错率最高的几种题型作为"薄弱题型"，
// 供AI生成阅读时优先安排这些题型。数据量太少(没有任何阅读记录)时返回空数组，交给生成逻辑随机分配。
function getWeakQuestionTypes(userId, { limit = 3, minSamples = 3 } = {}) {
  const db = getDb();
  const rows = db.prepare("SELECT score FROM attempts WHERE module = 'reading' AND user_id = ?").all(userId);

  const wrongByType = {};
  const totalByType = {};
  for (const row of rows) {
    const score = JSON.parse(row.score || 'null');
    if (!score?.perQuestion) continue;
    for (const q of score.perQuestion) {
      totalByType[q.type] = (totalByType[q.type] || 0) + 1;
      if (!q.correct) wrongByType[q.type] = (wrongByType[q.type] || 0) + 1;
    }
  }

  const rates = Object.keys(totalByType)
    .filter((type) => totalByType[type] >= minSamples)
    .map((type) => ({ type, wrongRate: (wrongByType[type] || 0) / totalByType[type] }))
    .sort((a, b) => b.wrongRate - a.wrongRate);

  return rates.slice(0, limit).map((r) => r.type);
}

module.exports = { getWeakQuestionTypes };
