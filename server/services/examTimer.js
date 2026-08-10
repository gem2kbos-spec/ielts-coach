const { getActiveLock } = require('../db/examSessionsRepo');

const ALWAYS_ALLOWED_PREFIXES = ['/api/health', '/api/exam-sessions', '/api/dashboard', '/api/backup', '/api/history', '/api/weakness'];

// 完整模考(mock_full)：放行的模块跟着当前关卡动态变化——
// 走到"阅读"关时阅读模块要放开，否则用户没法在锁定窗口里实际做阅读。
// 目前exam_sessions只有这一种type会被创建(旧的"通用排期"接口已经下线)，
// progress解析失败时保守起见全部锁住，而不是猜一个allowlist。
const STAGE_ALLOWED_PREFIXES = {
  writing: ['/api/writing', '/api/items'],
  speaking: ['/api/speaking', '/api/items'],
  reading: ['/api/reading', '/api/items'],
  listening: ['/api/listening', '/api/items'],
};

function examLockMiddleware(req, res, next) {
  if (!req.path.startsWith('/api/')) return next();
  const lock = getActiveLock(req.userId);
  if (!lock) return next();

  if (ALWAYS_ALLOWED_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  let allowedPrefixes = [];
  try {
    const progress = JSON.parse(lock.progress);
    const stage = progress.stages[progress.currentStageIndex];
    allowedPrefixes = STAGE_ALLOWED_PREFIXES[stage] || [];
  } catch {
    allowedPrefixes = [];
  }

  const allowed = allowedPrefixes.some((p) => req.path.startsWith(p));
  if (allowed) return next();
  res.status(423).json({
    error: '考试模拟进行中，本模块暂时锁定',
    lockedUntil: lock.locked_until,
  });
}

module.exports = { examLockMiddleware };
