// IELTS Listening 原始分(满分40)→band的换算表。这是雅思官方公开发布、广为引用的通用换算方法
// (不是某次具体真题的版权内容)，不同年份/版本官方表格可能有±0.5的微调，这里给的是最常见版本，
// 标注为"近似换算"。
const TABLE = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 32, band: 7.5 },
  { min: 30, band: 7 },
  { min: 26, band: 6.5 },
  { min: 23, band: 6 },
  { min: 18, band: 5.5 },
  { min: 16, band: 5 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4 },
  { min: 8, band: 3.5 },
  { min: 6, band: 3 },
  { min: 4, band: 2.5 },
  { min: 0, band: 2 },
];

function rawScoreToBand(rawScore) {
  const entry = TABLE.find((t) => rawScore >= t.min);
  return entry ? entry.band : 2;
}

module.exports = { rawScoreToBand };
