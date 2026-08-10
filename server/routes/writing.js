const express = require('express');
const { listItems, getItem, upsertItem } = require('../db/itemsRepo');
const { createAttempt } = require('../db/attemptsRepo');
const { askForJson } = require('../services/llm');
const { buildWritingTask1Prompt, buildWritingTask2Prompt } = require('../lib/bandRubrics');
const { countWords } = require('../lib/wordCount');
const { inferWritingTags } = require('../lib/errorTagTaxonomy');
const { chartToSummaryText } = require('../lib/chartSummary');
const { matchExpressionsForChinglish } = require('../lib/expressionMatch');
const { buildTask2GeneratePrompt, buildTask1GeneratePrompt } = require('../lib/writingGeneratePrompt');

const router = express.Router();

function getExpressionSuggestions(chinglish) {
  if (!chinglish?.length) return [];
  const phraseItems = listItems({ module: 'writing_expression', subtype: 'phrase_drill' });
  return matchExpressionsForChinglish(chinglish, phraseItems);
}

router.get('/item/:id', (req, res) => {
  const item = getItem(req.params.id);
  if (!item || item.module !== 'writing') return res.status(404).json({ error: 'not found' });
  res.json(item);
});

router.get('/task1/random', (req, res) => {
  const items = listItems({ module: 'writing', subtype: 'task1_chart' });
  if (items.length === 0) return res.status(404).json({ error: '题库里没有 Task 1 题目，先跑 npm run seed -w server' });
  const item = items[Math.floor(Math.random() * items.length)];
  res.json(item);
});

router.post('/task1/grade', async (req, res) => {
  const { itemId, essayText, durationSec, onTime, overtimeSeconds } = req.body;
  if (!itemId || !essayText) return res.status(400).json({ error: 'itemId 和 essayText 必填' });

  const item = getItem(itemId);
  if (!item) return res.status(404).json({ error: '题目不存在' });

  const wordCount = countWords(essayText);
  if (wordCount < 40) {
    return res.status(400).json({ error: `字数太少（${wordCount} 词），至少写 40 词再提交评分` });
  }

  const prompt = buildWritingTask1Prompt({
    description: item.content.description,
    chartSummary: chartToSummaryText(item.content),
    essayText,
  });

  try {
    const { data, costUsd } = await askForJson({ feature: 'writing_task1_score', prompt, timeoutMs: 120_000, retries: 1, userId: req.userId });
    const errorTags = inferWritingTags({ scores: data.scores, chinglish: data.chinglish, wordCount, minWordCount: 150 });
    const attempt = createAttempt({
      userId: req.userId,
      module: 'writing',
      itemId,
      durationSec,
      rawResponse: { essayText, wordCount },
      score: { ...data, onTime: onTime ?? true, overtimeSeconds: overtimeSeconds ?? 0 },
      bandOverall: data.band_overall,
      errorTags,
    });
    const expressionSuggestions = getExpressionSuggestions(data.chinglish);
    res.json({ attemptId: attempt.id, wordCount, costUsd, errorTags, expressionSuggestions, ...data });
  } catch (err) {
    res.status(502).json({ error: `评分失败: ${err.message}` });
  }
});

router.get('/task2/random', (req, res) => {
  const items = listItems({ module: 'writing', subtype: 'task2_argumentative' });
  if (items.length === 0) return res.status(404).json({ error: '题库里没有 Task 2 题目，先跑 npm run seed -w server' });
  const item = items[Math.floor(Math.random() * items.length)];
  res.json(item);
});

router.post('/task2/grade', async (req, res) => {
  const { itemId, essayText, durationSec, onTime, overtimeSeconds } = req.body;
  if (!itemId || !essayText) return res.status(400).json({ error: 'itemId 和 essayText 必填' });

  const item = getItem(itemId);
  if (!item) return res.status(404).json({ error: '题目不存在' });

  const wordCount = countWords(essayText);
  if (wordCount < 50) {
    return res.status(400).json({ error: `字数太少（${wordCount} 词），至少写 50 词再提交评分` });
  }

  const prompt = buildWritingTask2Prompt({
    prompt: item.content.prompt,
    essayType: item.content.essay_type || 'argumentative',
    essayText,
  });

  try {
    const { data, costUsd } = await askForJson({ feature: 'writing_task2_score', prompt, timeoutMs: 120_000, retries: 1, userId: req.userId });
    const errorTags = inferWritingTags({ scores: data.scores, chinglish: data.chinglish, wordCount });
    const attempt = createAttempt({
      userId: req.userId,
      module: 'writing',
      itemId,
      durationSec,
      rawResponse: { essayText, wordCount },
      score: { ...data, onTime: onTime ?? true, overtimeSeconds: overtimeSeconds ?? 0 },
      bandOverall: data.band_overall,
      errorTags,
    });
    const expressionSuggestions = getExpressionSuggestions(data.chinglish);
    res.json({ attemptId: attempt.id, wordCount, costUsd, errorTags, expressionSuggestions, ...data });
  } catch (err) {
    res.status(502).json({ error: `评分失败: ${err.message}` });
  }
});

// ── AI 生成写作题目 ──────────────────────────────────────────
router.post('/generate/preview', async (req, res) => {
  const { taskType, essayType, chartType, topic, difficulty, extraRequirements } = req.body;
  if (!taskType || !['task1', 'task2'].includes(taskType)) {
    return res.status(400).json({ error: 'taskType 必须是 task1 或 task2' });
  }
  try {
    let prompt, feature;
    if (taskType === 'task2') {
      prompt = buildTask2GeneratePrompt({ essayType, topic, difficulty, extraRequirements });
      feature = 'writing_generate_task2';
    } else {
      prompt = buildTask1GeneratePrompt({ chartType, topic, difficulty, extraRequirements });
      feature = 'writing_generate_task1';
    }
    const { data, costUsd } = await askForJson({ feature, prompt, timeoutMs: 60_000, retries: 1, userId: req.userId });
    res.json({ taskType, content: data, costUsd });
  } catch (err) {
    res.status(502).json({ error: `生成失败: ${err.message}` });
  }
});

router.post('/generate/save', (req, res) => {
  const { taskType, content, difficulty } = req.body;
  if (!taskType || !content) return res.status(400).json({ error: 'taskType 和 content 必填' });
  const subtype = taskType === 'task2' ? 'task2_argumentative' : 'task1_chart';
  const item = upsertItem({
    module: 'writing',
    subtype,
    difficulty: difficulty || 'medium',
    tags: [],
    content,
    source: 'ai_generated',
  });
  res.json({ id: item.id });
});

module.exports = router;
