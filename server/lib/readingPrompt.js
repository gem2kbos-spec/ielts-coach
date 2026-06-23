function buildAnswerKeyPrompt({ title, passageText, questions }) {
  const questionsBlock = questions
    .map((q) => {
      const optionsLine = q.options ? `\nOptions: ${q.options.join(' | ')}` : '';
      return `Q${q.number} (${q.type}): ${q.prompt}${optionsLine}`;
    })
    .join('\n\n');

  return `You are an IELTS Reading answer key generator. Read the passage and determine the correct answer for each question below, exactly as an official answer key would.

Passage title: "${title}"
Passage:
"""
${passageText}
"""

Questions:
${questionsBlock}

Rules:
- For type "true_false_ng": answer must be exactly "TRUE", "FALSE", or "NOT GIVEN".
- For type "multiple_choice": answer must be exactly one option letter (e.g. "A", "B", "C", or "D" — just the letter, no period).
- For type "short_answer": answer should be the shortest exact word(s)/number copied directly from the passage that correctly completes/answers the question (usually 1-3 words, matching official IELTS short-answer conventions).
- If you are genuinely unsure, still give your best answer but set "confidence" to "low".

Respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "answers": [
    { "number": <question number>, "correct_answer": "<answer>", "confidence": "high" | "low" }
  ]
}`;
}

function buildReadingErrorTagPrompt({ title, passageText, wrongAnswers }) {
  const block = wrongAnswers
    .map(
      (w) =>
        `Q${w.number}: "${w.prompt}"\nCorrect answer: ${w.correctAnswer}\nStudent's answer: ${w.userAnswer || '(left blank)'}`
    )
    .join('\n\n');

  return `You are an IELTS Reading tutor analysing a student's mistakes. Passage title: "${title}".

Passage:
"""
${passageText}
"""

The student got these questions wrong:
${block}

For each mistake, decide which ONE category best explains it, from this fixed list:
- careless: the answer was findable easily but the student likely misread/mis-clicked despite understanding the passage
- vocab_gap: the mistake likely stems from not knowing a key word/phrase in the passage or question
- logic_misread: the student likely misunderstood the logical relationship (e.g. confused TRUE for NOT GIVEN, missed a negation, misread a comparison)
- time_pressure: the question is near the end of a long passage / requires significant scanning, suggesting the student may have rushed
- trap_distractor: the question contains a classic IELTS trap (a distractor phrase in the passage that closely resembles but contradicts/doesn't fully match the correct answer)

Respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "tags": ["<unique categories that appeared, from the fixed list above>"],
  "per_question": [ { "number": <number>, "tag": "<one category>", "reason": "<1 short sentence>" } ]
}`;
}

module.exports = { buildAnswerKeyPrompt, buildReadingErrorTagPrompt };
