const { chartToSummaryText } = require('../lib/chartSummary');

describe('chartToSummaryText', () => {
  it('describes a bar chart with multiple series as one line per category', () => {
    const text = chartToSummaryText({
      chartType: 'bar',
      xKey: 'field',
      seriesKeys: ['2010', '2020'],
      unit: '%',
      data: [{ field: 'Engineering', 2010: 22, 2020: 30 }],
    });
    expect(text).toBe('Engineering: 2010=22%, 2020=30%');
  });

  it('describes a line chart the same way as a bar chart (same xKey/seriesKeys shape)', () => {
    const text = chartToSummaryText({
      chartType: 'line',
      xKey: 'year',
      seriesKeys: ['price'],
      unit: 'k',
      data: [{ year: 2020, price: 100 }, { year: 2021, price: 110 }],
    });
    expect(text).toContain('2020: price=100k');
    expect(text).toContain('2021: price=110k');
  });

  it('describes dual pie charts with a title per pie', () => {
    const text = chartToSummaryText({
      chartType: 'pie',
      unit: '%',
      pies: [
        { title: '1990', data: [{ name: 'Housing', value: 25 }] },
        { title: '2020', data: [{ name: 'Housing', value: 35 }] },
      ],
    });
    expect(text).toContain('1990:');
    expect(text).toContain('Housing: 25%');
    expect(text).toContain('2020:');
    expect(text).toContain('Housing: 35%');
  });

  it('describes a table with a header row and aligned columns', () => {
    const text = chartToSummaryText({
      chartType: 'table',
      columns: ['city', '2020'],
      unit: 'million',
      data: [{ city: 'Cairo', 2020: 20.5 }],
    });
    const lines = text.split('\n');
    expect(lines[0]).toBe('city | 2020');
    expect(lines[1]).toBe('Cairo | 20.5 million');
  });
});
