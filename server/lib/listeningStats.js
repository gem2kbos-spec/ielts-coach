const { getDb } = require('../db/client');

// 按section(S1-S4)聚合听力正确率——诊断skill用这个回答"我听力哪个section最差"这类问题。
function getAccuracyBySection() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.score, i.content FROM attempts a
       JOIN items i ON a.item_id = i.id
       WHERE a.module = 'listening'`
    )
    .all();

  const bySection = {};
  for (const row of rows) {
    const content = JSON.parse(row.content);
    const score = JSON.parse(row.score || 'null');
    if (!content.section || !score || typeof score.total !== 'number') continue;
    if (!bySection[content.section]) bySection[content.section] = { correctSum: 0, totalSum: 0, attempts: 0 };
    bySection[content.section].correctSum += score.correctCount || 0;
    bySection[content.section].totalSum += score.total || 0;
    bySection[content.section].attempts += 1;
  }

  const result = {};
  for (const [section, v] of Object.entries(bySection)) {
    result[section] = {
      accuracy: v.totalSum > 0 ? Math.round((v.correctSum / v.totalSum) * 1000) / 10 : null,
      attempts: v.attempts,
    };
  }
  return result;
}

module.exports = { getAccuracyBySection };
