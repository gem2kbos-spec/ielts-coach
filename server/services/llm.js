// 统一入口：按 LLM_PROVIDER 环境变量选择后端（默认 claude，走本机 Claude Code CLI；
// 设成 deepseek 则走 DeepSeek API，需要配置 DEEPSEEK_API_KEY）。
// 给两边返回同样的 { data, costUsd } 形状，调用方不用关心具体用了哪个。
// 顺带把每次调用的花费记一笔到usage_log，喂给仪表板的"AI花费"统计——
// 调用方传一个feature标签(比如'reading_generate')方便按功能拆分看花费分布。
const { askClaudeForJson } = require('./claudeClient');
const { askDeepSeekForJson } = require('./deepseekClient');
const { logUsage } = require('../db/usageLogRepo');
const { incrementAiCalls } = require('../db/usersRepo');

async function askForJson({ feature, userId, ...opts }) {
  const provider = (process.env.LLM_PROVIDER || 'claude').toLowerCase();
  const result = provider === 'deepseek' ? await askDeepSeekForJson(opts) : await askClaudeForJson(opts);
  try {
    logUsage({ provider, feature: feature || 'unknown', costUsd: result.costUsd });
  } catch (err) {
    // 记日志失败不该影响主流程
    console.error('[usage log failed]', err.message);
  }
  // 给后续加限额功能铺路：现在只计数，不做任何拦截
  if (userId) {
    try {
      incrementAiCalls(userId);
    } catch (err) {
      console.error('[ai calls count failed]', err.message);
    }
  }
  return result;
}

module.exports = { askForJson };
