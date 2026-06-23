const { normalizeAnswer } = require('../lib/readingGrading');

describe('normalizeAnswer', () => {
  it('lowercases, trims, and collapses whitespace', () => {
    expect(normalizeAnswer('  TRUE  ')).toBe('true');
    expect(normalizeAnswer('Not   Given')).toBe('not given');
  });

  it('strips trailing punctuation', () => {
    expect(normalizeAnswer('passport.')).toBe('passport');
    expect(normalizeAnswer('passport!')).toBe('passport');
  });

  it('treats null/undefined as an empty string rather than throwing', () => {
    expect(normalizeAnswer(undefined)).toBe('');
    expect(normalizeAnswer(null)).toBe('');
  });
});
