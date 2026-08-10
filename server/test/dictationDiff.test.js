const { computeDictationDiff } = require('../lib/dictationDiff');

describe('computeDictationDiff', () => {
  it('marks every word matched for a perfect transcription', () => {
    const result = computeDictationDiff('the cat sat on the mat', 'the cat sat on the mat');
    expect(result.refDiff.every((w) => w.matched)).toBe(true);
    expect(result.accuracy).toBe(100);
    expect(result.extraWords).toHaveLength(0);
  });

  it('marks a missed word as unmatched without shifting later words out of alignment', () => {
    const result = computeDictationDiff('the quick brown fox jumps', 'the brown fox jumps');
    const words = result.refDiff.map((w) => `${w.word}:${w.matched}`);
    expect(words).toEqual(['the:true', 'quick:false', 'brown:true', 'fox:true', 'jumps:true']);
  });

  it('puts words the user typed that are not in the transcript into extraWords', () => {
    const result = computeDictationDiff('the cat sat', 'the big cat sat down');
    expect(result.extraWords).toEqual(['big', 'down']);
    expect(result.correctCount).toBe(3);
  });

  it('is case- and trailing-punctuation-insensitive', () => {
    const result = computeDictationDiff('Hello, world!', 'hello world');
    expect(result.accuracy).toBe(100);
  });

  it('handles an empty user submission gracefully (everything missing, no crash)', () => {
    const result = computeDictationDiff('one two three', '');
    expect(result.accuracy).toBe(0);
    expect(result.refDiff.every((w) => !w.matched)).toBe(true);
  });
});
