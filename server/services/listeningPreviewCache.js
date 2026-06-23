const crypto = require('crypto');

// 听力批量上传的临时状态：本批所有文件的临时路径(供手动重新配对时按文件名查找)，
// 单用户本地应用，进程内 Map 足够；重启服务清空未确认的预览，可接受。
const cache = new Map();
const TTL_MS = 30 * 60 * 1000;

function createPreview(files) {
  const id = crypto.randomUUID();
  cache.set(id, { files, createdAt: Date.now() });
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
