const { assertValidItem } = require('../lib/itemSchema');

const baseItem = {
  module: 'listening',
  subtype: 'listening_section',
  tags: [],
  source: 'user_import',
  content: { title: 'x' },
  file_path: null,
};

describe('assertValidItem', () => {
  it('accepts a well-formed item', () => {
    expect(() => assertValidItem(baseItem)).not.toThrow();
  });

  it('rejects an unknown module', () => {
    expect(() => assertValidItem({ ...baseItem, module: 'cooking' })).toThrow();
  });

  it('accepts difficulty: null (callers often do `p.difficulty || null` when not specified)', () => {
    expect(() => assertValidItem({ ...baseItem, difficulty: null })).not.toThrow();
  });

  it('rejects an invalid difficulty string', () => {
    expect(() => assertValidItem({ ...baseItem, difficulty: 'extreme' })).toThrow();
  });

  it('accepts a valid difficulty value', () => {
    expect(() => assertValidItem({ ...baseItem, difficulty: 'medium' })).not.toThrow();
  });

  it('rejects extra unknown top-level properties (e.g. accidentally re-submitting a DB row with created_at)', () => {
    expect(() => assertValidItem({ ...baseItem, created_at: '2026-01-01' })).toThrow();
  });

  it('rejects items missing required fields', () => {
    expect(() => assertValidItem({ module: 'reading' })).toThrow();
  });
});
