const express = require('express');
const { getSummary } = require('../lib/dashboardAggregate');
const { getUsageSummary } = require('../db/usageLogRepo');

const router = express.Router();

router.get('/summary', (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 7;
  res.json(getSummary({ days }));
});

router.get('/usage', (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  res.json(getUsageSummary({ days }));
});

module.exports = router;
