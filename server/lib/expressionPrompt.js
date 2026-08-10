// 跟bandRubrics.js里写作评分prompt的精简原则一致：alternatives/example_sentence题库里已经有了，
// 不用每次问AI要，judge只需要判断用户写的对不对、错在哪，省token。
function buildPhraseGradingPrompt({ chinese, userAnswer, standard }) {
  return `You are an IELTS writing coach. A student is translating a Chinese phrase into an advanced English collocation.

Chinese phrase: "${chinese}"
Reference (one acceptable standard answer, not the only correct one): "${standard}"
Student's answer: "${userAnswer}"

Judge leniently: the student does NOT need to match the reference word-for-word. If the meaning is accurate and the collocation/grammar is natural English, it counts as correct even if phrased differently from the reference.

Important output language rule:
- The English answers/collocations should stay in English.
- All explanations for the student must be written in concise Chinese.
- Keep feedback short: one Chinese sentence, ideally under 35 Chinese characters.

Respond with ONLY this JSON object, no markdown fences:
{
  "result": "correct" | "partial" | "wrong",
  "errorType": "preposition" | "collocation" | "spelling" | "grammar" | "word_choice" | null,
  "feedback": "<1 short Chinese sentence explaining the judgment; if wrong/partial, say specifically what is off>"
}`;
}

function buildSentenceGradingPrompt({ chinese, userTranslation, standard }) {
  return `You are an IELTS writing coach. A student is translating a Chinese sentence into English at IELTS band 6.5-7.5 level.

Chinese sentence: "${chinese}"
Reference translation (one acceptable version, not the only correct one): "${standard}"
Student's translation: "${userTranslation}"

Judge leniently on wording — the student does not need to match the reference exactly. Judge on three dimensions: whether the meaning is fully and accurately conveyed (accuracy), whether the expression level is sophisticated or just plain/basic (expression), and any concrete grammar errors (grammar).

Then write two upgraded rewrites of the student's own translation: one at a realistic band 7 level, one at a realistic band 8+ level. Keep the same meaning, just elevate the vocabulary/sentence structure.

Finally, pick out 2-4 words/phrases from the reference translation and the two upgraded rewrites that a Chinese IELTS learner below band 7 is likely NOT to know well (advanced vocabulary, less common collocations) — skip basic words. For each, give its Chinese meaning and a very short usage note.

Important output language rule:
- The reference translation and upgraded rewrites should stay in English.
- accuracy_note, expression_note, grammar fix explanations, vocab chinese, and vocab usage must be concise Chinese.
- Keep accuracy_note and expression_note to one Chinese sentence each, ideally under 35 Chinese characters.
- grammar_errors should include at most 2 concrete errors. If there are no important errors, return [].
- vocab usage should be under 22 Chinese characters.

Respond with ONLY this JSON object, no markdown fences:
{
  "result": "correct" | "partial" | "wrong",
  "errorType": "preposition" | "collocation" | "spelling" | "grammar" | "sentence_pattern" | null,
  "accuracy_note": "<1 short Chinese sentence>",
  "expression_note": "<1 short Chinese sentence>",
  "grammar_errors": [ { "error": "<exact quote from student's translation>", "fix": "<corrected version>" } ],
  "band7_upgrade": "<full sentence>",
  "band8_upgrade": "<full sentence>",
  "vocabNotes": [ { "word": "<word or short phrase, as it appears in the text above>", "chinese": "<Chinese meaning>", "usage": "<short usage note in Chinese>" } ]
}`;
}

// 词组的standard/alternatives是题库里固定的静态文本，跟用户答案无关——
// 这个生词解释只用算一次，算完缓存到item.content.glossary上，以后同一题不用再问AI。
function buildGlossaryPrompt({ standard, alternatives }) {
  const phrases = [standard, ...(alternatives || [])].join('; ');
  return `These are advanced IELTS English collocations: "${phrases}"

Pick out 2-4 words/phrases in them that a Chinese IELTS learner below band 7 is likely NOT to know well (skip basic words). For each, give its Chinese meaning and a short usage note in Chinese (e.g. register, common collocations).

Keep each usage note under 22 Chinese characters.

Respond with ONLY this JSON object, no markdown fences:
{
  "vocabNotes": [ { "word": "<word or short phrase, exactly as it appears above>", "chinese": "<Chinese meaning>", "usage": "<short usage note in Chinese>" } ]
}`;
}

function buildAutofillPrompt({ type, chinese, standard }) {
  if (type === 'phrase') {
    return `An IELTS student added a Chinese phrase with their own English translation to a personal practice bank.

Chinese: "${chinese}"
Their English answer: "${standard}"

Respond with ONLY this JSON object, no markdown fences:
{
  "alternatives": ["<2-3 other natural advanced phrasings with the same meaning>"],
  "example_sentence": "<one natural IELTS-style sentence using the phrase>",
  "category": "<one of: 动词词组, 句式, 观点, 让步转折, 数据描述>",
  "difficulty": "medium" | "hard",
  "band_target": <number, 6.5-8>
}`;
  }
  return `An IELTS student added a Chinese sentence with their own English translation to a personal practice bank.

Chinese: "${chinese}"
Their English translation: "${standard}"

Respond with ONLY this JSON object, no markdown fences:
{
  "category": "<one of: 议论句, 让步句, 原因结果句, 举例, 数据句>",
  "difficulty": "medium" | "hard",
  "band_target": <number, 6.5-8>
}`;
}

module.exports = { buildPhraseGradingPrompt, buildSentenceGradingPrompt, buildAutofillPrompt, buildGlossaryPrompt };
