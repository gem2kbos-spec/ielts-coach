const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { getDb } = require('./db/client');
const itemsRouter = require('./routes/items');
const writingRouter = require('./routes/writing');
const speakingRouter = require('./routes/speaking');
const examSessionRouter = require('./routes/examSession');
const dashboardRouter = require('./routes/dashboard');
const vocabRouter = require('./routes/vocab');
const readingRouter = require('./routes/reading');
const listeningRouter = require('./routes/listening');
const backupRouter = require('./routes/backup');
const { examLockMiddleware } = require('./services/examTimer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(examLockMiddleware);

app.get('/api/health', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT 1 as ok').get();
  res.json({ ok: row.ok === 1, time: new Date().toISOString() });
});

app.use('/api/items', itemsRouter);
app.use('/api/writing', writingRouter);
app.use('/api/speaking', speakingRouter);
app.use('/api/exam-sessions', examSessionRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/vocab', vocabRouter);
app.use('/api/reading', readingRouter);
app.use('/api/listening', listeningRouter);
app.use('/api/backup', backupRouter);

const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 兜底错误处理：某个路由里一个文件解析失败之类的bug不该拖垮整个本地服务，
// 让其他模块也用不了——记下日志，回个500，进程继续活着。
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[unhandled route error]', err);
  if (res.headersSent) return;
  res.status(500).json({ error: '服务内部错误，请重试' });
});

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  if (process.env.OPEN_BROWSER === '1') {
    const url = `http://localhost:${PORT}`;
    exec(`open ${url}`);
  }
});
