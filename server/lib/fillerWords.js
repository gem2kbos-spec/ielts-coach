const FILLER_PATTERNS = [
  { key: 'um', re: /\bums?\b/gi },
  { key: 'uh', re: /\buhs?\b/gi },
  { key: 'erm', re: /\berms?\b/gi },
  { key: 'like', re: /\blike\b/gi },
  { key: 'you_know', re: /\byou know\b/gi },
  { key: 'i_mean', re: /\bi mean\b/gi },
  { key: 'sort_of', re: /\bsort of\b/gi },
  { key: 'kind_of', re: /\bkind of\b/gi },
  { key: 'basically', re: /\bbasically\b/gi },
];

// 中文填充词（万一录音里夹了中文口头语）
const CHINESE_FILLER_RE = /(嗯+|啊+|那个|这个|就是说)/g;

function countFillers(text) {
  const counts = {};
  let total = 0;
  for (const { key, re } of FILLER_PATTERNS) {
    const matches = text.match(re) || [];
    if (matches.length > 0) {
      counts[key] = matches.length;
      total += matches.length;
    }
  }
  const chineseMatches = text.match(CHINESE_FILLER_RE) || [];
  if (chineseMatches.length > 0) {
    counts.chinese_filler = chineseMatches.length;
    total += chineseMatches.length;
  }

  // 重复词检测（"I I think" / "the the"）
  const stutterMatches = text.match(/\b(\w+)\s+\1\b/gi) || [];
  if (stutterMatches.length > 0) {
    counts.repeated_word = stutterMatches.length;
    total += stutterMatches.length;
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return {
    total,
    counts,
    perMinuteEstimate: null, // 由调用方结合实际时长计算
    wordCount,
  };
}

module.exports = { countFillers };
