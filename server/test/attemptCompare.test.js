const { computeAttemptDelta } = require('../lib/attemptCompare');

describe('computeAttemptDelta', () => {
  it('returns null when there is no previous attempt', () => {
    expect(computeAttemptDelta({ band_overall: 7 }, null)).toBeNull();
  });

  it('computes band + per-criterion deltas when both attempts have scores', () => {
    const current = { band_overall: 7, score: { scores: { ta: 7, cc: 7.5, lr: 6, gra: 7 } } };
    const previous = { band_overall: 6, score: { scores: { ta: 6, cc: 6.5, lr: 6, gra: 6.5 } } };
    const delta = computeAttemptDelta(current, previous);
    expect(delta).toEqual({
      kind: 'band',
      bandDelta: 1,
      scoreDelta: { ta: 1, cc: 1, lr: 0, gra: 0.5 },
    });
  });

  it('computes accuracy delta for reading/listening-style attempts', () => {
    const current = { score: { accuracy: 80 } };
    const previous = { score: { accuracy: 60 } };
    expect(computeAttemptDelta(current, previous)).toEqual({ kind: 'accuracy', accuracyDelta: 20 });
  });

  it('handles a negative delta (regression) correctly', () => {
    const current = { band_overall: 5.5 };
    const previous = { band_overall: 6.5 };
    expect(computeAttemptDelta(current, previous).bandDelta).toBe(-1);
  });

  it('returns null when neither band nor accuracy is comparable', () => {
    expect(computeAttemptDelta({ score: {} }, { score: {} })).toBeNull();
  });
});
