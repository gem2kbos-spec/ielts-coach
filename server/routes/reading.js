const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const multer = require('multer');
const { listItems, getItem, upsertItem } = require('../db/itemsRepo');
const { createAttempt, getLatestAttemptForItem } = require('../db/attemptsRepo');
const { listVocab } = require('../db/vocabRepo');
const { extractPdfPages } = require('../services/pdf');
const { askForJson } = require('../services/llm');
const { parseReadingDocument } = require('../lib/readingParser');
const { buildAnswerKeyPrompt, buildReadingErrorTagPrompt } = require('../lib/readingPrompt');
const { buildReadingGeneratePrompt } = require('../lib/readingGeneratePrompt');
const { getWeakQuestionTypes } = require('../lib/readingStats');
const { normalizeAnswer } = require('../lib/readingGrading');
const { createPreview, getPreview, deletePreview } = require('../services/readingPreviewCache');

const USER_IMPORTS_DIR = path.join(__dirname, '..', '..', 'data', 'user-imports');
const upload = multer({ dest: os.tmpdir() });
const router = express.Router();

async function suggestAnswers(passage) {
  if (passage.questions.length === 0) return passage;
  try {
    const { data } = await askForJson({
      feature: 'reading_answer_key',
      prompt: buildAnswerKeyPrompt({ title: passage.title, passageText: passage.passageText, questions: passage.questions }),
      timeoutMs: 60_000,
      retries: 1,
    });
    const byNumber = new Map(data.answers.map((a) => [a.number, a]));
    return {
      ...passage,
      questions: passage.questions.map((q) => {
        const ans = byNumber.get(q.number);
        return { ...q, correct_answer: ans?.correct_answer ?? '', answer_confidence: ans?.confidence ?? 'low' };
      }),
    };
  } catch (err) {
    // AI 答案建议失败不应该挡住整个预览流程，留空让用户自己填
    return {
      ...passage,
      questions: passage.questions.map((q) => ({ ...q, correct_answer: '', answer_confidence: 'low' })),
    };
  }
}

router.post('/parse-pdf', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file 必填' });
  try {
    const pages = await extractPdfPages(req.file.path);
    fs.mkdirSync(USER_IMPORTS_DIR, { recursive: true });
    const destPath = path.join(USER_IMPORTS_DIR, `${Date.now()}-${req.file.originalname.replace(/[^\w.\-]/g, '_')}`);
    fs.copyFileSync(req.file.path, destPath);
    fs.unlinkSync(req.file.path);

    const fullText = pages.join('\n\n');
    const parsed = parseReadingDocument(fullText);
    const passagesWithAnswers = await Promise.all(parsed.passages.map(suggestAnswers));

    const previewId = createPreview({ pages, originalFilePath: destPath });
    res.json({ previewId, confidence: parsed.confidence, passages: passagesWithAnswers, pageCount: pages.length });
  } catch (err) {
    res.status(502).json({ error: `解析失败: ${err.message}` });
  }
});

// 手动按页码范围重新切分某一段（自动解析置信度低时用）
router.post('/parse-pdf/manual-range', async (req, res) => {
  const { previewId, ranges } = req.body; // ranges: [{ title, startPage, endPage }] 1-indexed, inclusive
  const preview = getPreview(previewId);
  if (!preview) return res.status(404).json({ error: '预览已过期，请重新上传 PDF' });

  try {
    const passages = await Promise.all(
      ranges.map(async (r, i) => {
        const slice = preview.pages.slice(r.startPage - 1, r.endPage).join('\n\n');
        const { passages: subParsed } = parseReadingDocument(slice);
        // 手动模式下整个range当一篇文章：标题以用户输入为准，正文/题目仍走自动切分+题型识别
        const questions = subParsed[0]?.questions || [];
        const passageText = subParsed[0]?.passageText || slice;
        const base = { title: r.title || `第${i + 1}篇`, passageText, questions };
        return suggestAnswers(base);
      })
    );
    res.json({ passages });
  } catch (err) {
    res.status(502).json({ error: `手动切分失败: ${err.message}` });
  }
});

router.post('/import', (req, res) => {
  const { passages, previewId } = req.body;
  if (!Array.isArray(passages) || passages.length === 0) {
    return res.status(400).json({ error: 'passages 必填且不能为空' });
  }
  try {
    const created = passages.map((p) =>
      upsertItem({
        module: 'reading',
        subtype: 'passage_with_questions',
        source: p.source || 'user_import',
        difficulty: p.difficulty || null,
        tags: p.topicTag ? [p.topicTag] : [],
        content: {
          title: p.title,
          passage_text: p.passageText,
          paragraphs: p.paragraphs || null,
          injected_vocab: p.injectedVocab || [],
          questions: p.questions.map((q) => ({
            number: q.number,
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation || null,
          })),
        },
      })
    );
    if (previewId) deletePreview(previewId);
    res.json({ created });
  } catch (err) {
    res.status(400).json({ error: `入库失败: ${err.message}` });
  }
});

router.post('/generate/preview', async (req, res) => {
  const { difficulty, topic, questionTypes, extraRequirements } = req.body;
  try {
    const weakTypes = questionTypes?.length ? [] : getWeakQuestionTypes();
    const reinforcementWords = listVocab({ needsReinforcement: true })
      .slice(0, 8)
      .map((v) => v.word);

    const prompt = buildReadingGeneratePrompt({
      difficulty,
      topic,
      questionTypes,
      extraRequirements,
      weakTypes,
      reinforcementWords,
    });
    const { data, costUsd } = await askForJson({ feature: 'reading_generate', prompt, timeoutMs: 90_000, retries: 1 });

    const passageText = data.passage_paragraphs.map((p) => `${p.letter}  ${p.text}`).join('\n\n');
    const draft = {
      title: data.title,
      passageText,
      paragraphs: data.passage_paragraphs,
      difficulty: data.difficulty_tag || difficulty || 'medium',
      topicTag: data.topic_tag || topic || null,
      injectedVocab: data.injected_vocab || [],
      questions: data.questions,
      source: 'ai_generated',
    };
    res.json({ draft, weakTypesUsed: weakTypes, reinforcementWordsUsed: reinforcementWords, costUsd });
  } catch (err) {
    res.status(502).json({ error: `生成失败: ${err.message}` });
  }
});

router.get('/passages', (req, res) => {
  const items = listItems({ module: 'reading', subtype: 'passage_with_questions' });
  const enriched = items.map((item) => {
    const attempt = getLatestAttemptForItem(item.id);
    return {
      id: item.id,
      title: item.content.title,
      questionCount: item.content.questions.length,
      completed: !!attempt,
      lastAccuracy: attempt?.score?.accuracy ?? null,
      difficulty: item.difficulty,
      source: item.source,
      topicTag: item.tags?.[0] || null,
      created_at: item.created_at,
    };
  });
  res.json(enriched);
});

router.get('/passages/:id', (req, res) => {
  const item = getItem(req.params.id);
  if (!item || item.module !== 'reading' || item.subtype !== 'passage_with_questions') {
    return res.status(404).json({ error: 'not found' });
  }
  // 做题阶段不能把正确答案/解析下发给前端
  const sanitized = {
    id: item.id,
    title: item.content.title,
    passage_text: item.content.passage_text,
    injected_vocab: item.content.injected_vocab || [],
    questions: item.content.questions.map(({ correct_answer, explanation, ...rest }) => rest),
  };
  res.json(sanitized);
});

router.post('/passages/:id/submit', async (req, res) => {
  const { answers, durationSec } = req.body; // answers: [{ number, userAnswer }]
  const item = getItem(req.params.id);
  if (!item || item.module !== 'reading' || item.subtype !== 'passage_with_questions') {
    return res.status(404).json({ error: 'not found' });
  }

  const userAnswerByNumber = new Map((answers || []).map((a) => [a.number, a.userAnswer]));
  const perQuestion = item.content.questions.map((q) => {
    const userAnswer = userAnswerByNumber.get(q.number) ?? '';
    const correct = normalizeAnswer(userAnswer) === normalizeAnswer(q.correct_answer);
    return {
      number: q.number,
      prompt: q.prompt,
      type: q.type,
      userAnswer,
      correctAnswer: q.correct_answer,
      explanation: q.explanation || null,
      correct,
    };
  });

  const correctCount = perQuestion.filter((q) => q.correct).length;
  const total = perQuestion.length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 1000) / 10 : 0;
  const wrongAnswers = perQuestion.filter((q) => !q.correct);

  let errorTags = [];
  let perQuestionTags = [];
  let costUsd = null;
  if (wrongAnswers.length > 0) {
    try {
      const { data, costUsd: cost } = await askForJson({
        feature: 'reading_error_tag',
        prompt: buildReadingErrorTagPrompt({
          title: item.content.title,
          passageText: item.content.passage_text,
          wrongAnswers,
        }),
        timeoutMs: 60_000,
        retries: 1,
      });
      errorTags = data.tags || [];
      perQuestionTags = data.per_question || [];
      costUsd = cost;
    } catch (err) {
      // 错题归因失败不影响判分结果本身
    }
  }

  const attempt = createAttempt({
    module: 'reading',
    itemId: item.id,
    durationSec,
    rawResponse: { answers },
    score: { accuracy, correctCount, total, perQuestion },
    bandOverall: null,
    errorTags,
  });

  res.json({ attemptId: attempt.id, accuracy, correctCount, total, perQuestion, errorTags, perQuestionTags, costUsd });
});

module.exports = router;
