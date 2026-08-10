const express = require('express');
const { createVocab, getVocab, listVocab, updateVocab, deleteVocab, countByWord } = require('../db/vocabRepo');
const { askForJson } = require('../services/llm');
const { buildVocabLookupPrompt } = require('../lib/vocabPrompt');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(listVocab({ userId: req.userId, q: req.query.q }));
});

router.get('/:id', (req, res) => {
  const v = getVocab(req.params.id, req.userId);
  if (!v) return res.status(404).json({ error: 'not found' });
  res.json(v);
});

router.post('/', async (req, res) => {
  const { word, contextSentence, sourceItemId } = req.body;
  if (!word) return res.status(400).json({ error: 'word 必填' });

  const existingCount = countByWord(req.userId, word);
  if (existingCount > 0) {
    return res.json({ alreadyExists: true, duplicateCount: existingCount, word });
  }

  // 先同步写入词条（防止并发重复：两个请求同时通过countByWord检查时，
  // 先到的INSERT成功，后到的因唯一索引冲突而报错，不会有第二条重复记录）
  let entry;
  try {
    entry = createVocab({ userId: req.userId, word, contextSentence, sourceItemId });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message?.includes('UNIQUE')) {
      return res.json({ alreadyExists: true, duplicateCount: 1, word });
    }
    return res.status(500).json({ error: err.message });
  }

  // 再异步请求AI生成释义，写回词条
  const prompt = buildVocabLookupPrompt({ word, contextSentence });
  try {
    const { data, costUsd } = await askForJson({ feature: 'vocab_lookup', prompt, timeoutMs: 60_000, retries: 1, userId: req.userId });
    const updated = updateVocab(entry.id, req.userId, {
      chinese_gloss: data.chinese_gloss,
      detail: {
        part_of_speech: data.part_of_speech,
        explanation: data.explanation,
        examples: data.examples,
        collocations: data.collocations,
      },
    });
    res.json({ ...updated, costUsd });
  } catch (err) {
    // AI失败时词条已保存，把空释义词条返回前端，不报错
    res.json({ ...entry, costUsd: 0 });
  }
});

router.patch('/:id', (req, res) => {
  const updated = updateVocab(req.params.id, req.userId, req.body);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  deleteVocab(req.params.id, req.userId);
  res.json({ ok: true });
});

router.get('/export/:format', (req, res) => {
  const entries = listVocab({ userId: req.userId });
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
