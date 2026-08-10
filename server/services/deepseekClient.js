const { extractJson } = require('./claudeClient');

const API_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'; // 可由部署环境覆盖

// 价格来自 DeepSeek 官方文档（2026-06），按 cache miss 计；可能会变，仅供粗略参考，
// 不要把这个数字当成账单依据，真实扣费看 DeepSeek 后台。
const PRICE_PER_M_INPUT = 0.14;
const PRICE_PER_M_OUTPUT = 0.28;

function estimateCostUsd(usage) {
  if (!usage) return null;
  const inputCost = ((usage.prompt_tokens || 0) / 1e6) * PRICE_PER_M_INPUT;
  const outputCost = ((usage.completion_tokens || 0) / 1e6) * PRICE_PER_M_OUTPUT;
  return Math.round((inputCost + outputCost) * 1e6) / 1e6;
}

async function askDeepSeek({ prompt, model = DEFAULT_MODEL, timeoutMs = 60_000, maxTokens = 8000, jsonMode = true }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置（在项目根目录的 .env 里加一行 DEEPSEEK_API_KEY=...）');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: maxTokens,
        // DeepSeek 的 JSON 模式要求 prompt 里出现字面的 "json" 字样才会生效，
        // 我们的 prompt 模板里都有 "JSON object" 这种描述，满足条件。
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const bodyText = await res.text();
      throw new Error(`DeepSeek API 返回 ${res.status}: ${bodyText.slice(0, 300)}`);
    }

    const json = await res.json();
    const choice = json.choices?.[0];
    const text = choice?.message?.content;
    if (!text) throw new Error('DeepSeek 返回里没有 content: ' + JSON.stringify(json).slice(0, 300));
    if (choice.finish_reason === 'length') {
      throw new Error(`DeepSeek 输出被截断（finish_reason=length），试着调大 maxTokens 或精简 prompt`);
    }
    return { text, costUsd: estimateCostUsd(json.usage), raw: json };
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`DeepSeek 调用超时（${timeoutMs}ms）`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function askDeepSeekForJson({ retries = 1, ...opts }) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { text, costUsd } = await askDeepSeek(opts);
    try {
      return { data: extractJson(text), costUsd };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

module.exports = { askDeepSeek, askDeepSeekForJson, DEFAULT_MODEL };
