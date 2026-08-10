const fs = require('fs');
const path = require('path');
const express = require('express');
const { createUser, getUserByEmail, getUserById, toPublicUser, countUsers, claimOrphanedData } = require('../db/usersRepo');
const { hashPassword, comparePassword, signToken } = require('../lib/auth');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_TOKEN_PATH = path.join(__dirname, '..', '..', 'data', 'local_token.txt');

// 本机Skill(Claude Code直接curl接口用)拿不到浏览器localStorage里的token，
// 这里把每次登录/注册发出的token顺手存一份到本地文件——data/整个目录都在.gitignore里，
// 不会被提交，且只有这台机器能读到。token过期(7天)后这个文件也会过期，
// 用户重新在网页登录一次就会刷新这个文件。
function persistLocalToken(token) {
  try {
    fs.writeFileSync(LOCAL_TOKEN_PATH, token, 'utf8');
  } catch (err) {
    console.error('[auth] 写入本机token文件失败:', err.message);
  }
}

router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: '请输入有效的邮箱地址' });
  if (!password || password.length < 6) return res.status(400).json({ error: '密码至少需要6位' });

  const normalizedEmail = email.trim().toLowerCase();
  if (getUserByEmail(normalizedEmail)) return res.status(409).json({ error: '邮箱已注册' });

  const wasFirstUser = countUsers() === 0;
  const passwordHash = await hashPassword(password);
  const user = createUser({ email: normalizedEmail, passwordHash });
  // 本地版从单用户切到多用户：第一个注册的账号自动认领之前所有没有归属的练习数据
  if (wasFirstUser) claimOrphanedData(user.id);

  const token = signToken(user.id);
  persistLocalToken(token);
  res.json({ token, user: toPublicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: '邮箱和密码必填' });

  const user = getUserByEmail(email.trim().toLowerCase());
  if (!user) return res.status(401).json({ error: '邮箱或密码错误' });

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: '邮箱或密码错误' });

  const token = signToken(user.id);
  persistLocalToken(token);
  res.json({ token, user: toPublicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) return res.status(401).json({ error: '用户不存在', code: 'INVALID_TOKEN' });
  res.json(toPublicUser(user));
});

module.exports = router;
