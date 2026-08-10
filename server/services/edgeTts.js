const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const SPEAKER_RE = /^\s*([A-Z][A-Za-z .'-]{1,32}):\s*(.+)$/;

const SECTION_VOICES = {
  S1: ['en-GB-LibbyNeural', 'en-GB-RyanNeural', 'en-GB-SoniaNeural', 'en-GB-ThomasNeural'],
  S2: ['en-GB-RyanNeural', 'en-GB-LibbyNeural', 'en-GB-ThomasNeural'],
  S3: ['en-GB-LibbyNeural', 'en-GB-RyanNeural', 'en-GB-SoniaNeural', 'en-GB-ThomasNeural', 'en-AU-NatashaNeural'],
  S4: ['en-GB-ThomasNeural', 'en-GB-LibbyNeural', 'en-GB-RyanNeural'],
};

function escapeXml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseTranscriptTurns(transcript, section) {
  const turns = [];
  const lines = String(transcript || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(SPEAKER_RE);
    if (match) {
      turns.push({ speaker: match[1].trim(), text: match[2].trim() });
    } else if (turns.length > 0 && line.length < 260) {
      turns[turns.length - 1].text += ` ${line}`;
    } else {
      turns.push({ speaker: section === 'S4' ? 'Lecturer' : 'Speaker', text: line });
    }
  }
  return mergeShortTurns(turns).filter((turn) => turn.text);
}

function mergeShortTurns(turns) {
  const merged = [];
  for (const turn of turns) {
    const prev = merged[merged.length - 1];
    if (prev && prev.speaker === turn.speaker && `${prev.text} ${turn.text}`.length < 900) {
      prev.text += ` ${turn.text}`;
    } else {
      merged.push({ ...turn });
    }
  }
  return merged;
}

function pickVoiceForSpeaker(speaker, section, voiceMap) {
  if (voiceMap[speaker]) return voiceMap[speaker];
  const pool = SECTION_VOICES[section] || SECTION_VOICES.S2;
  const lower = speaker.toLowerCase();
  let voice = pool[Object.keys(voiceMap).length % pool.length] || pool[0];
  if (lower.includes('man') || lower.includes('male')) voice = 'en-GB-RyanNeural';
  if (lower.includes('woman') || lower.includes('female')) voice = 'en-GB-LibbyNeural';
  if (lower.includes('tutor') || lower.includes('lecturer') || lower.includes('guide')) voice = pool[0];
  voiceMap[speaker] = voice;
  return voice;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg 合并音频失败: ${stderr.slice(-600)}`));
      resolve();
    });
  });
}

async function concatMp3Files(files, outputPath) {
  if (files.length === 1) {
    fs.copyFileSync(files[0], outputPath);
    return outputPath;
  }
  const listPath = path.join(os.tmpdir(), `edge-tts-concat-${crypto.randomUUID()}.txt`);
  fs.writeFileSync(listPath, files.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n'));
  await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-codec:a', 'libmp3lame', '-q:a', '4', outputPath]);
  fs.rmSync(listPath, { force: true });
  return outputPath;
}

async function synthesizeEdgeListeningAudio({ transcript, section = 'S2' }) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
  const turns = parseTranscriptTurns(transcript, section);
  if (turns.length === 0) throw new Error('没有可合成的听力原文');

  const dir = path.join(os.tmpdir(), `ielts-edge-tts-${crypto.randomUUID()}`);
  fs.mkdirSync(dir, { recursive: true });
  const chunkPaths = [];
  const voiceMap = {};

  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i];
    const voice = pickVoiceForSpeaker(turn.speaker, section, voiceMap);
    const chunkDir = path.join(dir, `chunk-${String(i + 1).padStart(3, '0')}`);
    fs.mkdirSync(chunkDir, { recursive: true });
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const result = await tts.toFile(chunkDir, escapeXml(turn.text), { rate: section === 'S4' ? -0.03 : 0 });
    chunkPaths.push(result.audioFilePath);
  }

  const outputPath = path.join(os.tmpdir(), `ielts-edge-listening-${crypto.randomUUID()}.mp3`);
  await concatMp3Files(chunkPaths, outputPath);
  fs.rmSync(dir, { recursive: true, force: true });
  return { audioPath: outputPath, provider: 'edge', model: 'Microsoft Edge Read Aloud Neural', voiceMap };
}

module.exports = { synthesizeEdgeListeningAudio };
