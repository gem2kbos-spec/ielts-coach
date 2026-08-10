const { matchExpressionsForChinglish } = require('../lib/expressionMatch');

const phraseItems = [
  { id: 'p1', content: { chinese: '加剧社会不平等', standard: 'exacerbate social inequality', alternatives: ['widen the social divide'] } },
  { id: 'p2', content: { chinese: '从长远来看', standard: 'in the long run', alternatives: ['over the long term'] } },
];

describe('matchExpressionsForChinglish', () => {
  it('matches a chinglish suggestion that shares a distinctive word with a bank item standard', () => {
    const chinglish = [{ phrase: 'affect', issue: 'too plain', suggestion: 'exacerbate the issue' }];
    const result = matchExpressionsForChinglish(chinglish, phraseItems);
    expect(result).toHaveLength(1);
    expect(result[0].itemId).toBe('p1');
  });

  it('matches against alternatives too, not just the standard field', () => {
    const chinglish = [{ phrase: 'in a long time', issue: 'vague', suggestion: 'over the long term' }];
    const result = matchExpressionsForChinglish(chinglish, phraseItems);
    expect(result.map((r) => r.itemId)).toContain('p2');
  });

  it('returns empty array when nothing overlaps', () => {
    const chinglish = [{ phrase: 'good', issue: 'too basic', suggestion: 'beneficial and advantageous' }];
    expect(matchExpressionsForChinglish(chinglish, phraseItems)).toEqual([]);
  });

  it('caps at one matched bank item per chinglish entry', () => {
    const items = [
      { id: 'a', content: { chinese: 'x', standard: 'exacerbate inequality', alternatives: [] } },
      { id: 'b', content: { chinese: 'y', standard: 'exacerbate tensions', alternatives: [] } },
    ];
    const chinglish = [{ phrase: 'affect', issue: '', suggestion: 'exacerbate something' }];
    expect(matchExpressionsForChinglish(chinglish, items)).toHaveLength(1);
  });

  it('handles empty inputs without throwing', () => {
    expect(matchExpressionsForChinglish([], phraseItems)).toEqual([]);
    expect(matchExpressionsForChinglish([{ phrase: 'x', suggestion: 'y' }], [])).toEqual([]);
  });
});
