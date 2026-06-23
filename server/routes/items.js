const express = require('express');
const multer = require('multer');
const os = require('os');
const { listItems, getItem } = require('../db/itemsRepo');
const { importFile } = require('../services/importer');

const upload = multer({ dest: os.tmpdir() });
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
  }
});

module.exports = router;
