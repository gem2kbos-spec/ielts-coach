const { parseReadingDocument } = require('../lib/readingParser');

const LONG_PARAGRAPH =
  'This is a sufficiently long passage paragraph used purely to push the passage text past the fifty character minimum threshold so that confidence is not downgraded for being too short for testing purposes.';

describe('parseReadingDocument', () => {
  it('parses a single passage with TRUE/FALSE/NOT GIVEN questions', () => {
    const text = `Climate Change Basics

${LONG_PARAGRAPH}

Questions 1-3

Do the following statements agree with the information given in the passage?
Write TRUE, FALSE, or NOT GIVEN.

1. The climate has always been changing.
2. Humans are the only cause of climate change.
3. Ice caps are melting faster than predicted.`;
    const result = parseReadingDocument(text);
    expect(result.passages).toHaveLength(1);
    expect(result.passages[0].questions).toHaveLength(3);
    expect(result.passages[0].questions.every((q) => q.type === 'true_false_ng')).toBe(true);
    expect(result.confidence).toBe('high');
  });

  it('splits multiple passages on "PASSAGE N" markers', () => {
    const text = `READING PASSAGE 1

Ocean Currents

${LONG_PARAGRAPH}

Questions 1-2
1. What drives ocean currents?
A. wind
B. temperature
C. salinity
D. all of the above
2. Currents affect climate.
A. true
B. false

READING PASSAGE 2

Volcanic Activity

${LONG_PARAGRAPH}

Questions 3-4
3. What causes eruptions?
A. magma pressure
B. tectonic shift
4. Volcanoes are predictable.
A. true
B. false`;
    const result = parseReadingDocument(text);
    expect(result.passages).toHaveLength(2);
    expect(result.passages[0].title).toMatch(/Ocean Currents/);
    expect(result.passages[1].title).toMatch(/Volcanic Activity/);
  });

  it('detects multiple_choice questions from lettered options', () => {
    const text = `Title Here

${LONG_PARAGRAPH}

Questions 1-1
1. What is the main idea?
A. option one
B. option two
C. option three`;
    const result = parseReadingDocument(text);
    expect(result.passages[0].questions[0].type).toBe('multiple_choice');
    expect(result.passages[0].questions[0].options).toHaveLength(3);
  });

  it('falls back to short_answer when neither TFNG nor lettered options are detected', () => {
    const text = `Title Here

${LONG_PARAGRAPH}

Questions 1-1
1. What year did this happen?`;
    const result = parseReadingDocument(text);
    expect(result.passages[0].questions[0].type).toBe('short_answer');
  });

  it('flags low confidence when a passage has no parsed questions', () => {
    const text = `Title Here\n\n${LONG_PARAGRAPH}\n\nNo questions section here at all.`;
    const result = parseReadingDocument(text);
    expect(result.confidence).toBe('low');
  });

  it('flags low confidence when the passage body is too short', () => {
    const text = `Title\n\nToo short.\n\nQuestions 1-1\n1. What?`;
    const result = parseReadingDocument(text);
    expect(result.confidence).toBe('low');
  });
});
