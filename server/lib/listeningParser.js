// 听力题目文档(pdf/txt提取出的逐页文本)的启发式解析：识别填空/单选/多选/匹配/地图标注题。
// 跟阅读的parser同源思路(按题号/选项规律识别)，但听力文件本身就是"一个section"，不用切分多篇文章；
// 额外要按页追踪"地图/示意图"题出现在哪一页，方便直接把那一页截图当参考图。

const QUESTION_NUM_RE = /^(\d{1,2})[.)]\s+(.*)/;
const MC_OPTION_RE = /^[A-H][.)]\s+/;
const QUESTIONS_HEADER_RE = /^Questions?\s+\d+/i;
const MULTI_SELECT_RE = /choose\s+(TWO|THREE|2|3)\s+(letters?|answers?)/i;
const MATCHING_RE = /match\s+(each|the)\s+.*\s+with/i;
const MAP_HINT_RE = /\bmap\b|\bplan\b|\bdiagram\b|地图|示意图|平面图|label the/i;
// 指令行的常见起手词——这些行只用来设置"接下来题目是什么类型"，本身不算进任何题目的正文
const INSTRUCTION_LINE_RE = /^(Complete|Choose|Label|Write|Match|Do the following)\b/i;

function isInstructionLine(line) {
  return (
    QUESTIONS_HEADER_RE.test(line) ||
    INSTRUCTION_LINE_RE.test(line) ||
    MULTI_SELECT_RE.test(line) ||
    MATCHING_RE.test(line) ||
    MAP_HINT_RE.test(line)
  );
}

function finalizeQuestion(q, flags) {
  const prompt = q.promptLines.join(' ').trim();
  const options = q.optionLines.length ? q.optionLines.map((l) => l.trim()) : null;

  // multiSelectCount优先于"有没有选项"判断——多选题本身也带字母选项，
  // 但需要的是"选N个"而不是单选
  if (flags.multiSelectCount) {
    return { number: q.number, type: 'multiple_select', prompt, options, expectedCount: flags.multiSelectCount, page: q.page };
  }
  if (options && options.length >= 2) {
    return {
      number: q.number,
      type: flags.isMatching ? 'matching' : 'multiple_choice',
      prompt,
      options,
      page: q.page,
    };
  }
  if (flags.isMap) {
    return { number: q.number, type: 'map_label', prompt, options: null, page: q.page };
  }
  return { number: q.number, type: 'fill_blank', prompt, options: null, page: q.page };
}

// 在每一页文本里独立解析题目(听力题目文件一般就1-2页，不用像阅读那样切分多篇文章)
function parsePageQuestions(pageText, pageNumber) {
  const lines = pageText.split('\n');
  const questions = [];
  let current = null;
  let flags = { multiSelectCount: null, isMatching: false, isMap: false };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const numMatch = line.match(QUESTION_NUM_RE);
    if (numMatch) {
      if (current) questions.push(finalizeQuestion(current, flags));
      current = { number: Number(numMatch[1]), promptLines: [numMatch[2]], optionLines: [], page: pageNumber };
      continue;
    }

    if (QUESTIONS_HEADER_RE.test(line)) {
      // 新的 "Questions X-Y" 段落开始：先用旧flags收尾上一题，再重置题型推断
      if (current) {
        questions.push(finalizeQuestion(current, flags));
        current = null;
      }
      flags = { multiSelectCount: null, isMatching: false, isMap: false };
      continue;
    }
    if (isInstructionLine(line)) {
      // 指令行可能出现在"上一题已经开始累计、下一题还没出现数字"的中间地带，
      // 必须先用旧flags把上一题收尾，再更新flags给后面的题用，否则上一题会被误判成新题型
      if (current) {
        questions.push(finalizeQuestion(current, flags));
        current = null;
      }
      if (MULTI_SELECT_RE.test(line)) flags.multiSelectCount = /THREE|3/i.test(line) ? 3 : 2;
      if (MATCHING_RE.test(line)) flags.isMatching = true;
      if (MAP_HINT_RE.test(line)) flags.isMap = true;
      continue;
    }

    if (!current) continue;

    if (MC_OPTION_RE.test(line)) {
      current.optionLines.push(line);
    } else {
      current.promptLines.push(line);
    }
  }
  if (current) questions.push(finalizeQuestion(current, flags));
  return questions;
}

function parseListeningDocument(pages) {
  const allQuestions = [];
  for (let i = 0; i < pages.length; i += 1) {
    allQuestions.push(...parsePageQuestions(pages[i], i + 1));
  }

  const mapQuestion = allQuestions.find((q) => q.type === 'map_label');
  const mapPageGuess = mapQuestion ? mapQuestion.page : null;

  const confidence = allQuestions.length > 0 ? 'high' : 'low';
  return { questions: allQuestions, mapPageGuess, confidence };
}

module.exports = { parseListeningDocument };
