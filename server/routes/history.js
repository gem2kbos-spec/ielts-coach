const express = require('express');
const { listAttemptsEnriched, getAttemptDetail } = require('../db/attemptsRepo');

const router = express.Router();

router.get('/', (req, res) => {
  const { module, subtype, limit, offset } = req.query;
  res.json(
    listAttemptsEnriched({
      userId: req.userId,
      module: module || undefined,
      subtypeKey: subtype || undefined,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    })
  );
});

router.get('/:id', (req, res) => {
  const detail = getAttemptDetail(req.params.id, req.userId);
  if (!detail) return res.status(404).json({ error: 'not found' });
  res.json(detail);
});

module.exports = router;
