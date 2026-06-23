const { answerMatches, gradeSection } = require('../lib/listeningGrading');

describe('answerMatches', () => {
  it('matches plain strings case/whitespace/punctuation-insensitively', () => {
    expect(answerMatches('Eight', 'eight')).toBe(true);
    expect(answerMatches('eight.', 'eight')).toBe(true);
    expect(answerMatches('  eight  ', 'eight')).toBe(true);
    expect(answerMatches('nine', 'eight')).toBe(false);
  });

  it('matches multiple_select answers as sets, regardless of order', () => {
    expect(answerMatches(['D', 'B'], ['B', 'D'])).toBe(true);
    expect(answerMatches(['B'], ['B', 'D'])).toBe(false);
    expect(answerMatches(['B', 'D', 'E'], ['B', 'D'])).toBe(false);
  });

  it('treats a missing multiple_select answer (undefined/empty) as wrong, not a crash', () => {
    expect(answerMatches(undefined, ['B', 'D'])).toBe(false);
    expect(answerMatches([], ['B', 'D'])).toBe(false);
  });
});

describe('gradeSection', () => {
  const item = {
    content: {
      questions: [
        { number: 1, type: 'fill_blank', prompt: 'p1', correct_answer: 'eight' },
        { number: 2, type: 'multiple_select', prompt: 'p2', correct_answer: ['B', 'D'] },
      ],
    },
  };

  it('grades a mix of question types and computes correctCount/total', () => {
    const { perQuestion, correctCount, total } = gradeSection(item, [
      { number: 1, userAnswer: 'eight' },
      { number: 2, userAnswer: ['D', 'B'] },
    ]);
    expect(total).toBe(2);
    expect(correctCount).toBe(2);
    expect(perQuestion.every((q) => q.correct)).toBe(true);
  });

  it('defaults an unanswered question to wrong without throwing', () => {
    const { perQuestion, correctCount } = gradeSection(item, [{ number: 1, userAnswer: 'eight' }]);
    expect(correctCount).toBe(1);
    const q2 = perQuestion.find((q) => q.number === 2);
    expect(q2.correct).toBe(false);
    expect(q2.userAnswer).toEqual([]);
  });
});
