function buildWritingTask2Prompt({ prompt, essayType, essayText }) {
  return `You are an experienced IELTS Writing examiner. Score the following Task 2 essay strictly against the official IELTS Writing Task 2 band descriptors (0-9 scale, 0.5 increments) on four criteria: Task Achievement (TA), Coherence and Cohesion (CC), Lexical Resource (LR), Grammatical Range and Accuracy (GRA).

Essay question (type: ${essayType}):
"""
${prompt}
"""

Student's essay:
"""
${essayText}
"""

Also flag any Chinglish / clichéd formulaic expressions overused by Chinese IELTS candidates, e.g. "With the development of...", "Every coin has two sides", "As is known to all", "Nowadays, with the rapid development of society", literal Chinese-to-English translations, or unnatural collocations. For each, quote the exact phrase from the essay, explain why it reads as Chinglish/cliché, and suggest a more natural alternative.

Then rewrite the ENTIRE essay twice: once as a realistic band 7 version (clear, mostly accurate, some minor issues remain, around 250-280 words), and once as a realistic band 9 version (sophisticated, natural, fully developed, around 280-320 words). Keep the same stance/ideas as the student where reasonable, but improve execution. The rewrite fields must contain ONLY the essay prose itself — no word counts, no meta-commentary about the rewrite, no notes in parentheses, no headings like "(Expanded version)". If you need more words to reach a realistic length, just write a longer essay; do not narrate that you are doing so.

Important output language rule:
- All score comments, Chinglish issues, and improvement explanations must be concise Chinese.
- Each criterion comment should be one Chinese sentence, ideally under 45 Chinese characters.
- Keep chinglish to at most 3 high-impact items.
- rewrite_band7 and rewrite_band9 must remain English essay prose.

Respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "scores": { "ta": <number>, "cc": <number>, "lr": <number>, "gra": <number> },
  "band_overall": <number>,
  "comments": { "ta": "<1 concise Chinese sentence>", "cc": "<1 concise Chinese sentence>", "lr": "<1 concise Chinese sentence>", "gra": "<1 concise Chinese sentence>" },
  "chinglish": [ { "phrase": "<exact quote>", "issue": "<concise Chinese explanation>", "suggestion": "<better English phrasing>" } ],
  "rewrite_band7": "<full essay text>",
  "rewrite_band9": "<full essay text>"
}`;
}

function buildWritingTask1Prompt({ description, chartSummary, essayText }) {
  return `You are an experienced IELTS Writing examiner. Score the following Academic Task 1 response strictly against the official IELTS Writing Task 1 band descriptors (0-9 scale, 0.5 increments) on four criteria: Task Achievement (TA — for Task 1 this means accurately describing/summarising the key features and trends in the data, NOT giving an opinion), Coherence and Cohesion (CC), Lexical Resource (LR), Grammatical Range and Accuracy (GRA).

Task prompt:
"""
${description}
"""

The actual underlying data (so you can verify the student described it accurately — flag any factual misreading of the data as a Task Achievement issue):
"""
${chartSummary}
"""

Student's response:
"""
${essayText}
"""

For Task Achievement specifically, check whether the student: (1) wrote an overview/general trend statement, (2) covered the key features with accurate specific data points/comparisons, (3) did NOT give a personal opinion (Task 1 should be purely descriptive, no opinion expected), (4) met the ~150 word minimum.

Also flag any Chinglish / clichéd formulaic expressions overused by Chinese IELTS candidates (e.g. "As can be seen from the chart that...", literal Chinese-to-English translations, unnatural collocations). For each, quote the exact phrase, explain the issue, and suggest a more natural alternative. If none, return an empty array.

Then rewrite the ENTIRE response twice: once as a realistic band 7 version (clear, mostly accurate, around 150-170 words), and once as a realistic band 9 version (precise, well-organised, fully covers key features, around 170-200 words). The rewrite fields must contain ONLY the response prose itself — no word counts, no meta-commentary, no headings.

Important output language rule:
- All score comments, Chinglish issues, and improvement explanations must be concise Chinese.
- Each criterion comment should be one Chinese sentence, ideally under 45 Chinese characters.
- Keep chinglish to at most 3 high-impact items.
- rewrite_band7 and rewrite_band9 must remain English response prose.

Respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "scores": { "ta": <number>, "cc": <number>, "lr": <number>, "gra": <number> },
  "band_overall": <number>,
  "comments": { "ta": "<1 concise Chinese sentence>", "cc": "<1 concise Chinese sentence>", "lr": "<1 concise Chinese sentence>", "gra": "<1 concise Chinese sentence>" },
  "chinglish": [ { "phrase": "<exact quote>", "issue": "<concise Chinese explanation>", "suggestion": "<better English phrasing>" } ],
  "rewrite_band7": "<full response text>",
  "rewrite_band9": "<full response text>"
}`;
}

function buildSpeakingPart1Prompt({ topic, questions, transcript, fillerStats, riskSummary, speakSec }) {
  const fillerLine = fillerStats.total > 0
    ? `Filler word / hesitation count (detected programmatically from the transcript, not your judgment): ${JSON.stringify(fillerStats.counts)}, total=${fillerStats.total}.`
    : 'No filler words detected programmatically.';
  const riskLine = Object.keys(riskSummary).length > 0
    ? `Pronunciation-risk word categories flagged by a heuristic (word spelling + ASR confidence proxy, NOT real acoustic analysis): ${JSON.stringify(riskSummary)}.`
    : 'No pronunciation-risk words flagged.';

  return `You are an experienced IELTS Speaking examiner scoring a Part 1 warm-up/introduction response. Part 1 consists of short, personal, everyday questions — answers are expected to be brief (a sentence or two each, not long-turn monologues like Part 2), conversational, and directly relevant. You only have the ASR transcript and some programmatic signals below — you cannot hear the actual audio, so base your Pronunciation estimate mainly on the provided signals.

Topic: "${topic}"
Questions the candidate was asked (answered in order, in one continuous recording): ${questions.map((q, i) => `(${i + 1}) ${q}`).join(' ')}

Spoken duration: ~${speakSec} seconds.

Transcript (from local Whisper ASR, may contain minor recognition errors):
"""
${transcript}
"""

${fillerLine}
${riskLine}

Score against the official IELTS Speaking band descriptors (0-9, 0.5 increments) on: Fluency & Coherence (FC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA), Pronunciation (PRON, estimated from the signals above — say explicitly in the comment that this is an estimate). Don't penalise brevity itself — short, natural, relevant answers are appropriate for Part 1; penalise only if answers are underdeveloped to the point of being just one or two words, off-topic, or show clear language weaknesses.

Respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "scores": { "fc": <number>, "lr": <number>, "gra": <number>, "pron": <number> },
  "band_overall": <number>,
  "comments": { "fc": "<1-2 sentences>", "lr": "<1-2 sentences>", "gra": "<1-2 sentences>", "pron": "<1-2 sentences, note it's an estimate>" },
  "suggestions": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>"]
}`;
}

function buildSpeakingPart2Prompt({ topic, bullets, transcript, fillerStats, riskSummary, speakSec }) {
  const fillerLine = fillerStats.total > 0
    ? `Filler word / hesitation count (detected programmatically from the transcript, not your judgment): ${JSON.stringify(fillerStats.counts)}, total=${fillerStats.total}.`
    : 'No filler words detected programmatically.';
  const riskLine = Object.keys(riskSummary).length > 0
    ? `Pronunciation-risk word categories flagged by a heuristic (word spelling + ASR confidence proxy, NOT real acoustic analysis): ${JSON.stringify(riskSummary)}.`
    : 'No pronunciation-risk words flagged.';

  return `You are an experienced IELTS Speaking examiner scoring a Part 2 long-turn response. You only have the ASR transcript and some programmatic signals below — you cannot hear the actual audio, so base your Pronunciation estimate mainly on the provided signals (filler/hesitation density, flagged risk words, disfluencies visible in the transcript such as repeated words or false starts) rather than claiming to have heard the voice.

Cue card topic: "${topic}"
Bullets the candidate was asked to cover: ${bullets.join('; ')}
Spoken duration: ~${speakSec} seconds.

Transcript (from local Whisper ASR, may contain minor recognition errors):
"""
${transcript}
"""

${fillerLine}
${riskLine}

Score against the official IELTS Speaking band descriptors (0-9, 0.5 increments) on: Fluency & Coherence (FC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA), Pronunciation (PRON, estimated from the signals above — say explicitly in the comment that this is an estimate based on transcript signals, not a true acoustic judgment).

Respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "scores": { "fc": <number>, "lr": <number>, "gra": <number>, "pron": <number> },
  "band_overall": <number>,
  "comments": { "fc": "<1-2 sentences>", "lr": "<1-2 sentences>", "gra": "<1-2 sentences>", "pron": "<1-2 sentences, note it's an estimate>" },
  "suggestions": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>"]
}`;
}

function buildExaminerFollowUpPrompt({ topic, ideaBank, history }) {
  const historyText = history
    .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`)
    .join('\n\n');
  const ideasText = ideaBank
    ? ideaBank.angles.map((a) => `- ${a.angle} (e.g. ${a.example})`).join('\n')
    : 'No idea bank available for this topic.';

  return `You are an IELTS Speaking examiner conducting Part 3 (two-way discussion). Topic area: "${topic}".

Background angles you may draw on to push the discussion deeper (for your own reference, do not list them to the candidate):
${ideasText}

Conversation so far:
${historyText}

Ask ONE natural follow-up question that builds directly on the candidate's last answer — challenge an assumption, ask for a counter-argument, ask them to speculate further, or probe for a reason/example they didn't give. Keep it a single concise question, examiner register, no preamble.

Respond with ONLY this JSON object, no markdown fences, no extra text:
{ "question": "<the follow-up question>" }`;
}

function buildExaminerFeedbackPrompt({ topic, history }) {
  const historyText = history
    .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`)
    .join('\n\n');

  return `You are an experienced IELTS Speaking examiner. The candidate just completed a Part 3 discussion (topic area: "${topic}") consisting of several question-answer turns. You only have the ASR transcripts of the answers, not the audio, so estimate Pronunciation from disfluencies/hesitations visible in the text rather than claiming to have heard the voice.

Full conversation:
${historyText}

Score against the official IELTS Speaking band descriptors (0-9, 0.5 increments) on: Fluency & Coherence (FC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA), Pronunciation (PRON, estimated — say so explicitly in the comment).

Respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "scores": { "fc": <number>, "lr": <number>, "gra": <number>, "pron": <number> },
  "band_overall": <number>,
  "comments": { "fc": "<1-2 sentences>", "lr": "<1-2 sentences>", "gra": "<1-2 sentences>", "pron": "<1-2 sentences, note it's an estimate>" },
  "suggestions": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>"]
}`;
}

module.exports = {
  buildWritingTask1Prompt,
  buildWritingTask2Prompt,
  buildSpeakingPart1Prompt,
  buildSpeakingPart2Prompt,
  buildExaminerFollowUpPrompt,
  buildExaminerFeedbackPrompt,
};
