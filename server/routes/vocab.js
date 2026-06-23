const express = require('express');
const { createVocab, getVocab, listVocab, updateVocab, deleteVocab } = require('../db/vocabRepo');
const { askForJson } = require('../services/llm');
const { buildVocabLookupPrompt } = require('../lib/vocabPrompt');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(listVocab({ q: req.query.q }));
});

router.get('/:id', (req, res) => {
  const v = getVocab(req.params.id);
  if (!v) return res.status(404).json({ error: 'not found' });
  res.json(v);
});

router.post('/', async (req, res) => {
  const { word, contextSentence, sourceItemId } = req.body;
  if (!word) return res.status(400).json({ error: 'word 必填' });

  const prompt = buildVocabLookupPrompt({ word, contextSentence });
  try {
    const { data, costUsd } = await askForJson({ feature: 'vocab_lookup', prompt, timeoutMs: 60_000, retries: 1 });
    const entry = createVocab({
      word,
      contextSentence,
      sourceItemId,
      chineseGloss: data.chinese_gloss,
      detail: {
        part_of_speech: data.part_of_speech,
        explanation: data.explanation,
        examples: data.examples,
        collocations: data.collocations,
      },
    });
    res.json({ ...entry, costUsd });
  } catch (err) {
    res.status(502).json({ error: `生成释义失败: ${err.message}` });
  }
});

router.patch('/:id', (req, res) => {
  const updated = updateVocab(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  deleteVocab(req.params.id);
  res.json({ ok: true });
});

router.get('/export/:format', (req, res) => {
  const entries = listVocab({});
  if (req.params.format === 'anki') {
    const lines = entries.map((e) => {
      const back = [
        e.chinese_gloss || '',
        e.detail?.part_of_speech ? `(${e.detail.part_of_speech})` : '',
        e.detail?.explanation || '',
        ...(e.detail?.examples || []),
      ]
        .filter(Boolean)
        .join('<br>')
        .replace(/\t/g, ' ');
      return `${e.word}\t${back}`;
    });
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="vocab-anki.txt"');
    return res.send(lines.join('\n'));
  }

  // markdown
  const md = entries
    .map((e) => {
      const lines = [`## ${e.word}`, e.chinese_gloss ? `**${e.chinese_gloss}**` : ''];
      if (e.detail?.part_of_speech) lines.push(`*${e.detail.part_of_speech}*`);
      if (e.detail?.explanation) lines.push(e.detail.explanation);
      if (e.context_sentence) lines.push(`> ${e.context_sentence}`);
      if (e.detail?.examples?.length) lines.push(...e.detail.examples.map((s) => `- ${s}`));
      return lines.filter(Boolean).join('\n\n');
    })
    .join('\n\n---\n\n');
  res.set('Content-Type', 'text/markdown; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="vocab.md"');
  res.send(md);
});

module.exports = router;
