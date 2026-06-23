const { toSqliteDatetime } = require('../lib/sqliteTime');

describe('toSqliteDatetime', () => {
  it('converts an ISO timestamp into SQLite datetime() format', () => {
    expect(toSqliteDatetime('2026-06-23T01:20:04.136Z')).toBe('2026-06-23 01:20:04');
  });

  it('produces a string that compares correctly against same-day SQLite timestamps', () => {
    const earlier = toSqliteDatetime('2026-06-23T01:20:04.000Z');
    const sqliteLater = '2026-06-23 14:00:00';
    // 转换前用ISO字符串直接比较会因为'T'和空格的ASCII差异判断错误，转换后应该能正确比出"更晚"
    expect(sqliteLater >= earlier).toBe(true);
  });
});
