#!/usr/bin/env node

const DEFAULT_BASE_URL = 'http://localhost:3000';

function parseArgs(argv) {
  const out = {
    baseUrl: process.env.IELTS_COACH_URL || DEFAULT_BASE_URL,
    email: process.env.IELTS_EMAIL || '',
    password: process.env.IELTS_PASSWORD || '',
    token: process.env.IELTS_TOKEN || '',
    sets: 1,
    sections: ['S1', 'S2', 'S3', 'S4'],
    difficulty: process.env.LISTENING_DIFFICULTY || 'medium',
    topic: process.env.LISTENING_TOPIC || '',
    extraRequirements: process.env.LISTENING_REQUIREMENTS || '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--url' && next) { out.baseUrl = next; i += 1; }
    else if (arg === '--email' && next) { out.email = next; i += 1; }
    else if (arg === '--password' && next) { out.password = next; i += 1; }
    else if (arg === '--token' && next) { out.token = next; i += 1; }
    else if (arg === '--sets' && next) { out.sets = Math.max(1, Number(next) || 1); i += 1; }
    else if (arg === '--sections' && next) {
      out.sections = next.split(',').map((s) => s.trim().toUpperCase()).filter((s) => ['S1', 'S2', 'S3', 'S4'].includes(s));
      if (out.sections.length === 0) out.sections = ['S1', 'S2', 'S3', 'S4'];
      i += 1;
    }
    else if (arg === '--difficulty' && next) { out.difficulty = next; i += 1; }
    else if (arg === '--topic' && next) { out.topic = next; i += 1; }
    else if (arg === '--requirements' && next) { out.extraRequirements = next; i += 1; }
  }
  return out;
}

async function readJson(res, fallback) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = { error: text };
  }
  if (!res.ok) throw new Error(data?.error || fallback);
  return data;
}

async function getToken(opts) {
  if (opts.token) return opts.token;
  if (!opts.email || !opts.password) {
    throw new Error('需要登录信息：设置 IELTS_TOKEN，或设置 IELTS_EMAIL / IELTS_PASSWORD。');
  }
  const res = await fetch(`${opts.baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: opts.email, password: opts.password }),
  });
  const data = await readJson(res, '登录失败');
  return data.token;
}

async function generateSection(opts, token, setIndex, section) {
  const body = {
    count: 1,
    section,
    difficulty: opts.difficulty,
    topic: opts.topic,
    extraRequirements: [
      'Generate original IELTS-style material only; do not copy published IELTS/Cambridge/British Council/IDP material.',
      'Make each section follow its real exam function and include credible distractors, corrections, paraphrase and exact word-limit instructions.',
      opts.extraRequirements,
    ].filter(Boolean).join('\n'),
  };
  console.log(`\n[set ${setIndex}] generating ${section}...`);
  const res = await fetch(`${opts.baseUrl}/api/listening/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await readJson(res, '生成听力题失败');
  const created = data.created || [];
  const failed = data.failed || [];
  for (const item of created) {
    const duration = item.durationSec == null ? '' : `, ${Math.round(item.durationSec)}s`;
    console.log(`  ✓ ${item.section || '?'} ${item.title} (${item.questionCount} questions${duration})`);
  }
  for (const item of failed) {
    console.log(`  ✗ ${item.section || '?'} #${item.index}: ${item.error}`);
  }
  return { created, failed };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const token = await getToken(opts);
  let createdTotal = 0;
  let failedTotal = 0;

  for (let i = 1; i <= opts.sets; i += 1) {
    for (const section of opts.sections) {
      try {
        const result = await generateSection(opts, token, i, section);
        createdTotal += result.created.length;
        failedTotal += result.failed.length;
      } catch (err) {
        failedTotal += 1;
        console.log(`  ✗ ${section}: ${err.message}`);
      }
    }
  }

  console.log(`\nDone. Created ${createdTotal} listening sections. Failed ${failedTotal}.`);
  if (failedTotal > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
