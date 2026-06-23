const path = require('path');

const AUDIO_EXT = new Set(['.mp3', '.m4a', '.wav']);
const QUESTION_EXT = new Set(['.pdf', '.txt', '.json']);

function stemOf(filename) {
  return path.basename(filename, path.extname(filename)).toLowerCase();
}

// 按文件名(去扩展名)自动配对音频+题目文件。配不上的(缺一半/同stem下有多个同类文件)
// 留给前端做手动指定。
function pairFiles(files) {
  const groups = new Map();
  for (const f of files) {
    const ext = path.extname(f.originalname).toLowerCase();
    const stem = stemOf(f.originalname);
    if (!groups.has(stem)) groups.set(stem, { audio: [], question: [] });
    if (AUDIO_EXT.has(ext)) groups.get(stem).audio.push(f);
    else if (QUESTION_EXT.has(ext)) groups.get(stem).question.push(f);
  }

  const pairs = [];
  const unpaired = [];
  for (const [stem, g] of groups) {
    if (g.audio.length === 1 && g.question.length === 1) {
      pairs.push({ stem, audioFile: g.audio[0], questionFile: g.question[0] });
    } else {
      g.audio.forEach((f) => unpaired.push({ ...f, kind: 'audio', stem }));
      g.question.forEach((f) => unpaired.push({ ...f, kind: 'question', stem }));
    }
  }
  return { pairs, unpaired };
}

module.exports = { pairFiles, AUDIO_EXT, QUESTION_EXT };
