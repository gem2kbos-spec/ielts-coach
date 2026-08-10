const { getDb } = require('../db/client');
const { toSqliteDatetime } = require('./sqliteTime');
const { getAttemptLabel } = require('./attemptLabel');

function getSummary(userId, { days = 7 } = {}) {
  const { getItem } = require('../db/itemsRepo');
  const db = getDb();
  const since = toSqliteDatetime(new Date(Date.now() - days * 86_400_000).toISOString());

  const rows = db
    .prepare(`SELECT item_id, module, band_overall, score, raw_response, error_tags, created_at FROM attempts WHERE user_id = ? AND created_at >= ?`)
    .all(userId, since);

  const byModule = {};
  const bySubtype = {};
  const tagFrequency = {};
  const trend = [];

  for (const row of rows) {
    if (!byModule[row.module]) byModule[row.module] = { count: 0, bandSum: 0, bandCount: 0, accuracySum: 0, accuracyCount: 0 };
    const bucket = byModule[row.module];
    bucket.count += 1;

    const score = JSON.parse(row.score || 'null');
    const rawResponse = JSON.parse(row.raw_response || 'null');
    const date = row.created_at.slice(0, 10);

    const item = row.item_id ? getItem(row.item_id) : null;
    const { key: subtypeKey, label: subtypeLabel } = getAttemptLabel({ module: row.module, item, rawResponse, score });
    const subtypeBucketKey = `${row.module}:${subtypeKey}`;
    if (!bySubtype[subtypeBucketKey]) {
      bySubtype[subtypeBucketKey] = { module: row.module, label: subtypeLabel, count: 0, bandSum: 0, bandCount: 0, accuracySum: 0, accuracyCount: 0 };
    }
    const subBucket = bySubtype[subtypeBucketKey];
    subBucket.count += 1;

    if (typeof row.band_overall === 'number') {
      bucket.bandSum += row.band_overall;
      bucket.bandCount += 1;
      subBucket.bandSum += row.band_overall;
      subBucket.bandCount += 1;
      trend.push({ date, module: row.module, band: row.band_overall });
    } else if (score && typeof score.accuracy === 'number') {
      bucket.accuracySum += score.accuracy;
      bucket.accuracyCount += 1;
      subBucket.accuracySum += score.accuracy;
      subBucket.accuracyCount += 1;
      trend.push({ date, module: row.module, accuracy: score.accuracy });
    }

    const tags = JSON.parse(row.error_tags || '[]');
    for (const tag of tags) {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    }
  }

  const byModuleSummary = {};
  for (const [mod, b] of Object.entries(byModule)) {
    byModuleSummary[mod] = {
      count: b.count,
      avgBand: b.bandCount > 0 ? Math.round((b.bandSum / b.bandCount) * 10) / 10 : null,
      avgAccuracy: b.accuracyCount > 0 ? Math.round((b.accuracySum / b.accuracyCount) * 10) / 10 : null,
    };
  }

  const bySubtypeSummary = {};
  for (const [key, b] of Object.entries(bySubtype)) {
    bySubtypeSummary[key] = {
      module: b.module,
      label: b.label,
      count: b.count,
      avgBand: b.bandCount > 0 ? Math.round((b.bandSum / b.bandCount) * 10) / 10 : null,
      avgAccuracy: b.accuracyCount > 0 ? Math.round((b.accuracySum / b.accuracyCount) * 10) / 10 : null,
    };
  }

  return {
    range: { since, days },
    totalAttempts: rows.length,
    byModule: byModuleSummary,
    bySubtype: bySubtypeSummary,
    errorTagFrequency: tagFrequency,
    trend: trend.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

module.exports = { getSummary };
