const { parseListeningDocument } = require('../lib/listeningParser');

describe('parseListeningDocument', () => {
  it('parses fill_blank questions from a notes-completion block', () => {
    const page = `Questions 1-2

Complete the notes below. Write ONE WORD ONLY for each answer.

1. The library opens at ___ am on weekdays.
2. Students need a valid ___ to borrow books.`;
    const result = parseListeningDocument([page]);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].type).toBe('fill_blank');
    expect(result.questions[1].type).toBe('fill_blank');
  });

  it('does not let an instruction line bleed into the previous question\'s prompt or flags', () => {
    const page = `Questions 1-4

Complete the notes below.

1. First blank ___.
2. Second blank ___.
3. Third blank ___.
4. Fourth blank ___.

Questions 5-6

Choose TWO letters, A-E.

5. Which two were renovated?
A. cafe
B. computer lab
C. reading room
D. car park
E. lecture hall`;
    const result = parseListeningDocument([page]);
    const q4 = result.questions.find((q) => q.number === 4);
    const q5 = result.questions.find((q) => q.number === 5);
    expect(q4.type).toBe('fill_blank');
    expect(q4.prompt).not.toMatch(/Choose TWO/i);
    expect(q5.type).toBe('multiple_select');
    expect(q5.expectedCount).toBe(2);
    expect(q5.options).toHaveLength(5);
  });

  it('parses multiple_choice with options A-D and no multi-select flag', () => {
    const page = `Questions 1-1

Choose the correct letter, A, B or C.

1. What is the topic?
A. tourism
B. agriculture
C. technology`;
    const result = parseListeningDocument([page]);
    expect(result.questions[0].type).toBe('multiple_choice');
    expect(result.questions[0].options).toEqual(['A. tourism', 'B. agriculture', 'C. technology']);
  });

  it('detects map_label questions and records the page they were found on', () => {
    const page1 = `Questions 1-1\n\n1. Some other question ___.`;
    const page2 = `Questions 2-3\n\nLabel the map below.\n\n2. Main entrance\n3. Cafe location`;
    const result = parseListeningDocument([page1, page2]);
    const mapQuestions = result.questions.filter((q) => q.type === 'map_label');
    expect(mapQuestions).toHaveLength(2);
    expect(mapQuestions[0].page).toBe(2);
    expect(result.mapPageGuess).toBe(2);
  });

  it('resets question-type flags at each new "Questions X-Y" header', () => {
    const page = `Questions 1-1

Label the map below.

1. Entrance ___.

Questions 2-2

Choose the correct letter.

2. Topic?
A. one
B. two`;
    const result = parseListeningDocument([page]);
    const q1 = result.questions.find((q) => q.number === 1);
    const q2 = result.questions.find((q) => q.number === 2);
    expect(q1.type).toBe('map_label');
    expect(q2.type).toBe('multiple_choice');
  });

  it('returns low confidence and no questions for text with no recognisable structure', () => {
    const result = parseListeningDocument(['just some random prose with no question numbers at all']);
    expect(result.questions).toHaveLength(0);
    expect(result.confidence).toBe('low');
  });
});
