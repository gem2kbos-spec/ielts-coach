const { aggregateWeakness } = require('../lib/weaknessAggregate');

describe('aggregateWeakness', () => {
  it('counts repeated chinglish phrases across multiple writing attempts and sorts by frequency', () => {
    const writingRows = [
      { created_at: '2026-01-01', score: { chinglish: [{ phrase: 'With the development of', issue: 'cliché', suggestion: 'As X develops' }] } },
      { created_at: '2026-01-05', score: { chinglish: [{ phrase: 'with the development of', issue: 'cliché', suggestion: 'As X develops' }] } },
      { created_at: '2026-01-03', score: { chinglish: [{ phrase: 'Every coin has two sides', issue: 'cliché', suggestion: 'There are pros and cons' }] } },
    ];
    const result = aggregateWeakness({ writingRows, speakingRows: [], vocabRows: [] });
    expect(result.chinglish[0].count).toBe(2);
    expect(result.chinglish[0].phrase.toLowerCase()).toBe('with the development of');
    expect(result.chinglish[0].lastSeen).toBe('2026-01-05');
    expect(result.chinglish[1].count).toBe(1);
  });

  it('counts repeated pronunciation-risk words by word+category across speaking attempts', () => {
    const speakingRows = [
      { created_at: '2026-01-01', rawResponse: { riskFlagged: [{ word: 'three', category: 'th', categoryLabel: 'th音' }] } },
      { created_at: '2026-01-02', rawResponse: { riskFlagged: [{ word: 'Three', category: 'th', categoryLabel: 'th音' }] } },
      { created_at: '2026-01-03', rawResponse: { riskFlagged: [{ word: 'very', category: 'v', categoryLabel: 'v音' }] } },
    ];
    const result = aggregateWeakness({ writingRows: [], speakingRows, vocabRows: [] });
    expect(result.pronunciation[0].count).toBe(2);
    expect(result.pronunciation[0].word.toLowerCase()).toBe('three');
  });

  it('treats the same word in different risk categories as distinct entries', () => {
    const speakingRows = [
      { created_at: '2026-01-01', rawResponse: { riskFlagged: [{ word: 'reds', category: 'initial_r', categoryLabel: 'r' }] } },
      { created_at: '2026-01-02', rawResponse: { riskFlagged: [{ word: 'reds', category: 'final_cluster', categoryLabel: 'cluster' }] } },
    ];
    const result = aggregateWeakness({ writingRows: [], speakingRows, vocabRows: [] });
    expect(result.pronunciation).toHaveLength(2);
  });

  it('handles attempts with no chinglish/riskFlagged data gracefully', () => {
    const result = aggregateWeakness({
      writingRows: [{ created_at: '2026-01-01', score: {} }],
      speakingRows: [{ created_at: '2026-01-01', rawResponse: {} }],
      vocabRows: [],
    });
    expect(result.chinglish).toEqual([]);
    expect(result.pronunciation).toEqual([]);
  });

  it('passes vocabRows through unchanged', () => {
    const vocabRows = [{ word: 'ubiquitous' }];
    const result = aggregateWeakness({ writingRows: [], speakingRows: [], vocabRows });
    expect(result.vocab).toBe(vocabRows);
  });

  it('aggregates repeated expression-training mistakes by item, counting occurrences and merging error types', () => {
    const item = { id: 'expr-phrase-001', subtype: 'phrase_drill', content: { chinese: '加剧社会不平等', standard: 'exacerbate social inequality' } };
    const expressionRows = [
      { created_at: '2026-01-01', item, score: { result: 'wrong' }, errorTags: ['collocation'] },
      { created_at: '2026-01-03', item, score: { result: 'partial' }, errorTags: ['word_choice'] },
    ];
    const result = aggregateWeakness({ writingRows: [], speakingRows: [], expressionRows, vocabRows: [] });
    expect(result.expressionMistakes).toHaveLength(1);
    expect(result.expressionMistakes[0].count).toBe(2);
    expect(result.expressionMistakes[0].errorTypes.sort()).toEqual(['collocation', 'word_choice']);
    expect(result.expressionMistakes[0].lastSeen).toBe('2026-01-03');
  });

  it('skips expression-training attempts that were graded fully correct', () => {
    const item = { id: 'expr-phrase-002', subtype: 'sentence_translation', content: { chinese: 'x', standard: 'y' } };
    const expressionRows = [{ created_at: '2026-01-01', item, score: { result: 'correct' }, errorTags: [] }];
    const result = aggregateWeakness({ writingRows: [], speakingRows: [], expressionRows, vocabRows: [] });
    expect(result.expressionMistakes).toEqual([]);
  });
});
