const express = require('express');
const multer = require('multer');
const os = require('os');
const fs = require('fs');
const { listItems, getItem, upsertItem } = require('../db/itemsRepo');
const { importFile } = require('../services/importer');
const { parsePastedQuestionText } = require('../lib/pastedQuestionParser');

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 100 * 1024 * 1024, files: 1 } });
const router = express.Router();

router.get('/', (req, res) => {
  const { module, subtype } = req.query;
  res.json(listItems({ module, subtype }));
});

router.get('/:id', (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(item);
});

router.get('/:id/file', (req, res) => {
  const item = getItem(req.params.id);
  if (!item || !item.file_path) return res.status(404).json({ error: 'not found' });
  res.sendFile(item.file_path);
});

router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'missing file' });
  const hints = {
    module: req.body.module,
    subtype: req.body.subtype,
    tags: req.body.tags ? req.body.tags.split(',').map((t) => t.trim()) : [],
  };
  try {
    const created = await importFile({
      filePath: req.file.path,
      originalName: req.file.originalname,
      hints,
    });
    res.json({ created });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    fs.rmSync(req.file.path, { force: true });
  }
});

router.post('/paste/preview', (req, res) => {
  try {
    res.json(parsePastedQuestionText(req.body?.text));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/paste/import', (req, res) => {
  try {
    const parsed = parsePastedQuestionText(req.body?.text);
    if (!parsed.canImport) {
      return res.status(400).json({ error: '题目仍有格式问题，请根据预览提示修正后再导入', warnings: parsed.warnings });
    }
    const difficulty = ['easy', 'medium', 'hard'].includes(req.body?.difficulty) ? req.body.difficulty : 'medium';
    const created = upsertItem({
      module: 'reading',
      subtype: 'passage_with_questions',
      difficulty,
      tags: ['pasted-import'],
      source: 'user_import',
      content: {
        title: parsed.title,
        passage_text: parsed.passageText,
        paragraphs: null,
        injected_vocab: [],
        questions: parsed.questions.map((q) => ({
          number: q.number,
          type: q.type,
          instructions: null,
          prompt: q.prompt,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
        })),
      },
    });
    res.json({ created, questionCount: parsed.questions.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
