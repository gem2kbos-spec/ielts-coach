const fs = require('fs');
const path = require('path');

// 把PDF某一页整页截图成PNG——用于听力地图/示意图标注题：不需要用户单独上传图片，
// 直接把题目文档里那一页(通常图+文字混排)截下来当参考图。
async function renderPageToPng(filePath, pageNumber, scale = 2) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createCanvas } = require('@napi-rs/canvas');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const standardFontDataUrl = path.join(
    path.dirname(require.resolve('pdfjs-dist/package.json')),
    'standard_fonts/'
  );
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, standardFontDataUrl }).promise;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  await doc.destroy();
  return canvas.toBuffer('image/png');
}

module.exports = { renderPageToPng };
