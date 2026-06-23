const crypto = require('crypto');

// 单用户本地应用，进程内 Map 足够；重启服务会清空进行中的考官会话，可接受。
const sessions = new Map();

const MAX_TURNS = 4;

function createSession({ topic, baseQuestions, ideaBank }) {
  const id = crypto.randomUUID();
  sessions.set(id, {
    id,
    topic,
    baseQuestions,
    ideaBank,
    history: [], // [{ question, answer }]
    turnIndex: 0,
    createdAt: Date.now(),
  });
  return sessions.get(id);
}

function getSession(id) {
  return sessions.get(id);
}

function updateSession(id, patch) {
  const s = sessions.get(id);
  if (!s) return null;
  Object.assign(s, patch);
  return s;
}

function deleteSession(id) {
  sessions.delete(id);
}

module.exports = { createSession, getSession, updateSession, deleteSession, MAX_TURNS };
