const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const multer = require('multer');
const { listItems, getItem, upsertItem } = require('../db/itemsRepo');
const { createAttempt, getLatestAttemptForItem } = require('../db/attemptsRepo');
const { extractPdfPages, extractPdfText } = require('../services/pdf');
const { renderPageToPng } = require('../services/pdfImage');
const { getAudioDurationSec } = require('../services/audio');
const { askForJson } = require('../services/llm');
const { parseListeningDocument } = require('../lib/listeningParser');
const { pairFiles, AUDIO_EXT } = require('../lib/listeningPairing');
const { buildListeningAnswerKeyPrompt, buildListeningErrorTagPrompt } = require('../lib/listeningPrompt');
const { rawScoreToBand } = require('../lib/listeningBand');
const { gradeSection } = require('../lib/listeningGrading');
const { createPreview, getPreview } = require('../services/listeningPreviewCache');

const USER_IMPORTS_DIR = path.join(__dirname, '..', '..', 'data', 'user-imports', 'listening');
const upload = multer({ dest: os.tmpdir() });
const router = express.Router();

const TEMPLATE = {
  sections: [
    {
      title: 'Section 3 - Library Orientation',
      section: 'S3',
      audioFile: 'section3.mp3',
      defaultDurationSec: 600,
      transcript: '（可选）粘贴完整听力原文，用于AI辅助生成参考答案+做完后高亮答案句',
      questions: [
        {
          number: 1,
          type: 'fill_blank',
          prompt: 'The library opens at ___ am on weekdays.',
          options: null,
          correct_answer: 'eight',
          explanation: '可选，给出依据',
        },
        {
          number: 5,
          type: 'multiple_select',
          prompt: 'Which TWO facilities were recently renovated?',
          options: ['A. cafe', 'B. computer lab', 'C. reading room', 'D. car park', 'E. lecture hall'],
          expectedCount: 2,
          correct_answer: ['B', 'D'],
          explanation: null,
        },
        {
          number: 7,
          type: 'map_label',
          prompt: 'Main entrance',
          options: null,
          correct_answer: 'north gate',
          explanation: null,
        },
      ],
    },
  ],
};

router.get('/template', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="listening-template.json"');
  res.json(TEMPLATE);
});

// 按页解析题目文件：pdf按页，txt/json当成单页
async function parseQuestionFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.json') {
    const raw = JSON.parse(fs.readFileSync(file.path, 'utf8'));
    return { questions: raw.questions || [], mapPageGuess: null, confidence: 'high', fromTemplate: true, meta: raw };
  }
  const pages = ext === '.pdf' ? await extractPdfPages(file.path) : [fs.readFileSync(file.path, 'utf8')];
  const parsed = parseListeningDocument(pages);
  return { ...parsed, fromTemplate: false };
}

async function buildPairPreview(pair) {
  const durationSec = await getAudioDurationSec(pair.audioFile.path).catch(() => null);
  let parsed;
  try {
    parsed = await parseQuestionFile(pair.questionFile);
  } catch (err) {
    // 题目文件解析失败(空文件/格式不对)不该拖垮整个上传请求，给这一对标个错误，其他文件正常走
    return {
      stem: pair.stem,
      audioFilename: pair.audioFile.originalname,
      questionFilename: pair.questionFile.originalname,
      audioPath: pair.audioFile.path,
      questionPath: pair.questionFile.path,
      durationSec,
      title: pair.stem,
      section: null,
      transcript: null,
      questions: [],
      mapPageGuess: null,
      confidence: 'low',
      defaultDurationSec: 600,
      parseError: `题目文件解析失败: ${err.message}`,
    };
  }
  return {
    stem: pair.stem,
    audioFilename: pair.audioFile.originalname,
    questionFilename: pair.questionFile.originalname,
    audioPath: pair.audioFile.path,
    questionPath: pair.questionFile.path,
    durationSec,
    title: parsed.meta?.title || pair.stem,
    section: parsed.meta?.section || null,
    transcript: parsed.meta?.transcript || null,
    questions: parsed.questions,
    mapPageGuess: parsed.mapPageGuess,
    confidence: parsed.confidence,
    defaultDurationSec: parsed.meta?.defaultDurationSec || 600,
  };
}

router.post('/upload', upload.array('files'), async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ error: '没有收到文件' });

  // 批量JSON模板(含 sections 数组)走单独路径：按文件名匹配音频，不参与按stem的自动配对
  const templateFiles = files.filter((f) => path.extname(f.originalname).toLowerCase() === '.json');
  let batchSections = [];
  const consumedNames = new Set();
  for (const tf of templateFiles) {
    try {
      const raw = JSON.parse(fs.readFileSync(tf.path, 'utf8'));
      if (!Array.isArray(raw.sections)) continue;
      consumedNames.add(tf.originalname);
      for (const sec of raw.sections) {
        const audioFile = files.find((f) => f.originalname === sec.audioFile);
        if (!audioFile) {
          batchSections.push({ ...sec, audioMissing: true });
          continue;
        }
        consumedNames.add(audioFile.originalname);
        const durationSec = await getAudioDurationSec(audioFile.path).catch(() => null);
        batchSections.push({
          title: sec.title,
          section: sec.section,
          audioFilename: audioFile.originalname,
          audioPath: audioFile.path,
          durationSec,
          defaultDurationSec: sec.defaultDurationSec || 600,
          transcript: sec.transcript || null,
          questions: sec.questions || [],
        });
      }
    } catch {
      // 不是有效的批量模板JSON，留给下面的按stem配对流程当普通文件处理
    }
  }

  const remainingFiles = files.filter((f) => !consumedNames.has(f.originalname));
  const { pairs, unpaired } = pairFiles(remainingFiles);
  const pairedSections = await Promise.all(pairs.map(buildPairPreview));

  const previewId = createPreview(files.map((f) => ({ originalname: f.originalname, path: f.path })));
  res.json({
    previewId,
    batchSections,
    pairedSections,
    unpaired: unpaired.map((f) => ({ originalname: f.originalname, kind: f.kind })),
  });
});

router.post('/upload/manual-pair', async (req, res) => {
  const { previewId, audioFilename, questionFilename } = req.body;
  const preview = getPreview(previewId);
  if (!preview) return res.status(404).json({ error: '预览已过期，请重新上传' });
  const audioFile = preview.files.find((f) => f.originalname === audioFilename);
  const questionFile = preview.files.find((f) => f.originalname === questionFilename);
  if (!audioFile || !questionFile) return res.status(400).json({ error: '找不到指定的文件' });
  try {
    const section = await buildPairPreview({ stem: null, audioFile, questionFile });
    res.json({ section });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/suggest-answers', async (req, res) => {
  const { transcript, questions } = req.body;
  if (!transcript) return res.status(400).json({ error: '没有提供transcript，无法AI辅助填答案' });
  try {
    const { data, costUsd } = await askForJson({
      feature: 'listening_answer_key',
      prompt: buildListeningAnswerKeyPrompt({ transcript, questions }),
      timeoutMs: 60_000,
      retries: 1,
    });
    res.json({ answers: data.answers, costUsd });
  } catch (err) {
    res.status(502).json({ error: `AI辅助生成答案失败: ${err.message}` });
  }
});

function saveImportedAudio(itemId, audioPath, originalname) {
  const dir = path.join(USER_IMPORTS_DIR, itemId);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(originalname).toLowerCase();
  const dest = path.join(dir, `audio${ext}`);
  fs.copyFileSync(audioPath, dest);
  return dest;
}

async function saveMapImage(itemId, pdfPath, pageNumber) {
  if (!pdfPath || !pageNumber) return null;
  const buf = await renderPageToPng(pdfPath, pageNumber).catch(() => null);
  if (!buf) return null;
  const dir = path.join(USER_IMPORTS_DIR, itemId);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, 'map.png');
  fs.writeFileSync(dest, buf);
  return dest;
}

router.post('/import', async (req, res) => {
  const { sections } = req.body;
  if (!Array.isArray(sections) || sections.length === 0) {
    return res.status(400).json({ error: '没有要导入的section' });
  }
  const created = [];
  for (const sec of sections) {
    const item = upsertItem({
      module: 'listening',
      subtype: 'listening_section',
      tags: [],
      source: 'user_import',
      content: {
        title: sec.title,
        section: sec.section,
        defaultDurationSec: sec.defaultDurationSec || 600,
        durationSec: sec.durationSec || null,
        transcript: sec.transcript || null,
        imagePath: null,
        questions: sec.questions,
      },
      file_path: null,
    });

    const audioDest = sec.audioPath ? saveImportedAudio(item.id, sec.audioPath, sec.audioFilename) : null;
    const imageDest =
      sec.mapPageGuess && sec.questionPath && (sec.questionFilename || '').toLowerCase().endsWith('.pdf')
        ? await saveMapImage(item.id, sec.questionPath, sec.mapPageGuess)
        : null;

    const updated = upsertItem({
      id: item.id,
      module: item.module,
      subtype: item.subtype,
      tags: item.tags,
      source: item.source,
      file_path: audioDest,
      content: { ...item.content, imagePath: imageDest },
    });
    created.push(updated);
  }
  res.json({ created });
});

router.get('/sections', (req, res) => {
  const items = listItems({ module: 'listening', subtype: 'listening_section' });
  const enriched = items.map((item) => {
    const attempt = getLatestAttemptForItem(item.id);
    return {
      id: item.id,
      title: item.content.title,
      section: item.content.section,
      durationSec: item.content.durationSec,
      questionCount: item.content.questions.length,
      completed: !!attempt,
      lastAccuracy: attempt?.score?.accuracy ?? null,
      source: item.source,
      created_at: item.created_at,
    };
  });
  res.json(enriched);
});

router.get('/sections/:id', (req, res) => {
  const item = getItem(req.params.id);
  if (!item || item.module !== 'listening' || item.subtype !== 'listening_section') {
    return res.status(404).json({ error: 'not found' });
  }
  res.json({
    id: item.id,
    title: item.content.title,
    section: item.content.section,
    defaultDurationSec: item.content.defaultDurationSec,
    hasImage: !!item.content.imagePath,
    hasTranscript: !!item.content.transcript,
    questions: item.content.questions.map(({ correct_answer, explanation, ...rest }) => rest),
  });
});

router.get('/sections/:id/map-image', (req, res) => {
  const item = getItem(req.params.id);
  if (!item || !item.content.imagePath) return res.status(404).json({ error: 'not found' });
  res.sendFile(item.content.imagePath);
});

router.post('/sections/:id/submit', async (req, res) => {
  const { answers, durationSec } = req.body;
  const item = getItem(req.params.id);
  if (!item || item.module !== 'listening' || item.subtype !== 'listening_section') {
    return res.status(404).json({ error: 'not found' });
  }

  const { perQuestion, correctCount, total } = gradeSection(item, answers);
  const accuracy = total > 0 ? Math.round((correctCount / total) * 1000) / 10 : 0;
  const wrongAnswers = perQuestion.filter((q) => !q.correct);

  let errorTags = [];
  let perQuestionTags = [];
  if (wrongAnswers.length > 0) {
    try {
      const { data } = await askForJson({
        feature: 'listening_error_tag',
        prompt: buildListeningErrorTagPrompt({ transcript: item.content.transcript, wrongAnswers }),
        timeoutMs: 60_000,
        retries: 1,
      });
      errorTags = data.tags || [];
      perQuestionTags = data.per_question || [];
    } catch {
      // 错题归因失败不影响判分结果本身
    }
  }

  const attempt = createAttempt({
    module: 'listening',
    itemId: item.id,
    durationSec,
    rawResponse: { answers },
    score: { accuracy, correctCount, total, perQuestion },
    bandOverall: null,
    errorTags,
  });

  res.json({
    attemptId: attempt.id,
    accuracy,
    correctCount,
    total,
    perQuestion,
    errorTags,
    perQuestionTags,
    transcript: item.content.transcript,
  });
});

router.post('/mock/submit', async (req, res) => {
  const { sectionResults, durationSec } = req.body; // [{ sectionId, answers }]
  if (!Array.isArray(sectionResults) || sectionResults.length === 0) {
    return res.status(400).json({ error: '没有section结果' });
  }

  const perSection = [];
  const allWrong = [];
  let totalCorrect = 0;
  let totalQuestions = 0;

  for (const sr of sectionResults) {
    const item = getItem(sr.sectionId);
    if (!item) continue;
    const { perQuestion, correctCount, total } = gradeSection(item, sr.answers);
    totalCorrect += correctCount;
    totalQuestions += total;
    perSection.push({ sectionId: item.id, title: item.content.title, section: item.content.section, correctCount, total, perQuestion });
    perQuestion.filter((q) => !q.correct).forEach((q) => allWrong.push({ ...q, sectionTitle: item.content.title }));

    // 单独给每个section也记一条attempt，这样"全真模拟"里做过的section在选题页也会显示"已完成"
    const sectionAccuracy = total > 0 ? Math.round((correctCount / total) * 1000) / 10 : 0;
    createAttempt({
      module: 'listening',
      itemId: item.id,
      durationSec: sr.durationSec || null,
      rawResponse: { answers: sr.answers, fromMock: true },
      score: { accuracy: sectionAccuracy, correctCount, total, perQuestion },
      bandOverall: null,
      errorTags: [],
    });
  }

  const band = rawScoreToBand(totalCorrect);

  let errorTags = [];
  if (allWrong.length > 0) {
    try {
      const { data } = await askForJson({
        feature: 'listening_mock_error_tag',
        prompt: buildListeningErrorTagPrompt({ transcript: null, wrongAnswers: allWrong }),
        timeoutMs: 60_000,
        retries: 1,
      });
      errorTags = data.tags || [];
    } catch {
      // ignore
    }
  }

  const attempt = createAttempt({
    module: 'listening',
    itemId: null,
    durationSec,
    rawResponse: { sectionResults },
    score: { accuracy: Math.round((totalCorrect / totalQuestions) * 1000) / 10, correctCount: totalCorrect, total: totalQuestions, perSection, mock: true, band },
    bandOverall: band,
    errorTags,
  });

  res.json({ attemptId: attempt.id, totalCorrect, totalQuestions, band, perSection, errorTags });
});

module.exports = router;
