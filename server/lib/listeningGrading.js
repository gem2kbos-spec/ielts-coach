function normalizeAnswer(s) {
  return String(s || '').trim().toLowerCase().replace(/[.,!?;:]+$/, '').replace(/\s+/g, ' ');
}

// 多选题(correct_answer是数组)用集合比较，顺序不影响对错；其余都是字符串规范化后比较
function answerMatches(userAnswer, correctAnswer) {
  if (Array.isArray(correctAnswer)) {
    const userSet = new Set((Array.isArray(userAnswer) ? userAnswer : []).map(normalizeAnswer));
    const correctSet = new Set(correctAnswer.map(normalizeAnswer));
    if (userSet.size !== correctSet.size) return false;
    for (const a of correctSet) if (!userSet.has(a)) return false;
    return true;
  }
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}

function gradeSection(item, answers) {
  const userAnswerByNumber = new Map((answers || []).map((a) => [a.number, a.userAnswer]));
  const perQuestion = item.content.questions.map((q) => {
    const userAnswer = userAnswerByNumber.get(q.number) ?? (q.type === 'multiple_select' ? [] : '');
    return {
      number: q.number,
      prompt: q.prompt,
      type: q.type,
      userAnswer,
      correctAnswer: q.correct_answer,
      explanation: q.explanation || null,
      correct: answerMatches(userAnswer, q.correct_answer),
    };
  });
  const correctCount = perQuestion.filter((q) => q.correct).length;
  return { perQuestion, correctCount, total: perQuestion.length };
}

module.exports = { normalizeAnswer, answerMatches, gradeSection };
