// 多篇阅读理解 PDF/文本 的启发式自动分割：按常见排版规律（PASSAGE标记/Questions标记/题号/选项字母）
// 把一份文档切成"文章+对应题目"的若干块。这是启发式规则，不保证100%准确——解析置信度低时
// 前端会展示手动分割界面，由用户按段落点或按页码范围自己调整。

const PASSAGE_MARKER_RE = /(?:READING\s+)?PASSAGE\s+(\d+)/i;
const QUESTIONS_MARKER_RE = /Questions?\s+(\d+)(?:\s*[-–to]+\s*(\d+))?/i;
const TFNG_HINT_RE = /TRUE,?\s*FALSE,?\s*(?:OR|\/)?\s*NOT\s*GIVEN|YES,?\s*NO,?\s*(?:OR|\/)?\s*NOT\s*GIVEN/i;
const MC_OPTION_RE = /^[A-D][.)]\s+/;
const QUESTION_NUM_RE = /^(\d{1,2})[.)]\s+(.*)/;

function splitIntoPassageBlocks(fullText) {
  const matches = [...fullText.matchAll(new RegExp(PASSAGE_MARKER_RE, 'gi'))];
  if (matches.length === 0) return [{ marker: null, text: fullText }];
  const blocks = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : fullText.length;
    blocks.push({ marker: matches[i][1], text: fullText.slice(start, end) });
  }
  return blocks;
}

function extractTitle(passageBody, fallbackIndex) {
  const lines = passageBody
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  // 跳过 "READING PASSAGE N" 这一行本身
  const candidates = lines.filter((l) => !PASSAGE_MARKER_RE.test(l));
  for (const line of candidates.slice(0, 5)) {
    const wordCount = line.split(/\s+/).length;
    if (wordCount >= 2 && wordCount <= 12 && !/[.;:]$/.test(line)) {
      return line;
    }
  }
  return `第${fallbackIndex}篇`;
}

function splitBodyAndQuestions(blockText) {
  const qMatch = blockText.match(QUESTIONS_MARKER_RE);
  if (!qMatch) return { body: blockText, questionsText: '' };
  return {
    body: blockText.slice(0, qMatch.index),
    questionsText: blockText.slice(qMatch.index),
  };
}

function preambleLooksLikeTfng(text) {
  if (TFNG_HINT_RE.test(text)) return true;
  const hasTrue = /\bTRUE\b/i.test(text);
  const hasFalse = /\bFALSE\b/i.test(text);
  const hasYes = /\bYES\b/i.test(text);
  const hasNo = /\bNO\b/i.test(text);
  const hasNotGiven = /\bNOT\s*GIVEN\b/i.test(text);
  return hasNotGiven && ((hasTrue && hasFalse) || (hasYes && hasNo));
}

function parseQuestions(questionsText) {
  if (!questionsText.trim()) return [];
  const lines = questionsText.split('\n');
  const firstQuestionIdx = lines.findIndex((l) => QUESTION_NUM_RE.test(l.trim()));
  const preamble = firstQuestionIdx === -1 ? questionsText : lines.slice(0, firstQuestionIdx).join('\n');
  let sectionIsTfng = preambleLooksLikeTfng(preamble);

  const questions = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (TFNG_HINT_RE.test(line)) {
      sectionIsTfng = true;
      continue;
    }
    if (QUESTIONS_MARKER_RE.test(line) && !QUESTION_NUM_RE.test(line)) {
      // 新的 "Questions X-Y" 段落标题，重新判断这一段是不是T/F/NG（后面紧跟的说明文字会再触发上面那行的检测）
      continue;
    }

    const numMatch = line.match(QUESTION_NUM_RE);
    if (numMatch) {
      if (current) questions.push(finalizeQuestion(current, sectionIsTfng));
      current = { number: Number(numMatch[1]), promptLines: [numMatch[2]], optionLines: [] };
      continue;
    }

    if (!current) continue;

    if (MC_OPTION_RE.test(line)) {
      current.optionLines.push(line);
    } else {
      current.promptLines.push(line);
    }
  }
  if (current) questions.push(finalizeQuestion(current, sectionIsTfng));
  return questions;
}

function finalizeQuestion(q, sectionIsTfng) {
  const prompt = q.promptLines.join(' ').trim();
  if (q.optionLines.length >= 2) {
    return {
      number: q.number,
      type: 'multiple_choice',
      prompt,
      options: q.optionLines.map((l) => l.trim()),
    };
  }
  if (sectionIsTfng) {
    return { number: q.number, type: 'true_false_ng', prompt, options: ['TRUE', 'FALSE', 'NOT GIVEN'] };
  }
  return { number: q.number, type: 'short_answer', prompt, options: null };
}

// PDF按行提取出来的文本，一个自然段会被拆成好几行(每行是PDF里的一个视觉行，不是段落)。
// 按"空行"找真正的段落边界，段落内部的换行只是排版折行，应该拼回一句话再用空格连接。
function reflowParagraphs(text, excludeLines) {
  return text
    .split(/\n\s*\n/)
    .map((para) =>
      para
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !excludeLines.includes(l))
        .join(' ')
    )
    .filter(Boolean)
    .join('\n\n');
}

function parseReadingDocument(fullText) {
  const blocks = splitIntoPassageBlocks(fullText);
  const passages = blocks.map((block, i) => {
    const { body, questionsText } = splitBodyAndQuestions(block.text);
    const title = extractTitle(body, i + 1);
    const passageText = reflowParagraphs(body.replace(PASSAGE_MARKER_RE, ''), [title]);
    const questions = parseQuestions(questionsText);
    return { title, passageText, questions };
  });

  const hasIssues =
    passages.length === 0 ||
    passages.some((p) => p.questions.length === 0 || p.passageText.trim().length < 50);

  return {
    passages,
    confidence: hasIssues ? 'low' : 'high',
  };
}

module.exports = { parseReadingDocument };
