const { parsePastedQuestionText } = require('../lib/pastedQuestionParser');

describe('parsePastedQuestionText', () => {
  it('parses numbered multiple-choice questions with Chinese answers and explanations', () => {
    const parsed = parsePastedQuestionText(`标题：交通与城市\n\n1. Why do commuters prefer the train?\nA. It is cheaper\nB. It is faster\nC. It is quieter\nD. It is newer\n答案：B\n解析：The passage states that it saves time.\n\n2. What changed in 2025?\nA. Ticket prices\nB. Station design\nC. Service frequency\nD. Train colour\nAnswer: C\nExplanation: Services began running more often.`);
    expect(parsed.title).toBe('交通与城市');
    expect(parsed.questions).toHaveLength(2);
    expect(parsed.questions[0]).toMatchObject({ type: 'multiple_choice', correct_answer: 'B' });
    expect(parsed.questions[1].explanation).toContain('more often');
    expect(parsed.canImport).toBe(true);
  });

  it('keeps a passage before the first question', () => {
    const parsed = parsePastedQuestionText(`Urban trees reduce summer temperatures and provide habitats for birds.\n\nQuestion 1: What do urban trees reduce?\nAnswer: summer temperatures`);
    expect(parsed.passageText).toContain('Urban trees');
    expect(parsed.questions[0]).toMatchObject({ type: 'short_answer', correct_answer: 'summer temperatures' });
  });

  it('blocks import when an answer is missing', () => {
    const parsed = parsePastedQuestionText(`1. Choose one.\nA. First\nB. Second`);
    expect(parsed.canImport).toBe(false);
    expect(parsed.warnings[0]).toContain('缺少答案');
  });
});
