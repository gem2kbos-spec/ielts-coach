const ESSAY_TYPE_GUIDE = {
  opinion: 'Opinion essay — "To what extent do you agree or disagree?" or "Do you think...?"',
  discussion: 'Discussion essay — "Discuss both views and give your own opinion."',
  problem_solution: 'Problem/solution essay — describe problems caused by X and suggest solutions.',
  advantage_disadvantage: 'Advantages/disadvantages essay — "Discuss the advantages and disadvantages of..."',
};

const CHART_TYPE_GUIDE = {
  bar: 'Bar chart (grouped or stacked) comparing categories across time points or groups. Use xKey + seriesKeys + data array.',
  line: 'Line graph showing trends over time. Use xKey (usually year/period) + seriesKeys + data array.',
  pie: 'Pie chart(s) showing proportions. Use "pies" array, each with a title and data array of {name, value}.',
  table: 'Data table. Use "columns" array and "data" array of row objects keyed by column names.',
};

const TOPIC_POOL_T2 = [
  'education and technology in schools', 'remote work and productivity', 'social media and youth mental health',
  'government spending on arts vs science', 'nuclear energy as a green solution', 'urban migration and housing crisis',
  'gap year before university', 'advertising targeting children', 'space exploration funding',
  'compulsory voting in elections', 'single-use plastic bans', 'animal testing for medicine',
];

const TOPIC_POOL_T1 = [
  'energy consumption by sector', 'university enrollment by subject', 'transport mode usage over time',
  'household spending patterns', 'population growth in major cities', 'internet usage by age group',
  'employment rates by industry', 'water usage by region', 'trade imports and exports',
];

function buildTask2GeneratePrompt({ essayType, topic, difficulty, extraRequirements }) {
  const resolvedTopic = topic?.trim() || TOPIC_POOL_T2[Math.floor(Math.random() * TOPIC_POOL_T2.length)];
  const difficultyNote = difficulty === 'easy'
    ? 'Band 5-6: accessible everyday topic, clear binary stance'
    : difficulty === 'hard'
    ? 'Band 7.5-8+: nuanced societal topic, requires sophisticated argumentation'
    : 'Band 6.5-7: standard IELTS difficulty, moderately complex issue';

  const typeInstruction = essayType && essayType !== 'any'
    ? `Essay type: ${ESSAY_TYPE_GUIDE[essayType]}`
    : `Essay type: choose one of opinion/discussion/problem_solution/advantage_disadvantage that best fits the topic`;

  return `Generate one authentic IELTS Academic Writing Task 2 question. Return valid JSON only.

Requirements:
- ${typeInstruction}
- Topic area: ${resolvedTopic}
- Difficulty: ${difficultyNote}
${extraRequirements ? `- Additional: ${extraRequirements}` : ''}

Rules:
1. The prompt must feel like a real IELTS exam question
2. End the question with the standard task instruction: "Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words."
3. essay_type must be exactly one of: opinion, discussion, problem_solution, advantage_disadvantage

Return this JSON schema (no extra keys):
{
  "essay_type": "opinion",
  "prompt": "Full question text..."
}`;
}

function buildTask1GeneratePrompt({ chartType, topic, difficulty, extraRequirements }) {
  const resolvedTopic = topic?.trim() || TOPIC_POOL_T1[Math.floor(Math.random() * TOPIC_POOL_T1.length)];
  const resolvedChartType = chartType || 'bar';
  const difficultyNote = difficulty === 'easy'
    ? 'simple dataset, 3-4 obvious trends'
    : difficulty === 'hard'
    ? 'complex dataset with 5-6 categories, multiple cross-comparisons required'
    : 'moderate dataset, 4-5 categories with some notable trends';

  const chartGuide = CHART_TYPE_GUIDE[resolvedChartType];

  let schemaExample = '';
  if (resolvedChartType === 'bar' || resolvedChartType === 'line') {
    schemaExample = `{
  "chartType": "${resolvedChartType}",
  "description": "The chart below shows ... Write at least 150 words.",
  "xKey": "year",
  "seriesKeys": ["Category A", "Category B", "Category C"],
  "unit": "%",
  "data": [
    { "year": "2000", "Category A": 25, "Category B": 40, "Category C": 35 },
    { "year": "2010", "Category A": 30, "Category B": 35, "Category C": 35 }
  ]
}`;
  } else if (resolvedChartType === 'pie') {
    schemaExample = `{
  "chartType": "pie",
  "description": "The pie charts below show ... Write at least 150 words.",
  "unit": "%",
  "pies": [
    {
      "title": "2000",
      "data": [{"name": "Category A", "value": 30}, {"name": "Category B", "value": 45}, {"name": "Category C", "value": 25}]
    },
    {
      "title": "2020",
      "data": [{"name": "Category A", "value": 40}, {"name": "Category B", "value": 35}, {"name": "Category C", "value": 25}]
    }
  ]
}`;
  } else if (resolvedChartType === 'table') {
    schemaExample = `{
  "chartType": "table",
  "description": "The table below shows ... Write at least 150 words.",
  "unit": "millions",
  "columns": ["Country", "2000", "2010", "2020"],
  "data": [
    {"Country": "A", "2000": 10, "2010": 15, "2020": 22},
    {"Country": "B", "2000": 8, "2010": 12, "2020": 18}
  ]
}`;
  }

  return `Generate one authentic IELTS Academic Writing Task 1 chart/table dataset. Return valid JSON only.

Requirements:
- Chart type: ${resolvedChartType} — ${chartGuide}
- Topic area: ${resolvedTopic}
- Difficulty: ${difficultyNote}
${extraRequirements ? `- Additional: ${extraRequirements}` : ''}

Rules:
1. Numbers must be realistic and internally consistent (percentages sum correctly, trends are plausible)
2. The description must start with "The [chart type] below shows/compares..." and end with "Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words."
3. Use 3-6 data points/categories for appropriate complexity
4. All numeric values should be numbers (not strings)

Return this JSON schema exactly:
${schemaExample}`;
}

module.exports = { buildTask2GeneratePrompt, buildTask1GeneratePrompt };
