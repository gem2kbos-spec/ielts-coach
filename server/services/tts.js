const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const DEFAULT_VOICE = process.env.TTS_VOICE || 'Samantha';

// 用 macOS 自带的 say 离线合成语音（不走任何云端 TTS API）。
// 主要用途：真人考官模式里把追问问题读出来。
function speak(text, { voice = DEFAULT_VOICE, rate } = {}) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(os.tmpdir(), `tts-${crypto.randomUUID()}.wav`);
    const args = ['--file-format=WAVE', '--data-format=LEI16@22050', '-v', voice, '-o', outputPath];
    if (rate) args.push('-r', String(rate));
    args.push(text);
    const child = spawn('say', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`say 合成失败 (code ${code}): ${stderr.slice(-300)}`));
      resolve(outputPath);
    });
  });
}

function listVoices() {
  return new Promise((resolve, reject) => {
    const child = spawn('say', ['-v', '?'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.on('error', reject);
    child.on('close', () => {
      const voices = stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => line.match(/^(\S+)/)?.[1])
        .filter(Boolean);
      resolve(voices);
    });
  });
}

module.exports = { speak, listVoices, DEFAULT_VOICE };
