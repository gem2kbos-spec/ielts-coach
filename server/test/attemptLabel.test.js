const { getAttemptLabel } = require('../lib/attemptLabel');

describe('getAttemptLabel', () => {
  it('distinguishes writing Task1 vs Task2 by item subtype', () => {
    expect(getAttemptLabel({ module: 'writing', item: { subtype: 'task1_chart' } })).toEqual({ key: 'task1', label: 'Task 1' });
    expect(getAttemptLabel({ module: 'writing', item: { subtype: 'task2_argumentative' } })).toEqual({ key: 'task2', label: 'Task 2' });
  });

  it('distinguishes speaking sub-modes: full-flow combined, examiner, part1, part2', () => {
    expect(getAttemptLabel({ module: 'speaking', rawResponse: { combined: true } }).key).toBe('full');
    expect(getAttemptLabel({ module: 'speaking', rawResponse: { history: [] } }).key).toBe('examiner');
    expect(getAttemptLabel({ module: 'speaking', item: { subtype: 'part1_warmup' } }).key).toBe('part1');
    expect(getAttemptLabel({ module: 'speaking', item: { subtype: 'part2_cue_card' } }).key).toBe('part2');
  });

  it('prioritises rawResponse signals over item subtype for speaking (combined/examiner attempts have no item)', () => {
    const result = getAttemptLabel({ module: 'speaking', item: null, rawResponse: { combined: true } });
    expect(result.key).toBe('full');
  });

  it('labels reading by source (AI生成 vs 真题导入)', () => {
    expect(getAttemptLabel({ module: 'reading', item: { source: 'ai_generated' } }).label).toContain('AI生成');
    expect(getAttemptLabel({ module: 'reading', item: { source: 'user_import' } }).label).toContain('真题导入');
  });

  it('labels listening mock vs single section', () => {
    expect(getAttemptLabel({ module: 'listening', score: { mock: true } }).key).toBe('mock');
    expect(getAttemptLabel({ module: 'listening', item: { content: { section: 'S2' } }, score: {} }).label).toContain('S2');
  });

  it('falls back gracefully for unknown modules', () => {
    expect(getAttemptLabel({ module: 'unknown' })).toEqual({ key: 'unknown', label: 'unknown' });
  });

  it('distinguishes expression-training phrase drills vs sentence translation', () => {
    expect(getAttemptLabel({ module: 'writing_expression', item: { subtype: 'phrase_drill' } }).key).toBe('phrase');
    expect(getAttemptLabel({ module: 'writing_expression', item: { subtype: 'sentence_translation' } }).key).toBe('sentence');
  });
});
