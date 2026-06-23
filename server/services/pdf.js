const fs = require('fs');
const path = require('path');

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// pdf.js 的 getTextContent() 按文字块（不是按行）返回，块之间没有换行/段落信息。
// 按每个文字块的 y 坐标重建行结构；行间距明显大于"正常行高"的地方判定为段落分隔，
// 插入一个空行——否则下游 readingParser.js 既识别不到题号/选项，也分不出段落。
function itemsToText(items) {
  const rows = [];
  let currentLine = [];
  let currentY = null;
  for (const item of items) {
    const y = item.transform ? item.transform[5] : null;
    if (currentY !== null && y !== null && Math.abs(y - currentY) > 1) {
      rows.push({ y: currentY, text: currentLine.join(' ').replace(/\s+/g, ' ').trim() });
      currentLine = [];
    }
    if (item.str) currentLine.push(item.str);
    currentY = y;
  }
  if (currentLine.length) rows.push({ y: currentY, text: currentLine.join(' ').replace(/\s+/g, ' ').trim() });

  const deltas = [];
  for (let i = 1; i < rows.length; i += 1) deltas.push(Math.abs(rows[i - 1].y - rows[i].y));
  const typicalLineHeight = median(deltas);

  const lines = [];
  for (let i = 0; i < rows.length; i += 1) {
    if (i > 0 && typicalLineHeight > 0) {
      const gap = Math.abs(rows[i - 1].y - rows[i].y);
      if (gap > typicalLineHeight * 1.5) lines.push('');
    }
    lines.push(rows[i].text);
  }
  return lines.join('\n');
}

// 按页提取PDF文本，保留页码边界（阅读模块的手动分割按页码功能需要这个）。
async function extractPdfPages(filePath) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const standardFontDataUrl = path.join(
    path.dirname(require.resolve('pdfjs-dist/package.json')),
    'standard_fonts/'
  );
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, standardFontDataUrl }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(itemsToText(content.items));
  }
  await doc.destroy();
  return pages;
}

async function extractPdfText(filePath) {
  const pages = await extractPdfPages(filePath);
  return pages.join('\n\n');
}

module.exports = { extractPdfPages, extractPdfText };
