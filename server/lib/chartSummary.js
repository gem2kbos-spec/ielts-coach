// Task1评分时AI拿不到图表图片，只能看文字——把结构化的图表数据转成一段平铺直叙的文字描述，
// 让AI能对照检查学生有没有把数据描述准确(这是Task Achievement的核心要求之一)。
function chartToSummaryText(content) {
  const { chartType, unit = '' } = content;
  if (chartType === 'bar' || chartType === 'line') {
    const lines = content.data.map((row) => {
      const parts = content.seriesKeys.map((k) => `${k}=${row[k]}${unit}`);
      return `${row[content.xKey]}: ${parts.join(', ')}`;
    });
    return lines.join('\n');
  }
  if (chartType === 'pie') {
    return content.pies
      .map((pie) => `${pie.title}:\n` + pie.data.map((d) => `  ${d.name}: ${d.value}${unit}`).join('\n'))
      .join('\n\n');
  }
  if (chartType === 'table') {
    const header = content.columns.join(' | ');
    const rows = content.data.map((row) => content.columns.map((c) => `${row[c]}${unit && c !== content.columns[0] ? ` ${unit}` : ''}`).join(' | '));
    return [header, ...rows].join('\n');
  }
  return JSON.stringify(content.data);
}

module.exports = { chartToSummaryText };
