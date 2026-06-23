const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

// 把任意格式的音频（浏览器 MediaRecorder 产出的 webm/opus 等）转成
// whisper.cpp 要求的 16kHz 单声道 PCM WAV。
function convertToWav16kMono(inputPath) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(os.tmpdir(), `audio-${crypto.randomUUID()}.wav`);
    const args = ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', outputPath];
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg 转码失败 (code ${code}): ${stderr.slice(-500)}`));
      resolve(outputPath);
    });
  });
}

// 探测音频文件时长（秒）。用 ffmpeg 解码到 null 输出，从 stderr 里抓 "Duration: HH:MM:SS.xx"。
function getAudioDurationSec(inputPath) {
  return new Promise((resolve, reject) => {
    const args = ['-i', inputPath, '-f', 'null', '-'];
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!match) return reject(new Error('无法解析音频时长'));
      const [, h, m, s] = match;
      resolve(Number(h) * 3600 + Number(m) * 60 + Number(s));
    });
  });
}

module.exports = { convertToWav16kMono, getAudioDurationSec };
