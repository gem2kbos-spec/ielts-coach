// 跨模块弱点聚合：写作的中式表达(chinglish)+口语的发音风险词+表达训练里反复答错/半对的题，
// 散落在各自attempt里从来没汇总过。按"反复出现"算频率——同一个表达/同一个词/同一道题
// 出现的次数越多，越值得专门复盘。纯函数部分(aggregateWeakness)只吃已经解析好的行数据，
// 方便单测；DB查询(以及给expressionRows补item内容)单独包一层。
function aggregateWeakness({ writingRows, speakingRows, expressionRows, vocabRows }) {
  const chinglishMap = new Map();
  for (const row of writingRows) {
    for (const c of row.score?.chinglish || []) {
      if (!c.phrase) continue;
      const key = c.phrase.toLowerCase().trim();
      if (!chinglishMap.has(key)) {
        chinglishMap.set(key, { phrase: c.phrase, issue: c.issue, suggestion: c.suggestion, count: 0, lastSeen: row.created_at });
      }
      const entry = chinglishMap.get(key);
      entry.count += 1;
      if (row.created_at > entry.lastSeen) entry.lastSeen = row.created_at;
    }
  }

  const pronMap = new Map();
  for (const row of speakingRows) {
    for (const f of row.rawResponse?.riskFlagged || []) {
      if (!f.word) continue;
      const key = `${f.word.toLowerCase()}:${f.category}`;
      if (!pronMap.has(key)) {
        pronMap.set(key, { word: f.word, category: f.category, categoryLabel: f.categoryLabel, count: 0, lastSeen: row.created_at });
      }
      const entry = pronMap.get(key);
      entry.count += 1;
      if (row.created_at > entry.lastSeen) entry.lastSeen = row.created_at;
    }
  }

  const expressionMap = new Map();
  for (const row of expressionRows || []) {
    if (!row.item || row.score?.result === 'correct') continue; // 完全正确的不算弱点，跳过
    const key = row.item.id;
    if (!expressionMap.has(key)) {
      expressionMap.set(key, {
        itemId: row.item.id,
        chinese: row.item.content.chinese,
        standard: row.item.content.standard,
        type: row.item.subtype === 'phrase_drill' ? 'phrase' : 'sentence',
        errorTypes: new Set(),
        count: 0,
        lastSeen: row.created_at,
      });
    }
    const entry = expressionMap.get(key);
    entry.count += 1;
    for (const tag of row.errorTags || []) entry.errorTypes.add(tag);
    if (row.created_at > entry.lastSeen) entry.lastSeen = row.created_at;
  }

  return {
    chinglish: [...chinglishMap.values()].sort((a, b) => b.count - a.count),
    pronunciation: [...pronMap.values()].sort((a, b) => b.count - a.count),
    expressionMistakes: [...expressionMap.values()]
      .map((e) => ({ ...e, errorTypes: [...e.errorTypes] }))
      .sort((a, b) => b.count - a.count),
    vocab: vocabRows || [],
  };
}

module.exports = { aggregateWeakness };
