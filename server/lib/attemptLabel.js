// 历史记录列表要给每条attempt一个"看得懂的子类型标签"——同样是module='speaking'，
// 可能是Part1热身/Part2话题卡/Part3考官模式/完整流程综合，光看module分不出来，
// 得结合item的subtype + rawResponse里的特征字段(combined/history)才能判断。
// 纯函数，不查库，方便单测。
function getAttemptLabel({ module, item, rawResponse, score }) {
  if (module === 'writing') {
    if (item?.subtype === 'task1_chart') return { key: 'task1', label: 'Task 1' };
    if (item?.subtype === 'task2_argumentative') return { key: 'task2', label: 'Task 2' };
    return { key: 'writing_other', label: '写作' };
  }

  if (module === 'speaking') {
    if (rawResponse?.combined) return { key: 'full', label: '完整流程(综合)' };
    if (rawResponse?.history) return { key: 'examiner', label: 'Part 3 考官模式' };
    if (item?.subtype === 'part1_warmup') return { key: 'part1', label: 'Part 1' };
    if (item?.subtype === 'part2_cue_card') return { key: 'part2', label: 'Part 2' };
    return { key: 'speaking_other', label: '口语' };
  }

  if (module === 'reading') {
    const sourceLabel = item?.source === 'ai_generated' ? 'AI生成' : '真题导入';
    return { key: 'reading', label: `阅读 · ${sourceLabel}` };
  }

  if (module === 'listening') {
    if (score?.mock) return { key: 'mock', label: '全真模拟' };
    const section = item?.content?.section;
    return { key: 'section', label: section ? `听力 · ${section}` : '听力 · 单题' };
  }

  if (module === 'writing_expression') {
    if (item?.subtype === 'phrase_drill') return { key: 'phrase', label: '表达训练 · 词组' };
    if (item?.subtype === 'sentence_translation') return { key: 'sentence', label: '表达训练 · 句子翻译' };
    return { key: 'expression_other', label: '表达训练' };
  }

  return { key: module, label: module };
}

module.exports = { getAttemptLabel };
