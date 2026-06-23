// 雅思官方计字规则：以空白分隔计数，连字符复合词算一个词，数字算一个词，
// 缩写如 "don't" 算一个词。简单实现：按空白切分后过滤空字符串。
function countWords(text) {
  if (!text) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

module.exports = { countWords };
