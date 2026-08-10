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
const historyRouter = require('./routes/history');
const weaknessRouter = require('./routes/weakness');
const expressionsRouter = require('./routes/expressions');
const authRouter = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');
const { examLockMiddleware } = require('./services/examTimer');

const app = express();
app.set('etag', false); // 接口是按用户走的动态JSON，不该被Express自带的ETag/304缓存逻辑拦下来返回空body
app.use(cors());
app.use(express.json({ limit: '10mb' }));
if (process.env.DEBUG_REQUESTS === '1') {
  app.use((req, res, next) => {
    const t0 = Date.now();
    console.log(`[req] ${req.method} ${req.path}`);
    res.on('finish', () => console.log(`[res] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - t0}ms)`));
    next();
  });
}

app.get('/api/health', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT 1 as ok').get();
  const llmProvider = (process.env.LLM_PROVIDER || 'claude').toLowerCase();
  const aiConfigured = llmProvider === 'deepseek'
    ? Boolean(process.env.DEEPSEEK_API_KEY)
    : llmProvider === 'claude';
  res.json({
    app: 'ielts-coach',
    ok: row.ok === 1,
    aiConfigured,
    llmProvider,
    llmModel: llmProvider === 'deepseek' ? (process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash') : null,
    time: new Date().toISOString(),
  });
});

// /api/auth(注册/登录)本身不需要登录态；这一行之后的所有/api/*路由都要求带合法JWT，
// 校验通过后request上会带req.userId，下游路由/examLockMiddleware按这个做用户级数据隔离/锁定。
app.use('/api/auth', authRouter);
app.use('/api', requireAuth);
app.use(examLockMiddleware);

app.use('/api/items', itemsRouter);
app.use('/api/writing', writingRouter);
app.use('/api/speaking', speakingRouter);
app.use('/api/exam-sessions', examSessionRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/vocab', vocabRouter);
app.use('/api/reading', readingRouter);
app.use('/api/listening', listeningRouter);
app.use('/api/backup', backupRouter);
app.use('/api/history', historyRouter);
app.use('/api/weakness', weaknessRouter);
app.use('/api/expressions', expressionsRouter);

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
