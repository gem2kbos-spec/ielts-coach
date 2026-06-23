const crypto = require('crypto');
const { getDb } = require('./client');
const { toSqliteDatetime } = require('../lib/sqliteTime');

function logUsage({ provider, feature, costUsd }) {
  const db = getDb();
  db.prepare(
    `INSERT INTO usage_log (id, provider, feature, cost_usd) VALUES (@id, @provider, @feature, @cost_usd)`
  ).run({ id: crypto.randomUUID(), provider, feature, cost_usd: costUsd ?? null });
}

function getUsageSummary({ days = 30 } = {}) {
  const db = getDb();
  const since = toSqliteDatetime(new Date(Date.now() - days * 86_400_000).toISOString());
  const rows = db
    .prepare(`SELECT provider, feature, cost_usd, created_at FROM usage_log WHERE created_at >= ?`)
    .all(since);

  let totalCostUsd = 0;
  let callCount = 0;
  const byFeature = {};
  const byDay = {};

  for (const row of rows) {
    callCount += 1;
    const cost = row.cost_usd || 0;
    totalCostUsd += cost;

    if (!byFeature[row.feature]) byFeature[row.feature] = { count: 0, costUsd: 0 };
    byFeature[row.feature].count += 1;
    byFeature[row.feature].costUsd += cost;

    const day = row.created_at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + cost;
  }

  for (const f of Object.values(byFeature)) {
    f.costUsd = Math.round(f.costUsd * 10000) / 10000;
  }

  return {
    days,
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    callCount,
    byFeature,
    byDay: Object.entries(byDay)
      .map(([date, costUsd]) => ({ date, costUsd: Math.round(costUsd * 10000) / 10000 }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

module.exports = { logUsage, getUsageSummary };
