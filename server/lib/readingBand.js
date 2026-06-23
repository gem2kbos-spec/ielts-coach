// IELTS Academic Reading 原始分(满分40)→band的换算表，跟听力那张表同样是公开发布、
// 广为引用的通用版本，不是某次具体真题的版权内容，不同年份官方表格可能有±0.5浮动。
const TABLE = [
  { min: 40, band: 9 },
  { min: 39, band: 8.5 },
  { min: 37, band: 8 },
  { min: 35, band: 7.5 },
  { min: 33, band: 7 },
  { min: 30, band: 6.5 },
  { min: 27, band: 6 },
  { min: 23, band: 5.5 },
  { min: 19, band: 5 },
  { min: 15, band: 4.5 },
  { min: 13, band: 4 },
  { min: 10, band: 3.5 },
  { min: 8, band: 3 },
  { min: 6, band: 2.5 },
  { min: 0, band: 2 },
];

function rawScoreToBand(rawScore) {
  const entry = TABLE.find((t) => rawScore >= t.min);
  return entry ? entry.band : 2;
}

// 本系统的阅读模块是"自由练习单篇文章"，不是凑3篇40题的真考形态，
// 模考报告里没有统一的"满分40的原始分"，只能用各篇正确率的平均值粗略换算成band，
// 跟听力那种有明确原始分的换算比，这个更不精确，要跟用户说清楚是粗略估计。
function accuracyToApproxBand(accuracyPercent) {
  const approxRawScore = Math.round((accuracyPercent / 100) * 40);
  return rawScoreToBand(approxRawScore);
}

module.exports = { rawScoreToBand, accuracyToApproxBand };
