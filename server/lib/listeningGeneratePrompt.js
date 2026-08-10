const SECTION_PROFILES = {
  S1: 'a practical everyday conversation between two people, such as booking, accommodation, transport, courses, or local services',
  S2: 'a monologue or guided talk in a social or public context, such as a museum, community centre, park, workplace induction, or local event',
  S3: 'an academic discussion between two or three speakers, such as students planning research, talking with a tutor, or evaluating a project',
  S4: 'an academic lecture by one speaker on a clear study topic, with a structured explanation and precise terminology',
};

const DIFFICULTY_RULES = {
  easy: 'Band 5.5-6.0: clear signposting, common vocabulary, short distractors, answers close to the spoken wording.',
  medium: 'Band 6.5-7.0: natural paraphrase, some distractors and corrections, moderate academic or practical vocabulary.',
  hard: 'Band 7.5-8.0: dense paraphrase, multi-step distractors, corrections, qualifications, and less predictable lexical choices.',
};

const SECTION_TASK_RULES = {
  S1: `S1 task logic:
- Make it a practical two-person transaction.
- Prefer form/note/table completion with names, dates, prices, phone numbers, addresses, opening times and short noun phrases.
- Include natural corrections, spelling, changed plans and near-miss numbers.
- Most answers should be one or two words and/or a number.`,
  S2: `S2 task logic:
- Make it one main speaker in a public/social setting.
- Use a realistic sequence such as tour route, facility description, event programme, safety briefing or local service explanation.
- Include at least one set of options or a map/plan-style labelling task when the topic allows.
- Distractors should come from locations, order of visit, restrictions, times and eligibility.`,
  S3: `S3 task logic:
- Make it two students or students plus a tutor discussing academic work.
- Use planning, evaluating, comparing methods, deciding responsibilities, interpreting feedback or research design.
- Include multiple choice/matching alongside completion.
- Distractors should come from rejected ideas, tutor corrections, changed priorities and paraphrased academic language.`,
  S4: `S4 task logic:
- Make it a single academic lecture with clear sections and signposting.
- Use notes/summary completion as the main format, with terminology explained naturally in the lecture.
- Answers should test paraphrase and precise academic vocabulary, not random trivia.
- Distractors should come from contrasts, exceptions, causes/effects and qualified claims.`,
};

function buildListeningGeneratePrompt({ section = 'S2', topic, difficulty = 'medium', extraRequirements }) {
  const profile = SECTION_PROFILES[section] || SECTION_PROFILES.S2;
  const level = DIFFICULTY_RULES[difficulty] || DIFFICULTY_RULES.medium;
  const sectionRules = SECTION_TASK_RULES[section] || SECTION_TASK_RULES.S2;
  const topicLine = topic?.trim()
    ? `Topic/domain to use: ${topic.trim()}`
    : 'Choose a realistic IELTS Listening topic that is not overused.';
  const extraLine = extraRequirements?.trim()
    ? `Additional requirements from the teacher: ${extraRequirements.trim()}`
    : 'No additional teacher requirements.';

  return `You are an expert IELTS Listening test writer. Generate ONE original IELTS-style Listening section. Do not copy any real published IELTS/Cambridge/British Council/IDP material. The content must be newly written.

Section: ${section}
Profile: ${profile}
Difficulty: ${level}
${topicLine}
${extraLine}

${sectionRules}

Quality requirements:
- Create exactly 10 questions, numbered 1-10.
- The audio transcript must sound like real IELTS Listening, with natural spoken English, turn-taking when appropriate, and clear answer-bearing moments.
- Include realistic distractors: changed plans, corrected dates/times, rejected options, paraphrase, and near-matches.
- Use IELTS-style task types only: fill_blank, multiple_choice, multiple_select, matching, map_label.
- Do not overuse multiple choice. The section should feel like a real IELTS section, not a generic quiz.
- Question prompts must be self-contained. For completion tasks, include the exact word limit in the prompt, such as "NO MORE THAN TWO WORDS AND/OR A NUMBER".
- Fill-blank questions must include explicit instructions in the prompt text when a word limit matters, e.g. "NO MORE THAN TWO WORDS AND/OR A NUMBER".
- Multiple-choice options must be labeled "A. ...", "B. ...", "C. ...".
- Multiple-select questions must say exactly how many answers to choose and set expectedCount accordingly.
- Answers must be unambiguous from the transcript.
- Keep answer order aligned with transcript order.
- Keep the transcript around 650-900 words for S1/S2/S3, and 750-1000 words for S4.
- The transcript should be readable by text-to-speech; include speaker labels like "Man:", "Woman:", "Tutor:", "Student A:" only when useful.

Return strict JSON only:
{
  "title": "short section title",
  "section": "${section}",
  "defaultDurationSec": 600,
  "transcript": "complete audio script",
  "questions": [
    {
      "number": 1,
      "type": "fill_blank | multiple_choice | multiple_select | matching | map_label",
      "prompt": "question text or note line",
      "options": null,
      "expectedCount": null,
      "correct_answer": "answer or [\"A\",\"C\"] for multi-select",
      "explanation": "brief evidence from transcript"
    }
  ]
}`;
}

module.exports = { buildListeningGeneratePrompt };
