// 算"这次 vs 上一次同类型练习"的差值——band类(写作/口语)比总分+各分项，
// 正确率类(阅读/听力)只比正确率。纯函数，不查库，方便单测。
function computeAttemptDelta(current, previous) {
  if (!previous) return null;

  const curBand = current?.band_overall;
  const prevBand = previous?.band_overall;
  if (typeof curBand === 'number' && typeof prevBand === 'number') {
    const scoreDelta = {};
    const curScores = current?.score?.scores;
    const prevScores = previous?.score?.scores;
    if (curScores && prevScores) {
      for (const k of Object.keys(curScores)) {
        if (typeof curScores[k] === 'number' && typeof prevScores[k] === 'number') {
          scoreDelta[k] = Math.round((curScores[k] - prevScores[k]) * 10) / 10;
        }
      }
    }
    return {
      kind: 'band',
      bandDelta: Math.round((curBand - prevBand) * 10) / 10,
      scoreDelta,
    };
  }

  const curAcc = current?.score?.accuracy;
  const prevAcc = previous?.score?.accuracy;
  if (typeof curAcc === 'number' && typeof prevAcc === 'number') {
    return {
      kind: 'accuracy',
      accuracyDelta: Math.round((curAcc - prevAcc) * 10) / 10,
    };
  }

  return null;
}

module.exports = { computeAttemptDelta };
