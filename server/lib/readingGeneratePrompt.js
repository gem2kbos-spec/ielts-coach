const QUESTION_TYPE_GUIDE = {
  true_false_ng: 'True/False/Not Given statements with IELTS-style distinction: TRUE if the statement agrees with the passage, FALSE if it contradicts it, NOT GIVEN if the information is not stated.',
  multiple_choice: 'Multiple choice (one correct answer from 4 options, label options A/B/C/D). Distractors must be plausible but clearly wrong from the passage.',
  short_answer: 'Short answer with a clear IELTS word limit, e.g. NO MORE THAN TWO WORDS AND/OR A NUMBER. Answers should be copied from the passage whenever possible.',
  sentence_completion: 'Sentence completion with a clear IELTS word limit, e.g. NO MORE THAN TWO WORDS. The completed sentence must be grammatically natural.',
  summary_completion: 'Summary completion with a clear IELTS word limit, e.g. NO MORE THAN TWO WORDS. Each question is ONE numbered blank within a short summary of part of the passage; the prompt field should contain that blank in context, e.g. "...the report concluded that the main factor was ___.")',
  matching_heading: 'Matching headings (prompt is "Paragraph X", options are a shared list of candidate headings labeled i/ii/iii/iv/v..., correct_answer is the heading label)',
  matching_information: 'Matching information (prompt is a statement, options are the paragraph letters A/B/C/D/E available in this passage, correct_answer is the paragraph letter that contains that information)',
  table_completion: 'Note/table completion with a clear IELTS word limit, e.g. NO MORE THAN TWO WORDS AND/OR A NUMBER. Simplified as one blank per question; prompt describes the field being completed, e.g. "Year established: ___".',
};

const DIFFICULTY_GUIDE = {
  easy: 'Band 5-6 level: common vocabulary, straightforward sentence structure, answers are easy to locate, minimal distractors.',
  medium: 'Band 6.5-7 level: some less common vocabulary, a mix of sentence complexity, a moderate number of distractor phrases that require careful reading.',
  hard: 'Band 7.5-8+ level: academic/less frequent vocabulary, long and complex sentences (multiple subordinate clauses), questions include classic IELTS traps (near-synonym distractors, partial matches, scope shifts).',
};

const TOPIC_POOL = [
  '科技与人工智能', '气候变化与环境保护', '历史与考古发现', '社会与城市化',
  '医学与公共卫生', '建筑与城市规划', '心理学与行为科学', '教育与学习方式',
  '海洋生物与生态', '太空探索', '经济与全球化', '动物行为与保护',
];

function buildReadingGeneratePrompt({ difficulty, topic, questionTypes, extraRequirements, weakTypes, reinforcementWords }) {
  const resolvedDifficulty = difficulty || 'medium';
  const resolvedTopic = topic?.trim() || `(randomly pick one IELTS-typical topic, e.g. ${TOPIC_POOL[Math.floor(Math.random() * TOPIC_POOL.length)]})`;

  let typesToUse = questionTypes?.length ? questionTypes : null;
  if (!typesToUse && weakTypes?.length) {
    typesToUse = weakTypes;
  }
  const typeInstruction = typesToUse
    ? `Bias the 13 questions toward these types (use them more, but you may include a couple of other types for realism): ${typesToUse
        .map((t) => `${t} (${QUESTION_TYPE_GUIDE[t] || t})`)
        .join('; ')}.`
    : `Mix question types realistically the way a real IELTS Academic Reading passage would (a real passage typically combines 2-4 different types from this list): ${Object.entries(
        QUESTION_TYPE_GUIDE
      )
        .map(([k, v]) => `${k} (${v})`)
        .join('; ')}.`;

  const vocabInstruction = reinforcementWords?.length
    ? `Naturally weave these words into the passage where they fit the topic (do not force all of them if some don't fit naturally, but use as many as you reasonably can): ${reinforcementWords.join(', ')}. List which of them you actually used in "injected_vocab".`
    : 'No specific vocabulary needs to be injected. Return an empty array for "injected_vocab".';

  return `You are an IELTS Academic Reading test writer. Generate ONE complete reading passage with questions, matching the style, length and difficulty of a real Cambridge IELTS Academic Reading passage.

Requirements:
- Length: the passage body MUST be 650-900 words in total (count carefully — this is a hard requirement, not a suggestion; aim for at least 700 to be safe), organised into 3-5 paragraphs of roughly 150-220 words each.
- Topic: ${resolvedTopic}.
- Difficulty: ${resolvedDifficulty} — ${DIFFICULTY_GUIDE[resolvedDifficulty]}
- Exactly 13 questions, numbered 1-13.
- ${typeInstruction}
- ${vocabInstruction}
${extraRequirements ? `- Additional requirement from the user: ${extraRequirements}` : ''}
- Write questions as a real IELTS Academic Reading test would: no vague school-exam wording, no trivia questions, no questions that can be answered without reading the passage, and no answers that require outside knowledge.
- Every question must include a complete candidate-facing instruction in "instructions". This is mandatory. The instruction must make the task clear without assuming the student knows the question type.
- For completion and short-answer types, the instruction MUST include the word limit exactly, using real IELTS wording such as "Choose NO MORE THAN TWO WORDS from the passage..." or "Write NO MORE THAN TWO WORDS AND/OR A NUMBER...".
- Completion answers must obey their stated word limit. If you say NO MORE THAN TWO WORDS, the correct_answer must be 1-2 words; if you include AND/OR A NUMBER, numbers are allowed.
- Use 2-4 contiguous question groups where possible, as Cambridge IELTS does. Questions in the same group should share the same "instructions" text.
- Question order should broadly follow the passage order for completion, short answer, T/F/NG and multiple choice. Matching headings/information may scan the whole passage.
- Distractors should use paraphrase, scope shifts, contrast, or partial matches. They must not be absurd or obviously unrelated.
- Use academic but natural IELTS vocabulary. Avoid over-specialised jargon unless it is clearly explained by context.
- Every question needs a brief explanation (1-2 sentences, in Chinese, citing where in the passage the answer comes from) for the answer key.
- Segment the passage into lettered paragraphs (A, B, C, ...) — this is required even if no matching-type questions are used.
- For "matching_heading" questions: provide a shared bank of headings (more headings than paragraphs, labeled i, ii, iii, ...) as the "options" for EACH such question (same list repeated), with the correct one being the heading label.
- For "matching_information" questions: "options" should be the paragraph letters actually used in this passage (e.g. ["A","B","C","D","E"]).
- For "multiple_choice": "options" must be exactly 4 entries formatted as "A. ...", "B. ...", "C. ...", "D. ...", and "correct_answer" is just the letter.
- For "true_false_ng": "options" must be exactly ["TRUE","FALSE","NOT GIVEN"].
- For "short_answer" / "sentence_completion" / "summary_completion" / "table_completion": "options" must be null.

Respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "title": "<passage title>",
  "difficulty_tag": "easy" | "medium" | "hard",
  "topic_tag": "<short topic label in Chinese, e.g. 科技与人工智能>",
  "passage_paragraphs": [ { "letter": "A", "text": "<paragraph text>" }, ... ],
  "injected_vocab": ["<word actually used>", ...],
  "questions": [
    {
      "number": <1-13>,
      "type": "true_false_ng" | "multiple_choice" | "short_answer" | "sentence_completion" | "summary_completion" | "matching_heading" | "matching_information" | "table_completion",
      "instructions": "<complete IELTS-style instruction shown to the candidate, including word limit where relevant>",
      "prompt": "<question text>",
      "options": [...] | null,
      "correct_answer": "<answer>",
      "explanation": "<1-2句中文解析>"
    }
  ]
}`;
}

module.exports = { buildReadingGeneratePrompt, QUESTION_TYPE_GUIDE, DIFFICULTY_GUIDE, TOPIC_POOL };
