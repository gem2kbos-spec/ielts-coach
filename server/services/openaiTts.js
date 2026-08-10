const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
const DEFAULT_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const DEFAULT_FORMAT = process.env.OPENAI_TTS_FORMAT || 'mp3';

const SECTION_STYLE = {
  S1: {
    defaultVoice: 'marin',
    voicePool: ['marin', 'cedar', 'coral', 'verse'],
    instructions:
      'Speak like a natural IELTS Listening Section 1 recording: clear conversational English, moderate pace, realistic pauses, polite service-call intonation, lightly British/international accent, not robotic or overdramatic.',
  },
  S2: {
    defaultVoice: 'cedar',
    voicePool: ['cedar', 'marin', 'sage'],
    instructions:
      'Speak like an IELTS Listening Section 2 public announcement or guided talk: natural presenter voice, clear but not flat, measured pacing, realistic signposting, lightly British/international accent.',
  },
  S3: {
    defaultVoice: 'marin',
    voicePool: ['marin', 'cedar', 'coral', 'verse', 'sage'],
    instructions:
      'Speak like an IELTS Listening Section 3 academic discussion: natural student/tutor voices, turn-taking, thoughtful pauses, occasional emphasis on corrections and decisions, lightly British/international academic accent.',
  },
  S4: {
    defaultVoice: 'cedar',
    voicePool: ['cedar', 'marin', 'onyx'],
    instructions:
      'Speak like an IELTS Listening Section 4 academic lecture: clear lecturer voice, steady academic pacing, natural intonation, emphasis on key terminology, lightly British/international accent, not theatrical.',
  },
};

const SPEAKER_RE = /^\s*([A-Z][A-Za-z .'-]{1,32}):\s*(.+)$/;

function scrubSecret(text) {
  return String(text || '').replace(/sk-[A-Za-z0-9_*.-]{8,}/g, 'sk-***');
}

function hasOpenAiTts() {
  return !!process.env.OPENAI_API_KEY;
}

function sectionStyle(section) {
  return SECTION_STYLE[section] || SECTION_STYLE.S2;
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
  const style = sectionStyle(section);
  const lower = speaker.toLowerCase();
  const pool = style.voicePool;
  let voice = pool[Object.keys(voiceMap).length % pool.length] || style.defaultVoice;
  if (lower.includes('man') || lower.includes('male')) voice = 'cedar';
  if (lower.includes('woman') || lower.includes('female')) voice = 'marin';
  if (lower.includes('tutor') || lower.includes('lecturer') || lower.includes('guide')) voice = style.defaultVoice;
  voiceMap[speaker] = voice;
  return voice;
}

async function callSpeechApi({ input, voice, instructions, outputPath }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY 未配置，无法生成 AI 听力音频');

  const res = await fetch(OPENAI_SPEECH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      voice,
      input,
      instructions,
      response_format: DEFAULT_FORMAT,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = null;
    }
    const code = parsed?.error?.code || parsed?.error?.type;
    if (res.status === 401) {
      throw new Error('OpenAI TTS 认证失败：OPENAI_API_KEY 不正确或已失效');
    }
    if (res.status === 429 && code === 'insufficient_quota') {
      throw new Error('OpenAI TTS 额度不足：当前 API key 没有可用余额或计费额度，请在 OpenAI 控制台开启/充值后再重配音');
    }
    throw new Error(`OpenAI TTS 返回 ${res.status}: ${scrubSecret(body).slice(0, 300)}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
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

async function concatAudioFiles(files, outputPath) {
  if (files.length === 1) {
    fs.copyFileSync(files[0], outputPath);
    return outputPath;
  }
  const listPath = path.join(os.tmpdir(), `tts-concat-${crypto.randomUUID()}.txt`);
  fs.writeFileSync(listPath, files.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n'));
  await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath]);
  fs.rmSync(listPath, { force: true });
  return outputPath;
}

async function synthesizeIeltsListeningAudio({ transcript, section = 'S2', title = '' }) {
  const style = sectionStyle(section);
  const turns = parseTranscriptTurns(transcript, section);
  if (turns.length === 0) throw new Error('没有可合成的听力原文');

  const dir = path.join(os.tmpdir(), `ielts-ai-tts-${crypto.randomUUID()}`);
  fs.mkdirSync(dir, { recursive: true });
  const voiceMap = {};
  const chunkPaths = [];

  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i];
    const voice = pickVoiceForSpeaker(turn.speaker, section, voiceMap);
    const input = turn.text;
    const chunkPath = path.join(dir, `chunk-${String(i + 1).padStart(3, '0')}.${DEFAULT_FORMAT}`);
    await callSpeechApi({
      input,
      voice,
      outputPath: chunkPath,
      instructions: `${style.instructions} This is original IELTS-style practice audio${title ? ` for "${title}"` : ''}. Keep delivery realistic: no synthetic cheerfulness, no exaggerated acting, no monotone reading. Preserve pauses after speaker labels and around answer-bearing details.`,
    });
    chunkPaths.push(chunkPath);
  }

  const outputPath = path.join(os.tmpdir(), `ielts-listening-${crypto.randomUUID()}.${DEFAULT_FORMAT}`);
  await concatAudioFiles(chunkPaths, outputPath);
  fs.rmSync(dir, { recursive: true, force: true });
  return { audioPath: outputPath, provider: 'openai', model: DEFAULT_MODEL, voiceMap };
}

module.exports = { hasOpenAiTts, synthesizeIeltsListeningAudio };
