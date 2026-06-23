// 通用错题/弱项归因 tag。前 5 个是阅读/听力客观题设计的经典归因（P1 才用得上）；
// 后面是写作/口语主观题场景下，从评分结果启发式推断出的弱项标签。
const TAGS = {
  careless: '粗心',
  vocab_gap: '词汇空白',
  logic_misread: '逻辑误解',
  time_pressure: '时间不够',
  trap_distractor: '陷阱选项',
  task_response_weak: '任务回应不足',
  coherence_weak: '逻辑连贯弱',
  grammar_weak: '语法薄弱',
  pronunciation_weak: '发音待提升',
  chinglish: '中式表达',
  filler_heavy: '填充词过多',
  underdeveloped: '展开不足/字数不够',
};

function lowestCriterion(scores) {
  return Object.entries(scores).reduce(
    (min, [k, v]) => (v < min.v ? { k, v } : min),
    { k: null, v: Infinity }
  ).k;
}

function inferWritingTags({ scores, chinglish, wordCount, minWordCount = 250 }) {
  const tags = [];
  if (wordCount < minWordCount) tags.push('underdeveloped');
  if (chinglish && chinglish.length > 0) tags.push('chinglish');
  const weakest = lowestCriterion(scores);
  if (weakest === 'gra') tags.push('grammar_weak');
  if (weakest === 'cc') tags.push('coherence_weak');
  if (weakest === 'ta') tags.push('task_response_weak');
  if (weakest === 'lr') tags.push('vocab_gap');
  return tags;
}

function inferSpeakingTags({ scores, fillerTotal, durationSec, expectedSec }) {
  const tags = [];
  if (fillerTotal >= 5) tags.push('filler_heavy');
  if (expectedSec && durationSec && durationSec < expectedSec * 0.6) tags.push('underdeveloped');
  const weakest = lowestCriterion(scores);
  if (weakest === 'pron') tags.push('pronunciation_weak');
  if (weakest === 'fc') tags.push('coherence_weak');
  if (weakest === 'gra') tags.push('grammar_weak');
  if (weakest === 'lr') tags.push('vocab_gap');
  return tags;
}

module.exports = { TAGS, inferWritingTags, inferSpeakingTags };
