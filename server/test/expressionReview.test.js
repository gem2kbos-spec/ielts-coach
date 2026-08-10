const { computeNextReview } = require('../lib/expressionReview');

const NOW = new Date('2026-06-25T00:00:00Z');

describe('computeNextReview', () => {
  it('starts learning with a 1-day interval on the first correct answer', () => {
    const r = computeNextReview({ consecutiveCorrect: 0, intervalDays: 0, result: 'correct', now: NOW });
    expect(r.status).toBe('learning');
    expect(r.consecutiveCorrect).toBe(1);
    expect(r.intervalDays).toBe(1);
  });

  it('extends the interval to 3 days on the second consecutive correct answer', () => {
    const r = computeNextReview({ consecutiveCorrect: 1, intervalDays: 1, result: 'correct', now: NOW });
    expect(r.consecutiveCorrect).toBe(2);
    expect(r.intervalDays).toBe(3);
  });

  it('marks the item mastered on the third consecutive correct answer', () => {
    const r = computeNextReview({ consecutiveCorrect: 2, intervalDays: 3, result: 'correct', now: NOW });
    expect(r.status).toBe('mastered');
    expect(r.consecutiveCorrect).toBe(3);
  });

  it('resets consecutive count and interval to 1 day on a wrong answer', () => {
    const r = computeNextReview({ consecutiveCorrect: 2, intervalDays: 7, result: 'wrong', now: NOW });
    expect(r.consecutiveCorrect).toBe(0);
    expect(r.intervalDays).toBe(1);
    expect(r.status).toBe('learning');
  });

  it('treats partial as a pass that does not advance the streak but halves the next interval', () => {
    const r = computeNextReview({ consecutiveCorrect: 2, intervalDays: 7, result: 'partial', now: NOW });
    expect(r.consecutiveCorrect).toBe(2);
    expect(r.intervalDays).toBe(4);
    expect(r.status).toBe('learning');
  });

  it('computes nextDueAt as now + intervalDays', () => {
    const r = computeNextReview({ consecutiveCorrect: 0, intervalDays: 0, result: 'correct', now: NOW });
    expect(r.nextDueAt).toBe('2026-06-26T00:00:00.000Z');
  });
});
