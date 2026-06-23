const express = require('express');
const { listItems, getItem } = require('../db/itemsRepo');
const { createAttempt } = require('../db/attemptsRepo');
const { askForJson } = require('../services/llm');
const { buildWritingTask1Prompt, buildWritingTask2Prompt } = require('../lib/bandRubrics');
const { countWords } = require('../lib/wordCount');
const { inferWritingTags } = require('../lib/errorTagTaxonomy');
const { chartToSummaryText } = require('../lib/chartSummary');

const router = express.Router();

router.get('/task1/random', (req, res) => {
  const items = listItems({ module: 'writing', subtype: 'task1_chart' });
  if (items.length === 0) return res.status(404).json({ error: '题库里没有 Task 1 题目，先跑 npm run seed -w server' });
  const item = items[Math.floor(Math.random() * items.length)];
  res.json(item);
});

router.post('/task1/grade', async (req, res) => {
  const { itemId, essayText, durationSec } = req.body;
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
    const { data, costUsd } = await askForJson({ feature: 'writing_task1_score', prompt, timeoutMs: 120_000, retries: 1 });
    const errorTags = inferWritingTags({ scores: data.scores, chinglish: [], wordCount, minWordCount: 150 });
    const attempt = createAttempt({
      module: 'writing',
      itemId,
      durationSec,
      rawResponse: { essayText, wordCount },
      score: data,
      bandOverall: data.band_overall,
      errorTags,
    });
    res.json({ attemptId: attempt.id, wordCount, costUsd, errorTags, ...data });
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
  const { itemId, essayText, durationSec } = req.body;
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
    const { data, costUsd } = await askForJson({ feature: 'writing_task2_score', prompt, timeoutMs: 120_000, retries: 1 });
    const errorTags = inferWritingTags({ scores: data.scores, chinglish: data.chinglish, wordCount });
    const attempt = createAttempt({
      module: 'writing',
      itemId,
      durationSec,
      rawResponse: { essayText, wordCount },
      score: data,
      bandOverall: data.band_overall,
      errorTags,
    });
    res.json({ attemptId: attempt.id, wordCount, costUsd, errorTags, ...data });
  } catch (err) {
    res.status(502).json({ error: `评分失败: ${err.message}` });
  }
});

module.exports = router;
