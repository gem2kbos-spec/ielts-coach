const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const ENV_PATH = path.join(__dirname, '..', '..', '.env');
const TOKEN_TTL = '7d';
const BCRYPT_ROUNDS = 10;

// 本地版没有部署流程帮你注入secret，第一次启动时自己生成一个随机值并写回.env持久化，
// 这样重启服务不会让所有人的登录态失效。.env本来就在.gitignore里，不会被提交。
function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const secret = crypto.randomBytes(48).toString('hex');
  try {
    fs.appendFileSync(ENV_PATH, `\nJWT_SECRET=${secret}\n`);
  } catch (err) {
    console.error('[auth] 写入JWT_SECRET到.env失败，本次进程内仍可用，但重启后会生成新的:', err.message);
  }
  process.env.JWT_SECRET = secret;
  return secret;
}

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, resolveJwtSecret(), { expiresIn: TOKEN_TTL });
}

function verifyToken(token) {
  const payload = jwt.verify(token, resolveJwtSecret());
  return payload.sub;
}

module.exports = { hashPassword, comparePassword, signToken, verifyToken };
