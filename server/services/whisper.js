const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const WHISPER_BIN = path.join(ROOT, 'tools', 'whisper.cpp', 'build', 'bin', 'whisper-cli');
const DEFAULT_MODEL = path.join(ROOT, 'tools', 'whisper.cpp', 'models', 'ggml-small.en.bin');

function isAvailable() {
  return fs.existsSync(WHISPER_BIN) && fs.existsSync(DEFAULT_MODEL);
}

// wavPath 必须是 16kHz 单声道 PCM WAV（用 services/audio.js 的 convertToWav16kMono 预处理）。
function transcribe(wavPath, { model = DEFAULT_MODEL, timeoutMs = 120_000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!isAvailable()) {
      return reject(new Error('whisper.cpp 未编译或模型未下载，参考 README 跑 tools/whisper.cpp 的编译步骤'));
    }
    const outPrefix = path.join(os.tmpdir(), `whisper-${crypto.randomUUID()}`);
    const args = ['-m', model, '-f', wavPath, '--output-json-full', '--no-prints', '-of', outPrefix];
    const child = spawn(WHISPER_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const jsonPath = `${outPrefix}.json`;
      if (timedOut) return reject(new Error(`whisper-cli 超时（${timeoutMs}ms）`));
      if (code !== 0) return reject(new Error(`whisper-cli 退出码 ${code}: ${stderr.slice(0, 500)}`));
      try {
        const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        fs.unlinkSync(jsonPath);
        resolve(normalize(raw));
      } catch (err) {
        reject(new Error(`解析 whisper 输出失败: ${err.message}`));
      }
    });
  });
}

function normalize(raw) {
  const segments = (raw.transcription || []).map((seg) => ({
    text: seg.text.trim(),
    fromMs: seg.offsets.from,
    toMs: seg.offsets.to,
    tokens: (seg.tokens || [])
      .filter((t) => !t.text.startsWith('[_'))
      .map((t) => ({ text: t.text.trim(), fromMs: t.offsets.from, toMs: t.offsets.to, prob: t.p })),
  }));
  const text = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
  return { text, segments };
}

module.exports = { transcribe, isAvailable, WHISPER_BIN, DEFAULT_MODEL };
