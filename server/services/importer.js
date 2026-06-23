const fs = require('fs');
const path = require('path');
const { upsertItem } = require('../db/itemsRepo');
const { extractPdfText } = require('./pdf');

const USER_IMPORTS_DIR = path.join(__dirname, '..', '..', 'data', 'user-imports');

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.m4a', '.webm', '.ogg']);

function persistOriginal(srcPath, originalName) {
  fs.mkdirSync(USER_IMPORTS_DIR, { recursive: true });
  const safeName = `${Date.now()}-${originalName.replace(/[^\w.\-]/g, '_')}`;
  const destPath = path.join(USER_IMPORTS_DIR, safeName);
  fs.copyFileSync(srcPath, destPath);
  return destPath;
}

async function importJson(filePath, hints) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const candidates = Array.isArray(raw) ? raw : [raw];
  const created = candidates.map((entry) =>
    upsertItem({
      source: 'user_import',
      ...entry,
      module: entry.module || hints.module,
      subtype: entry.subtype || hints.subtype,
    })
  );
  return created;
}

async function importText(filePath, originalName, hints) {
  const text = fs.readFileSync(filePath, 'utf8');
  const destPath = persistOriginal(filePath, originalName);
  const item = upsertItem({
    module: hints.module || 'writing',
    subtype: hints.subtype || 'imported_text',
    tags: hints.tags || [],
    source: 'user_import',
    file_path: destPath,
    content: { raw_text: text, original_filename: originalName },
  });
  return [item];
}

async function importPdf(filePath, originalName, hints) {
  const text = await extractPdfText(filePath);
  const destPath = persistOriginal(filePath, originalName);
  const item = upsertItem({
    module: hints.module || 'reading',
    subtype: hints.subtype || 'imported_pdf',
    tags: hints.tags || [],
    source: 'user_import',
    file_path: destPath,
    content: { raw_text: text, original_filename: originalName },
  });
  return [item];
}

async function importAudio(filePath, originalName, hints) {
  const destPath = persistOriginal(filePath, originalName);
  const item = upsertItem({
    module: hints.module || 'speaking',
    subtype: hints.subtype || 'imported_audio',
    tags: hints.tags || [],
    source: 'user_import',
    file_path: destPath,
    content: { audio_path: destPath, original_filename: originalName },
  });
  return [item];
}

async function importFile({ filePath, originalName, hints = {} }) {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.json') return importJson(filePath, hints);
  if (ext === '.txt') return importText(filePath, originalName, hints);
  if (ext === '.pdf') return importPdf(filePath, originalName, hints);
  if (AUDIO_EXTS.has(ext)) return importAudio(filePath, originalName, hints);
  throw new Error(`不支持的文件类型: ${ext}`);
}

module.exports = { importFile, USER_IMPORTS_DIR };
