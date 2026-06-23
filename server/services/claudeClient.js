const { spawn } = require('child_process');

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_MAX_BUDGET_USD = '1.0';

// 复用本机已登录的 Claude Code CLI（OAuth/订阅会话），不走单独的 Anthropic API Key。
// 实测：同一工作目录下重复调用会命中 Claude Code 默认 system prompt 的 prompt cache，
// 比每次传自定义 --system-prompt 更省 token，所以这里不覆盖 system prompt，
// 把所有任务指令都放进 prompt 正文里。
function runOnce({ prompt, timeoutMs, maxBudgetUsd }) {
  return new Promise((resolve, reject) => {
    const args = [
      '-p', prompt,
      '--output-format', 'json',
      '--allowedTools', '',
      '--max-budget-usd', String(maxBudgetUsd),
    ];
    const child = spawn('claude', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        return reject(new Error(`claude -p 超时（${timeoutMs}ms）`));
      }
      if (code !== 0) {
        return reject(new Error(`claude -p 退出码 ${code}: ${stderr.slice(0, 500)}`));
      }
      let envelope;
      try {
        envelope = JSON.parse(stdout);
      } catch (err) {
        return reject(new Error(`claude -p 输出不是合法 JSON: ${err.message}`));
      }
      if (envelope.is_error) {
        return reject(new Error(`claude -p 返回错误: ${envelope.result}`));
      }
      resolve({ text: envelope.result, costUsd: envelope.total_cost_usd, raw: envelope });
    });
  });
}

async function askClaude({ prompt, timeoutMs = DEFAULT_TIMEOUT_MS, maxBudgetUsd = DEFAULT_MAX_BUDGET_USD, retries = 1 }) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await runOnce({ prompt, timeoutMs, maxBudgetUsd });
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fall through
    }
  }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      // fall through
    }
  }
  throw new Error('无法从 Claude 输出中解析出 JSON: ' + text.slice(0, 300));
}

async function askClaudeForJson(opts) {
  const { text, costUsd } = await askClaude(opts);
  return { data: extractJson(text), costUsd };
}

module.exports = { askClaude, askClaudeForJson, extractJson };
