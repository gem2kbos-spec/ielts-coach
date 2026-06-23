// 启发式、非声学测量的"发音风险词"标记。
// 原理：①按拼写规则标出中国考生常见易错音对应的单词（th / v / 词首r / 词尾辅音簇 / -ed结尾）；
// ②用 Whisper 对该词的识别置信度(prob)做弱信号——置信度低的风险词标成 watch（更值得回听），
// 置信度高的标成 aware（提醒一下，不代表读错）。这不是真实的声学音素识别，只是一个低成本的proxy。
const CATEGORIES = [
  { key: 'th', label: '/θ/ /ð/（th 音）', test: (w) => /^th/.test(w) },
  { key: 'v', label: '/v/ 音', test: (w) => /v/.test(w) },
  { key: 'initial_r', label: '词首 /r/', test: (w) => /^r/.test(w) },
  { key: 'final_cluster', label: '词尾辅音簇', test: (w) => /(ds|ts|ks|st|nd|nt|ct|pt|ld|rd)$/.test(w) },
  { key: 'ed_ending', label: '-ed 词尾', test: (w) => /[a-z]ed$/.test(w) && w.length > 3 },
];

const WATCH_PROB_THRESHOLD = 0.55;

function analyzeRisk(segments) {
  const flagged = [];
  for (const seg of segments) {
    for (const token of seg.tokens) {
      const word = token.text.toLowerCase().replace(/[^a-z']/g, '');
      if (!word) continue;
      for (const cat of CATEGORIES) {
        if (cat.test(word)) {
          flagged.push({
            word: token.text.trim(),
            category: cat.key,
            categoryLabel: cat.label,
            fromMs: token.fromMs,
            prob: token.prob,
            suspicion: typeof token.prob === 'number' && token.prob < WATCH_PROB_THRESHOLD ? 'watch' : 'aware',
          });
        }
      }
    }
  }

  const summary = {};
  for (const cat of CATEGORIES) {
    const items = flagged.filter((f) => f.category === cat.key);
    if (items.length === 0) continue;
    summary[cat.key] = {
      label: cat.label,
      count: items.length,
      watchCount: items.filter((i) => i.suspicion === 'watch').length,
    };
  }

  return { flagged, summary };
}

module.exports = { analyzeRisk, CATEGORIES };
