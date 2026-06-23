const express = require('express');
const {
  listExamSessions,
  getActiveLock,
  cancelExamSession,
  createMockFullSession,
  getMockSession,
  getPendingMockSession,
  advanceMockSession,
  getMockReport,
} = require('../db/examSessionsRepo');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(listExamSessions());
});

router.get('/active', (req, res) => {
  res.json(getActiveLock() || null);
});

// 进行中或安排在未来还没到点的模考——不管哪种情况，浏览器都不该再让用户开一个新的，
// 应该提示"继续上一个"或"先取消"。
router.get('/mock/pending', (req, res) => {
  res.json(getPendingMockSession() || null);
});

router.delete('/:id', (req, res) => {
  cancelExamSession(req.params.id);
  res.json({ ok: true });
});

// 完整四科模考：写作→口语→阅读→听力依次进行，每关用各模块自己已有的练习页面，
// 这里只负责"立刻开始(或按scheduledAt安排到未来)+按关卡动态锁定其他模块+收尾汇总report"。
router.post('/mock/start', (req, res) => {
  const pending = getPendingMockSession();
  if (pending) {
    return res.status(409).json({ error: '已经有一个进行中/已安排的模考，请先继续完成或取消它', session: pending });
  }
  const { scheduledAt } = req.body || {};
  const session = createMockFullSession({ scheduledAt });
  res.json(session);
});

router.get('/mock/:id', (req, res) => {
  const session = getMockSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'not found' });
  res.json(session);
});

router.post('/mock/:id/advance', (req, res) => {
  try {
    const session = advanceMockSession(req.params.id);
    res.json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/mock/:id/report', (req, res) => {
  const report = getMockReport(req.params.id);
  if (!report) return res.status(404).json({ error: 'not found' });
  res.json(report);
});

module.exports = router;
