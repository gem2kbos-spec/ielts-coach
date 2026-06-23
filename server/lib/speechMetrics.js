const PAUSE_THRESHOLD_MS = 500;

// 基于 whisper 分段时间戳估算语速(WPM)和停顿次数，用于影子跟读的数值对比。
function computeSpeechMetrics(segments, durationSec) {
  const wordCount = segments.reduce((sum, seg) => sum + seg.text.split(/\s+/).filter(Boolean).length, 0);
  const minutes = Math.max(durationSec, 1) / 60;
  const wpm = Math.round(wordCount / minutes);

  let pauseCount = 0;
  for (let i = 1; i < segments.length; i += 1) {
    const gap = segments[i].fromMs - segments[i - 1].toMs;
    if (gap > PAUSE_THRESHOLD_MS) pauseCount += 1;
  }

  return { wordCount, wpm, pauseCount, durationSec };
}

module.exports = { computeSpeechMetrics };
