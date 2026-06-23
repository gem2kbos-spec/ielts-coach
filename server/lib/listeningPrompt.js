// 听力跟阅读不一样：AI 拿不到音频本身，没法像阅读那样直接从原文反推答案。
// 只有当用户提供了transcript(听力原文)时，才能让AI基于transcript给参考答案建议；
// 没有transcript就只能让用户在预览阶段手动填答案。
function buildListeningAnswerKeyPrompt({ transcript, questions }) {
  const questionsBlock = questions
    .map((q) => {
      const optionsLine = q.options ? `\nOptions: ${q.options.join(' | ')}` : '';
      const countLine = q.expectedCount ? `\n(Choose exactly ${q.expectedCount} correct options)` : '';
      return `Q${q.number} (${q.type}): ${q.prompt}${optionsLine}${countLine}`;
    })
    .join('\n\n');

  return `You are an IELTS Listening answer key generator. You are given the listening transcript (what was said in the audio) and the question booklet. Determine the correct answer for each question, exactly as an official answer key would.

Transcript:
"""
${transcript}
"""

Questions:
${questionsBlock}

Rules:
- For type "multiple_choice" or "matching": answer must be exactly one option letter.
- For type "multiple_select": answer must be a JSON array of exactly the required number of option letters, e.g. ["B","D"].
- For type "fill_blank" or "map_label": answer should be the shortest exact word(s)/number from the transcript that correctly completes the blank/label (usually 1-3 words, matching official IELTS conventions).
- If you are genuinely unsure, still give your best answer but set "confidence" to "low".

Respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "answers": [
    { "number": <question number>, "correct_answer": "<answer or array for multiple_select>", "confidence": "high" | "low" }
  ]
}`;
}

function buildListeningErrorTagPrompt({ transcript, wrongAnswers }) {
  const block = wrongAnswers
    .map(
      (w) =>
        `Q${w.number}: "${w.prompt}"\nCorrect answer: ${JSON.stringify(w.correctAnswer)}\nStudent's answer: ${JSON.stringify(w.userAnswer) || '(left blank)'}`
    )
    .join('\n\n');

  const transcriptBlock = transcript
    ? `Transcript:\n"""\n${transcript}\n"""\n\n`
    : '(No transcript available — judge from the question text alone.)\n\n';

  return `You are an IELTS Listening tutor analysing a student's mistakes.

${transcriptBlock}The student got these questions wrong:
${block}

For each mistake, decide which ONE category best explains it, from this fixed list:
- careless: likely mis-heard a clearly-stated detail despite generally understanding, or a simple transcription slip
- vocab_gap: likely didn't know a key word spoken in the audio
- logic_misread: likely misunderstood the logical relationship (e.g. picked the option mentioned first instead of the one corrected later, missed a negation)
- time_pressure: the answer comes very late in the section / requires sustained attention, suggesting the student may have fallen behind
- trap_distractor: classic IELTS listening trap — the audio mentions a plausible-sounding wrong option before correcting itself or giving the real answer

Respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "tags": ["<unique categories that appeared, from the fixed list above>"],
  "per_question": [ { "number": <number>, "tag": "<one category>", "reason": "<1 short sentence>" } ]
}`;
}

module.exports = { buildListeningAnswerKeyPrompt, buildListeningErrorTagPrompt };
