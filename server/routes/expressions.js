const express = require('express');
const { listItems, getItem, upsertItem } = require('../db/itemsRepo');
const { createAttempt } = require('../db/attemptsRepo');
const { getDb } = require('../db/client');
const { toSqliteDatetime } = require('../lib/sqliteTime');
const { getReviewState, recordResult } = require('../db/expressionReviewRepo');
const { askForJson } = require('../services/llm');
const { buildPhraseGradingPrompt, buildSentenceGradingPrompt, buildAutofillPrompt, buildGlossaryPrompt } = require('../lib/expressionPrompt');

const router = express.Router();
const SUBTYPE_BY_TYPE = { phrase: 'phrase_drill', sentence: 'sentence_translation' };

function withReviewStatus(item, userId) {
  const review = getReviewState(item.id, userId);
  return { ...item, reviewStatus: review?.status || 'new', lastResult: review?.last_result || null };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function applyFilters(items, { category, difficulty, task, q }) {
  let result = items;
  if (category) result = result.filter((i) => i.content.category === category);
  if (difficulty) result = result.filter((i) => i.difficulty === difficulty);
  if (task) result = result.filter((i) => i.tags.includes(task));
  if (q) {
    const needle = q.toLowerCase();
    result = result.filter((i) => i.content.chinese.includes(q) || i.content.standard.toLowerCase().includes(needle));
  }
  return result;
}

function getAttemptedExpressionItemIds(userId) {
  const db = getDb();
  const rows = db
    .prepare(`SELECT DISTINCT item_id FROM attempts WHERE user_id = ? AND module = 'writing_expression' AND item_id IS NOT NULL`)
    .all(userId);
  return new Set(rows.map((row) => row.item_id));
}

router.get('/', (req, res) => {
  const { type, category, difficulty, task, q } = req.query;
  const subtype = type ? SUBTYPE_BY_TYPE[type] : undefined;
  const items = applyFilters(listItems({ module: 'writing_expression', subtype }), { category, difficulty, task, q });
  res.json(items.map((item) => withReviewStatus(item, req.userId)));
});

// 无尽模式/状态专练入口——在"词组/句子翻译 + 分类 + 难度 + Task"筛选之上，
// 再叠加一层按上次练习结果(status)筛选：
//   practiced=已经练过的(不分对错)，correct/partial/wrong=上次结果对应这个状态的，
//   endless=不筛状态，从(经过上面筛选后的)全部题目里抽。
// 排除掉这次drill会话里已经出现过的题(excludeIds)，避免短时间内重复。
// endless/定量练习还会排除用户已经批改过的题：只要给过解析，就不再进入新题池。
// 后台异步预热 glossary（不阻塞队列响应，fire-and-forget）
async function preheatGlossaries(phraseItems, userId) {
  const missing = phraseItems.filter((i) => i.subtype === 'phrase_drill' && !i.content.glossary);
  if (missing.length === 0) return;
  for (const item of missing) {
    // 逐个预热，避免并发爆 API rate limit；失败静默忽略
    try {
      const fresh = getItem(item.id);
      if (fresh?.content?.glossary) continue; // 已被其他请求填上了
      const { buildGlossaryPrompt } = require('../lib/expressionPrompt');
      const { data } = await askForJson({ feature: 'expression_glossary', prompt: buildGlossaryPrompt({ standard: item.content.standard, alternatives: item.content.alternatives }), timeoutMs: 60_000, retries: 1, userId });
      upsertItem({ id: item.id, module: item.module, subtype: item.subtype, difficulty: item.difficulty, tags: item.tags, source: item.source, file_path: item.file_path, content: { ...item.content, glossary: data.vocabNotes || [] } });
    } catch (_) { /* 预热失败不影响用户 */ }
  }
}

router.get('/queue', (req, res) => {
  const { status, type, category, difficulty, task, q, excludeIds, limit } = req.query;
  const subtype = type ? SUBTYPE_BY_TYPE[type] : undefined;
  const baseItems = applyFilters(listItems({ module: 'writing_expression', subtype }), { category, difficulty, task, q });
  const enriched = baseItems.map((item) => withReviewStatus(item, req.userId));

  let filtered = enriched;
  if (status === 'practiced') filtered = enriched.filter((i) => i.reviewStatus !== 'new');
  else if (status === 'correct') filtered = enriched.filter((i) => i.lastResult === 'correct');
  else if (status === 'partial') filtered = enriched.filter((i) => i.lastResult === 'partial');
  else if (status === 'wrong') filtered = enriched.filter((i) => i.lastResult === 'wrong');
  else {
    // status === 'endless' (或不传): 只抽从未给过解析的新题
    const attemptedIds = getAttemptedExpressionItemIds(req.userId);
    filtered = enriched.filter((i) => !attemptedIds.has(i.id));
  }

  const excludeSet = new Set((excludeIds || '').split(',').filter(Boolean));
  const pool = filtered.filter((i) => !excludeSet.has(i.id));

  const limitNum = Number(limit) || 20;
  const batch = shuffle(pool).slice(0, limitNum);
  res.json({ items: batch, totalMatching: filtered.length });

  // 先返回响应，再后台预热本批次词组题的 glossary
  preheatGlossaries(batch.filter((i) => i.subtype === 'phrase_drill'), req.userId).catch(() => {});
});

router.get('/stats', (req, res) => {
  const db = getDb();
  const todaySince = toSqliteDatetime(new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
  const todayCount = db
    .prepare(`SELECT COUNT(*) as c FROM attempts WHERE module = 'writing_expression' AND user_id = ? AND created_at >= ?`)
    .get(req.userId, todaySince).c;
  const totalCount = db
    .prepare(`SELECT COUNT(*) as c FROM attempts WHERE module = 'writing_expression' AND user_id = ?`)
    .get(req.userId).c;
  res.json({ todayCount, totalCount });
});

router.post('/:id/grade', async (req, res) => {
  const item = getItem(req.params.id);
  if (!item || item.module !== 'writing_expression') return res.status(404).json({ error: '题目不存在' });
  const { answer, sessionId } = req.body;
  if (!answer || !answer.trim()) return res.status(400).json({ error: 'answer 必填' });

  try {
    let data, costUsd, totalCostUsd = 0, glossary;
    if (item.subtype === 'phrase_drill') {
      const gradingPrompt = buildPhraseGradingPrompt({ chinese: item.content.chinese, userAnswer: answer, standard: item.content.standard });

      if (item.content.glossary) {
        // glossary 已缓存，只需一次判分调用
        glossary = item.content.glossary;
        ({ data, costUsd } = await askForJson({ feature: 'expression_phrase_grade', prompt: gradingPrompt, timeoutMs: 60_000, retries: 1, userId: req.userId }));
        totalCostUsd += costUsd;
      } else {
        // 判分 + glossary 并行
        const glossaryPrompt = buildGlossaryPrompt({ standard: item.content.standard, alternatives: item.content.alternatives });
        const [gradingResult, glossaryResult] = await Promise.all([
          askForJson({ feature: 'expression_phrase_grade', prompt: gradingPrompt, timeoutMs: 60_000, retries: 1, userId: req.userId }),
          askForJson({ feature: 'expression_glossary', prompt: glossaryPrompt, timeoutMs: 60_000, retries: 1, userId: req.userId }),
        ]);
        data = gradingResult.data;
        totalCostUsd += gradingResult.costUsd + glossaryResult.costUsd;
        glossary = glossaryResult.data.vocabNotes || [];
        upsertItem({
          id: item.id, module: item.module, subtype: item.subtype, difficulty: item.difficulty,
          tags: item.tags, source: item.source, file_path: item.file_path,
          content: { ...item.content, glossary },
        });
      }
    } else {
      const prompt = buildSentenceGradingPrompt({ chinese: item.content.chinese, userTranslation: answer, standard: item.content.standard });
      ({ data, costUsd } = await askForJson({ feature: 'expression_sentence_grade', prompt, timeoutMs: 90_000, retries: 1, userId: req.userId }));
      totalCostUsd += costUsd;
    }

    const review = recordResult(item.id, req.userId, data.result);
    // 注意：这里故意不填bandOverall——仪表板的"avgBand"是给IELTS 0-9量表用的，
    // 这题目的判断结果是对/部分对/错，量表完全不同，填了会把0-100的伪分数错混进Band趋势图。
    // 用score.accuracy(0-100)走仪表板现成的"正确率"统计路径才是对的桶。
    const accuracy = data.result === 'correct' ? 100 : data.result === 'partial' ? 60 : 0;
    // 保存完整解析到 rawResponse，供"再练一次"功能离线复用（不重复调 AI）
    const analysis = item.subtype === 'phrase_drill'
      ? { result: data.result, feedback: data.feedback, standard: item.content.standard, alternatives: item.content.alternatives, example_sentence: item.content.example_sentence, glossary }
      : { result: data.result, accuracy_note: data.accuracy_note, expression_note: data.expression_note, grammar_errors: data.grammar_errors, standard: data.standard, band7_upgrade: data.band7_upgrade, band8_upgrade: data.band8_upgrade, vocabNotes: data.vocabNotes };
    const attempt = createAttempt({
      userId: req.userId,
      module: 'writing_expression',
      sessionId,
      itemId: item.id,
      rawResponse: { answer, analysis },
      score: { result: data.result, accuracy },
      errorTags: data.errorType ? [data.errorType] : [],
    });

    res.json({
      attemptId: attempt.id,
      costUsd: totalCostUsd,
      reviewStatus: review.status,
      standard: item.content.standard,
      alternatives: item.content.alternatives,
      example_sentence: item.content.example_sentence,
      glossary,
      ...data,
    });
  } catch (err) {
    res.status(502).json({ error: `判分失败: ${err.message}` });
  }
});

router.post('/custom', async (req, res) => {
  const { type, chinese, standard } = req.body;
  if (!type || !chinese || !standard) return res.status(400).json({ error: 'type/chinese/standard 必填' });
  const subtype = SUBTYPE_BY_TYPE[type];
  if (!subtype) return res.status(400).json({ error: 'type 必须是 phrase 或 sentence' });

  try {
    const prompt = buildAutofillPrompt({ type, chinese, standard });
    const { data, costUsd } = await askForJson({ feature: 'expression_custom_autofill', prompt, timeoutMs: 60_000, retries: 1, userId: req.userId });

    const content =
      type === 'phrase'
        ? { chinese, standard, alternatives: data.alternatives || [], example_sentence: data.example_sentence || '', category: data.category, band_target: data.band_target }
        : { chinese, standard, category: data.category, band_target: data.band_target };

    const item = upsertItem({
      module: 'writing_expression',
      subtype,
      difficulty: data.difficulty || 'medium',
      tags: [],
      content,
      source: 'user_import',
    });
    res.json({ item, costUsd });
  } catch (err) {
    res.status(502).json({ error: `自动补全失败: ${err.message}` });
  }
});

// 历史记录：新记录按 session_id 分组，旧记录没有 session_id 时按自然日兼容分组。
function buildHistorySessions(rows) {
  const bySession = new Map();
  const parseJson = (value) => {
    try {
      return JSON.parse(value || 'null') || {};
    } catch (_) {
      return {};
    }
  };

  for (const row of rows) {
    const date = row.created_at.slice(0, 10); // "2026-06-25"
    const sessionId = row.session_id || `legacy-${date}`;
    if (!bySession.has(sessionId)) {
      bySession.set(sessionId, { sessionId, date, startedAt: row.created_at, legacy: !row.session_id, attempts: [] });
    }
    const raw = parseJson(row.raw_response);
    const score = parseJson(row.score);
    const item = getItem(row.item_id);
    if (!item) continue;
    // 旧记录没有存完整 analysis，从 item.content 补全标准答案等字段
    const analysis = raw.analysis || (item.subtype === 'phrase_drill'
      ? {
          result: score.result,
          feedback: score.result === 'correct' ? '这次表达意思准确，可以直接使用。' : score.result === 'partial' ? '这次表达基本可理解，但还可以更自然。' : '这次表达和目标意思有明显偏差，建议优先记住推荐表达。',
          standard: item.content.standard,
          alternatives: item.content.alternatives,
          example_sentence: item.content.example_sentence,
          glossary: item.content.glossary || [],
        }
      : {
          result: score.result,
          standard: item.content.standard,
          accuracy_note: score.result === 'correct' ? '这次答案被判为完全正确。' : score.result === 'partial' ? '这次答案被判为基本正确。' : '这次答案被判为有误。',
          expression_note: '这条记录来自较早版本，系统保留了参考译法和核心判断；重新练一次后会保存更完整的解析维度。',
          grammar_errors: [],
          band7_upgrade: item.content.standard,
          band8_upgrade: item.content.standard,
          vocabNotes: [],
        });
    const session = bySession.get(sessionId);
    if (row.created_at < session.startedAt) session.startedAt = row.created_at;
    session.attempts.push({
      attemptId: row.id,
      createdAt: row.created_at,
      itemId: row.item_id,
      subtype: item.subtype,
      chinese: item.content.chinese,
      answer: raw.answer || '',
      analysis,
      result: score.result || null,
    });
  }

  return [...bySession.values()]
    .map((session) => ({ ...session, attempts: session.attempts.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

router.get('/history/:sessionId', (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT id, session_id, item_id, created_at, raw_response, score FROM attempts
              WHERE user_id = ? AND module = 'writing_expression' AND session_id = ?
              ORDER BY created_at ASC`)
    .all(req.userId, req.params.sessionId);
  const sessions = buildHistorySessions(rows);
  if (sessions.length === 0) return res.status(404).json({ error: 'not found' });
  res.json(sessions[0]);
});

router.get('/history', (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT id, session_id, item_id, created_at, raw_response, score FROM attempts
              WHERE user_id = ? AND module = 'writing_expression'
              ORDER BY created_at DESC LIMIT 1000`)
    .all(req.userId);
  res.json(buildHistorySessions(rows));
});

module.exports = router;
