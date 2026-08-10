const QUESTION_RE = /^(?:Q(?:uestion)?\s*)?(\d{1,3})\s*[.)、．:：-]\s*(.+)$/i;
const OPTION_RE = /^([A-H])\s*[.)、．:：-]\s*(.+)$/i;
const ANSWER_RE = /^(?:正确答案|参考答案|答案|answer|correct\s+answer)\s*[:：]\s*(.+)$/i;
const EXPLANATION_RE = /^(?:解析|讲解|explanation|rationale)\s*[:：]\s*(.*)$/i;
const TITLE_RE = /^(?:标题|题组|title)\s*[:：]\s*(.+)$/i;

function cleanAnswer(raw) {
  const value = String(raw || '').trim();
  const letter = value.match(/^([A-H])(?:\b|[.)、．])/i);
  return letter ? letter[1].toUpperCase() : value;
}

function parsePastedQuestionText(input) {
  const text = String(input || '').replace(/\r\n?/g, '\n').trim();
  if (!text) throw new Error('请先粘贴题目文字');
  if (text.length > 120_000) throw new Error('粘贴内容过长，请分批导入（单次最多约12万字符）');

  const lines = text.split('\n');
  const questions = [];
  const preamble = [];
  let title = '';
  let current = null;
  let explanationMode = false;

  const finish = () => {
    if (!current) return;
    current.prompt = current.promptLines.join(' ').replace(/\s+/g, ' ').trim();
    current.explanation = current.explanationLines.join(' ').replace(/\s+/g, ' ').trim() || null;
    delete current.promptLines;
    delete current.explanationLines;
    questions.push(current);
    current = null;
    explanationMode = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (explanationMode && current) current.explanationLines.push(' ');
      continue;
    }

    const titleMatch = line.match(TITLE_RE);
    if (!current && titleMatch) {
      title = titleMatch[1].trim();
      continue;
    }

    const questionMatch = line.match(QUESTION_RE);
    if (questionMatch) {
      finish();
      current = {
        number: Number(questionMatch[1]),
        type: 'short_answer',
        promptLines: [questionMatch[2]],
        options: [],
        correct_answer: '',
        explanationLines: [],
      };
      continue;
    }

    if (!current) {
      preamble.push(line);
      continue;
    }

    const optionMatch = line.match(OPTION_RE);
    if (optionMatch) {
      explanationMode = false;
      current.options.push(`${optionMatch[1].toUpperCase()}. ${optionMatch[2].trim()}`);
      current.type = 'multiple_choice';
      continue;
    }

    const answerMatch = line.match(ANSWER_RE);
    if (answerMatch) {
      explanationMode = false;
      current.correct_answer = cleanAnswer(answerMatch[1]);
      continue;
    }

    const explanationMatch = line.match(EXPLANATION_RE);
    if (explanationMatch) {
      explanationMode = true;
      if (explanationMatch[1]) current.explanationLines.push(explanationMatch[1]);
      continue;
    }

    if (explanationMode) current.explanationLines.push(line);
    else current.promptLines.push(line);
  }
  finish();

  if (questions.length === 0) {
    throw new Error('没有识别到题目。请用“1. 题干”或“Question 1: 题干”开始每道题');
  }

  const seenNumbers = new Set();
  const warnings = [];
  for (const q of questions) {
    if (!q.prompt) warnings.push(`第 ${q.number} 题缺少题干`);
    if (seenNumbers.has(q.number)) warnings.push(`题号 ${q.number} 重复`);
    seenNumbers.add(q.number);
    if (q.type === 'multiple_choice' && q.options.length < 2) warnings.push(`第 ${q.number} 题选项不足`);
    if (!q.correct_answer) warnings.push(`第 ${q.number} 题缺少答案`);
    if (q.type === 'multiple_choice' && q.correct_answer && !q.options.some((o) => o.startsWith(`${q.correct_answer}.`))) {
      warnings.push(`第 ${q.number} 题答案 ${q.correct_answer} 与选项不匹配`);
    }
    if (q.options.length === 0) q.options = null;
  }

  const passageText = preamble.join('\n\n').trim() || 'Imported practice question set.';
  return {
    title: title || `粘贴题库 · ${questions.length}题`,
    passageText,
    questions,
    warnings,
    canImport: warnings.length === 0,
  };
}

module.exports = { parsePastedQuestionText };
