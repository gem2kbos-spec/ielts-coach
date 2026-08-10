const express = require('express');
const { getDb } = require('../db/client');
const { getItem } = require('../db/itemsRepo');
const { listVocab } = require('../db/vocabRepo');
const { toSqliteDatetime } = require('../lib/sqliteTime');
const { aggregateWeakness } = require('../lib/weaknessAggregate');

const router = express.Router();

router.get('/', (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 90;
  const db = getDb();
  const since = toSqliteDatetime(new Date(Date.now() - days * 86_400_000).toISOString());

  const writingRows = db
    .prepare(`SELECT score, created_at FROM attempts WHERE module = 'writing' AND user_id = ? AND created_at >= ?`)
    .all(req.userId, since)
    .map((r) => ({ created_at: r.created_at, score: JSON.parse(r.score || 'null') }));

  const speakingRows = db
    .prepare(`SELECT raw_response, created_at FROM attempts WHERE module = 'speaking' AND user_id = ? AND created_at >= ?`)
    .all(req.userId, since)
    .map((r) => ({ created_at: r.created_at, rawResponse: JSON.parse(r.raw_response || 'null') }));

  const expressionRows = db
    .prepare(`SELECT item_id, score, error_tags, created_at FROM attempts WHERE module = 'writing_expression' AND user_id = ? AND created_at >= ?`)
    .all(req.userId, since)
    .map((r) => ({
      created_at: r.created_at,
      score: JSON.parse(r.score || 'null'),
      errorTags: JSON.parse(r.error_tags || '[]'),
      item: r.item_id ? getItem(r.item_id) : null,
    }));

  const vocabRows = listVocab({ userId: req.userId });

  res.json(aggregateWeakness({ writingRows, speakingRows, expressionRows, vocabRows }));
});

module.exports = router;
