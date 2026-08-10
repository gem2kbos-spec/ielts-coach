// 写作评分发现chinglish/低级表达时，best-effort匹配词组库里的"升级版"建议——
// 不追求精确语义匹配，简单关键词重叠就够用了：拿chinglish的suggestion文本
// 去跟词组库的standard/alternatives做大小写无关的子串/词重叠检查。
// 停用词必须排除——"with"/"that"这种4字母虚词重叠完全没有信号量，会产出风马牛不相及的"匹配"。
const STOPWORDS = new Set([
  'with', 'that', 'this', 'from', 'have', 'into', 'than', 'such', 'also', 'more',
  'very', 'like', 'will', 'they', 'there', 'their', 'about', 'which', 'these',
  'over', 'time', 'some', 'when', 'what', 'your', 'just', 'even', 'most', 'many',
  // 这些词太泛了，在任意主题的句子里都可能出现，单靠它们重叠几乎不带任何语义信号，
  // 反而会把完全不相关的表达配成"建议"(比如"rise of the internet" vs "give rise to...")
  'rise', 'fall', 'give', 'take', 'make', 'made', 'develop', 'developed', 'development',
  'need', 'needs', 'want', 'think', 'thought', 'work', 'works', 'problem', 'problems',
  'people', 'society', 'world', 'life', 'good', 'bad', 'effect', 'effects', 'affect',
  'change', 'changes', 'become', 'becomes', 'today', 'modern', 'important',
]);

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

function hasWordOverlap(a, b, minOverlap = 1) {
  const setB = new Set(b);
  const overlap = a.filter((w) => setB.has(w));
  return overlap.length >= minOverlap;
}

function matchExpressionsForChinglish(chinglishArray, phraseItems) {
  if (!chinglishArray?.length || !phraseItems?.length) return [];

  const matches = [];
  for (const c of chinglishArray) {
    const suggestionWords = normalize(c.suggestion);
    if (suggestionWords.length === 0) continue;

    for (const item of phraseItems) {
      const standardWords = normalize(item.content.standard);
      const altWords = (item.content.alternatives || []).flatMap(normalize);
      if (hasWordOverlap(suggestionWords, standardWords) || hasWordOverlap(suggestionWords, altWords)) {
        matches.push({ chinglishPhrase: c.phrase, itemId: item.id, chinese: item.content.chinese, standard: item.content.standard });
        break; // 一条chinglish最多配一个建议，避免刷屏
      }
    }
  }
  return matches;
}

module.exports = { matchExpressionsForChinglish };
