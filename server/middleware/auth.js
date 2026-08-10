const { verifyToken } = require('../lib/auth');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '未登录', code: 'NO_TOKEN' });
  try {
    req.userId = verifyToken(token);
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    res.status(401).json({ error: '登录状态已失效，请重新登录', code });
  }
}

module.exports = { requireAuth };
