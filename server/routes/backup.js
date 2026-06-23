const os = require('os');
const express = require('express');
const multer = require('multer');
const { streamBackupZip, restoreFromZipBuffer } = require('../services/backup');

const upload = multer({ dest: os.tmpdir() });
const router = express.Router();

router.get('/export', async (req, res) => {
  try {
    await streamBackupZip(res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: `备份失败: ${err.message}` });
  }
});

router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有收到备份文件' });
  try {
    const fs = require('fs');
    const buffer = fs.readFileSync(req.file.path);
    const result = restoreFromZipBuffer(buffer);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: `恢复失败: ${err.message}` });
  }
});

module.exports = router;
