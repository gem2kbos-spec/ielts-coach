function buildVocabLookupPrompt({ word, contextSentence }) {
  const contextLine = contextSentence
    ? `It appeared in this sentence: "${contextSentence}"`
    : 'No surrounding sentence was provided.';

  return `A Chinese IELTS candidate marked the English word/phrase "${word}" as unknown while reading. ${contextLine}

Give a concise Chinese gloss and a more detailed explanation suitable for a vocabulary flashcard. If context is given, gloss the word as it's used in that context (handle polysemy correctly).

Respond with ONLY this JSON object, no markdown fences, no extra text:
{
  "chinese_gloss": "<simple Chinese translation, 2-8 字左右>",
  "part_of_speech": "<n./v./adj./adv./phrase 等>",
  "explanation": "<1-3 句中文讲解：词义辨析、常见搭配或易混淆点>",
  "examples": ["<english example sentence 1>", "<english example sentence 2>"],
  "collocations": ["<common collocation 1>", "<common collocation 2>"]
}`;
}

module.exports = { buildVocabLookupPrompt };
