const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const os = require('os');
const { listItems, getItem, upsertItem } = require('../db/itemsRepo');
const { createAttempt } = require('../db/attemptsRepo');
const { askForJson } = require('../services/llm');
const { convertToWav16kMono } = require('../services/audio');
const { transcribe } = require('../services/whisper');
const { speak } = require('../services/tts');
const { countFillers } = require('../lib/fillerWords');
const { analyzeRisk } = require('../lib/phonemeHeuristic');
const { computeSpeechMetrics } = require('../lib/speechMetrics');
const { getIdeas } = require('../lib/ideaBank');
const {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  MAX_TURNS,
} = require('../services/examinerSession');
const {
  buildSpeakingPart1Prompt,
  buildSpeakingPart2Prompt,
  buildExaminerFollowUpPrompt,
  buildExaminerFeedbackPrompt,
} = require('../lib/bandRubrics');
const { inferSpeakingTags } = require('../lib/errorTagTaxonomy');

const RECORDINGS_DIR = path.join(__dirname, '..', '..', 'data', 'audio', 'recordings');
const TTS_CACHE_DIR = path.join(__dirname, '..', '..', 'data', 'audio', 'tts_cache');
const upload = multer({ dest: os.tmpdir() });
const router = express.Router();

router.get('/part1/random', (req, res) => {
  const items = listItems({ module: 'speaking', subtype: 'part1_warmup' });
  if (items.length === 0) return res.status(404).json({ error: '题库里没有 Part1 题目，先跑 npm run seed -w server' });
  const item = items[Math.floor(Math.random() * items.length)];
  res.json(item);
});

router.post('/part1/submit', upload.single('audio'), async (req, res) => {
  const { itemId, speakSec } = req.body;
  if (!itemId || !req.file) return res.status(400).json({ error: 'itemId 和 audio 必填' });

  const item = getItem(itemId);
  if (!item) return res.status(404).json({ error: '题目不存在' });

  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  const audioPath = path.join(RECORDINGS_DIR, `${Date.now()}-part1-${itemId}.webm`);
  fs.copyFileSync(req.file.path, audioPath);
  fs.unlinkSync(req.file.path);

  try {
    const wavPath = await convertToWav16kMono(audioPath);
    const { text: transcriptText, segments } = await transcribe(wavPath);
    fs.unlinkSync(wavPath);

    if (countWordsSafe(transcriptText) < 10) {
      return res.status(400).json({ error: `转写结果太短（"${transcriptText}"），录音可能没有录到声音，检查麦克风权限后重试` });
    }

    const fillerStats = countFillers(transcriptText);
    const { flagged, summary: riskSummary } = analyzeRisk(segments);

    const prompt = buildSpeakingPart1Prompt({
      topic: item.content.topic,
      questions: item.content.questions,
      transcript: transcriptText,
      fillerStats,
      riskSummary,
      speakSec,
    });

    const { data, costUsd } = await askForJson({ feature: 'speaking_part1_score', prompt, timeoutMs: 120_000, retries: 1, userId: req.userId });
    const errorTags = inferSpeakingTags({
      scores: data.scores,
      fillerTotal: fillerStats.total,
      durationSec: Number(speakSec) || 0,
      expectedSec: 60,
    });

    const attempt = createAttempt({
      userId: req.userId,
      module: 'speaking',
      itemId,
      durationSec: Number(speakSec) || null,
      audioPath,
      transcript: transcriptText,
      rawResponse: { fillerStats, riskSummary, riskFlagged: flagged.filter((f) => f.suspicion === 'watch').slice(0, 30) },
      score: data,
      bandOverall: data.band_overall,
      errorTags,
    });

    res.json({
      attemptId: attempt.id,
      transcript: transcriptText,
      fillerStats,
      riskFlagged: flagged.filter((f) => f.suspicion === 'watch').slice(0, 20),
      riskSummary,
      costUsd,
      errorTags,
      ...data,
    });
  } catch (err) {
    res.status(502).json({ error: `处理失败: ${err.message}` });
  }
});

router.get('/part2/random', (req, res) => {
  const items = listItems({ module: 'speaking', subtype: 'part2_cue_card' });
  if (items.length === 0) return res.status(404).json({ error: '题库里没有 Part2 题目，先跑 npm run seed -w server' });
  const item = items[Math.floor(Math.random() * items.length)];
  res.json(item);
});

router.post('/part2/submit', upload.single('audio'), async (req, res) => {
  const { itemId, speakSec } = req.body;
  if (!itemId || !req.file) return res.status(400).json({ error: 'itemId 和 audio 必填' });

  const item = getItem(itemId);
  if (!item) return res.status(404).json({ error: '题目不存在' });

  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  const audioPath = path.join(RECORDINGS_DIR, `${Date.now()}-part2-${itemId}.webm`);
  fs.copyFileSync(req.file.path, audioPath);
  fs.unlinkSync(req.file.path);

  try {
    const wavPath = await convertToWav16kMono(audioPath);
    const { text: transcriptText, segments } = await transcribe(wavPath);
    fs.unlinkSync(wavPath);

    if (countWordsSafe(transcriptText) < 15) {
      return res.status(400).json({ error: `转写结果太短（"${transcriptText}"），录音可能没有录到声音，检查麦克风权限后重试` });
    }

    const fillerStats = countFillers(transcriptText);
    const { flagged, summary: riskSummary } = analyzeRisk(segments);

    const prompt = buildSpeakingPart2Prompt({
      topic: item.content.topic,
      bullets: item.content.bullets,
      transcript: transcriptText,
      fillerStats,
      riskSummary,
      speakSec,
    });

    const { data, costUsd } = await askForJson({ feature: 'speaking_part2_score', prompt, timeoutMs: 120_000, retries: 1, userId: req.userId });
    const errorTags = inferSpeakingTags({
      scores: data.scores,
      fillerTotal: fillerStats.total,
      durationSec: Number(speakSec) || 0,
      expectedSec: 120,
    });

    const attempt = createAttempt({
      userId: req.userId,
      module: 'speaking',
      itemId,
      durationSec: Number(speakSec) || null,
      audioPath,
      transcript: transcriptText,
      rawResponse: { fillerStats, riskSummary, riskFlagged: flagged.filter((f) => f.suspicion === 'watch').slice(0, 30) },
      score: data,
      bandOverall: data.band_overall,
      errorTags,
    });

    res.json({
      attemptId: attempt.id,
      transcript: transcriptText,
      fillerStats,
      riskFlagged: flagged.filter((f) => f.suspicion === 'watch').slice(0, 20),
      riskSummary,
      costUsd,
      errorTags,
      ...data,
    });
  } catch (err) {
    res.status(502).json({ error: `处理失败: ${err.message}` });
  }
});

function countWordsSafe(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

// ── 影子跟读 ──────────────────────────────────────────────
// 范例音频完全依赖用户自己导入（版权原因不内置），跟读对比只做数值对比，不调用 Claude。

router.get('/shadow/items', (req, res) => {
  res.json(listItems({ module: 'speaking', subtype: 'imported_audio' }));
});

async function getOrTranscribeReference(item) {
  if (item.content.reference_transcript) {
    return item.content.reference_transcript;
  }
  const wavPath = await convertToWav16kMono(item.file_path);
  const result = await transcribe(wavPath);
  fs.unlinkSync(wavPath);
  const clean = {
    id: item.id,
    module: item.module,
    subtype: item.subtype,
    tags: item.tags,
    source: item.source,
    file_path: item.file_path,
    content: { ...item.content, reference_transcript: result },
  };
  if (item.difficulty) clean.difficulty = item.difficulty;
  upsertItem(clean);
  return result;
}

router.post('/shadow/compare', upload.single('audio'), async (req, res) => {
  const { referenceItemId } = req.body;
  if (!referenceItemId || !req.file) return res.status(400).json({ error: 'referenceItemId 和 audio 必填' });

  const refItem = getItem(referenceItemId);
  if (!refItem) return res.status(404).json({ error: '范例音频不存在，先去题库导入页面拖一个 mp3 进来' });

  try {
    const reference = await getOrTranscribeReference(refItem);
    const refLastSeg = reference.segments[reference.segments.length - 1];
    const refDurationSec = refLastSeg ? refLastSeg.toMs / 1000 : 0;
    const referenceMetrics = computeSpeechMetrics(reference.segments, refDurationSec);

    const userWavPath = await convertToWav16kMono(req.file.path);
    const userResult = await transcribe(userWavPath);
    fs.unlinkSync(userWavPath);
    fs.unlinkSync(req.file.path);
    const userLastSeg = userResult.segments[userResult.segments.length - 1];
    const userDurationSec = userLastSeg ? userLastSeg.toMs / 1000 : 0;
    const userMetrics = computeSpeechMetrics(userResult.segments, userDurationSec);

    res.json({
      reference: { transcript: reference.text, ...referenceMetrics },
      user: { transcript: userResult.text, ...userMetrics },
      diff: {
        wpmDiff: userMetrics.wpm - referenceMetrics.wpm,
        durationDiffSec: Math.round((userDurationSec - refDurationSec) * 10) / 10,
        pauseDiff: userMetrics.pauseCount - referenceMetrics.pauseCount,
      },
    });
  } catch (err) {
    res.status(502).json({ error: `跟读对比失败: ${err.message}` });
  }
});

// ── 真人考官模式（Part 3）──────────────────────────────────
// turn 1 用题库里的固定问题（不耗 Claude 额度），turn 2+ 由 Claude 基于上一轮回答动态追问，
// 整段问完只在最后调用一次 Claude 给四项评分（默认 4 轮，控制额度消耗）。

function cacheTtsFile(tmpPath) {
  fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
  const dest = path.join(TTS_CACHE_DIR, path.basename(tmpPath));
  fs.renameSync(tmpPath, dest);
  return `/api/speaking/audio/${path.basename(dest)}`;
}

router.get('/examiner/start', async (req, res) => {
  const items = listItems({ module: 'speaking', subtype: 'part3_discussion' });
  if (items.length === 0) return res.status(404).json({ error: '题库里没有 Part3 题目，先跑 npm run seed -w server' });
  // tag对应Part2的题号tag(如"person"/"place")，传了的话优先选同主题的Part3，
  // 跟真实雅思一样Part3话题延续Part2——找不到匹配的就随便挑一个，不报错。
  const { tag } = req.query;
  const matching = tag ? items.filter((i) => (i.tags || []).includes(tag)) : [];
  const pool = matching.length > 0 ? matching : items;
  const item = pool[Math.floor(Math.random() * pool.length)];
  const topic = item.content.topic;
  const ideaBank = getIdeas(topic);
  const firstQuestion = item.content.questions[0];

  const session = createSession({ topic, baseQuestions: item.content.questions, ideaBank });
  updateSession(session.id, { pendingQuestion: firstQuestion });

  try {
    const ttsPath = await speak(firstQuestion);
    res.json({
      sessionId: session.id,
      topic,
      questionText: firstQuestion,
      questionAudioUrl: cacheTtsFile(ttsPath),
      turnIndex: 0,
      maxTurns: MAX_TURNS,
    });
  } catch (err) {
    res.status(502).json({ error: `语音合成失败: ${err.message}` });
  }
});

router.post('/examiner/turn', upload.single('audio'), async (req, res) => {
  const { sessionId } = req.body;
  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ error: '会话不存在或已过期，请重新开始考官模式' });
  if (!req.file) return res.status(400).json({ error: 'audio 必填' });

  try {
    const wavPath = await convertToWav16kMono(req.file.path);
    const { text: answerText } = await transcribe(wavPath);
    fs.unlinkSync(wavPath);
    fs.unlinkSync(req.file.path);

    const history = [...session.history, { question: session.pendingQuestion, answer: answerText }];
    const turnIndex = session.turnIndex + 1;

    if (turnIndex >= MAX_TURNS) {
      const prompt = buildExaminerFeedbackPrompt({ topic: session.topic, history });
      const { data, costUsd } = await askForJson({ feature: 'speaking_examiner_feedback', prompt, timeoutMs: 120_000, retries: 1, userId: req.userId });
      const errorTags = inferSpeakingTags({ scores: data.scores, fillerTotal: 0, durationSec: 0, expectedSec: 0 });

      const attempt = createAttempt({
        userId: req.userId,
        module: 'speaking',
        durationSec: null,
        transcript: history.map((h) => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n'),
        rawResponse: { topic: session.topic, history },
        score: data,
        bandOverall: data.band_overall,
        errorTags,
      });

      deleteSession(sessionId);
      return res.json({ done: true, attemptId: attempt.id, history, costUsd, errorTags, ...data });
    }

    const followUpPrompt = buildExaminerFollowUpPrompt({ topic: session.topic, ideaBank: session.ideaBank, history });
    const { data: followUp, costUsd } = await askForJson({ feature: 'speaking_examiner_followup', prompt: followUpPrompt, timeoutMs: 60_000, retries: 1, userId: req.userId });
    const ttsPath = await speak(followUp.question);

    updateSession(sessionId, { history, turnIndex, pendingQuestion: followUp.question });

    res.json({
      done: false,
      questionText: followUp.question,
      questionAudioUrl: cacheTtsFile(ttsPath),
      turnIndex,
      maxTurns: MAX_TURNS,
      costUsd,
    });
  } catch (err) {
    res.status(502).json({ error: `处理失败: ${err.message}` });
  }
});

router.get('/audio/:filename', (req, res) => {
  const filePath = path.join(TTS_CACHE_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.sendFile(filePath);
});

// ── 完整口语(Part1→2→3连续) ──────────────────────────────
// 三段各自已经各存了一条attempt(part1/part2/examiner)，这里再额外存一条"合并"的attempt，
// 专门给仪表板/完整模考用——避免它们只看到"最后一条speaking attempt"(也就是Part3那条)，
// 真实雅思口语本来就是一个综合分，不是三段分开打分再各自展示。
router.post('/full/finish', (req, res) => {
  const { part1, part2, part3 } = req.body;
  const sections = [part1, part2, part3].filter((s) => s && typeof s.band_overall === 'number');
  if (sections.length === 0) return res.status(400).json({ error: '没有任何一段的评分结果' });

  const avgScore = (key) => {
    const vals = sections.map((s) => s.scores?.[key]).filter((v) => typeof v === 'number');
    return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 2) / 2 : null;
  };
  const bandOverall = Math.round((sections.reduce((a, s) => a + s.band_overall, 0) / sections.length) * 2) / 2;

  const attempt = createAttempt({
    userId: req.userId,
    module: 'speaking',
    durationSec: null,
    rawResponse: { part1, part2, part3, combined: true },
    score: {
      scores: { fc: avgScore('fc'), lr: avgScore('lr'), gra: avgScore('gra'), pron: avgScore('pron') },
      band_overall: bandOverall,
      parts: sections.length,
    },
    bandOverall,
    errorTags: [...new Set([part1, part2, part3].flatMap((s) => s?.errorTags || []))],
  });

  res.json({ attemptId: attempt.id, bandOverall, partsIncluded: sections.length });
});

module.exports = router;
