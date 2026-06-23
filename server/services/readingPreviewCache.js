const crypto = require('crypto');

// 导入预览阶段的临时状态（解析出的per-page文本 + 原始文件路径），不入库，
// 单用户本地应用，进程内 Map 足够；重启服务会清空未确认的预览，可接受。
const cache = new Map();
const TTL_MS = 30 * 60 * 1000;

function createPreview({ pages, originalFilePath }) {
  const id = crypto.randomUUID();
  cache.set(id, { pages, originalFilePath, createdAt: Date.now() });
  return id;
}

function getPreview(id) {
  const entry = cache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    cache.delete(id);
    return null;
  }
  return entry;
}

function deletePreview(id) {
  cache.delete(id);
}

module.exports = { createPreview, getPreview, deletePreview };
