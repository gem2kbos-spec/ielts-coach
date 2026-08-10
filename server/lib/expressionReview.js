// 表达训练自己的间隔复习算法——跟词汇模块完全独立，不复用/不重新点燃词汇的SRS。
// 规则很简单：连续答对(correct)按1/3/7天递增间隔，满3次连续correct直接转mastered；
// partial(基本正确)算"过了但不算扎实"，间隔小幅推进、连续数不清零也不增加；
// wrong直接清零连续数，间隔重置为1天，明天就该再见到它。
const INTERVALS = [1, 3, 7];

function computeNextReview({ consecutiveCorrect = 0, intervalDays = 0, result, now = new Date() }) {
  let nextConsecutive = consecutiveCorrect;
  let nextInterval = intervalDays;
  let status = 'learning';

  if (result === 'correct') {
    nextConsecutive = consecutiveCorrect + 1;
    if (nextConsecutive >= 3) {
      return {
        status: 'mastered',
        consecutiveCorrect: nextConsecutive,
        intervalDays: INTERVALS[INTERVALS.length - 1],
        nextDueAt: addDays(now, 30).toISOString(),
        lastResult: result,
      };
    }
    nextInterval = INTERVALS[Math.min(nextConsecutive - 1, INTERVALS.length - 1)];
  } else if (result === 'partial') {
    nextInterval = Math.max(1, Math.round((intervalDays || 1) / 2));
  } else {
    nextConsecutive = 0;
    nextInterval = 1;
  }

  return {
    status,
    consecutiveCorrect: nextConsecutive,
    intervalDays: nextInterval,
    nextDueAt: addDays(now, nextInterval).toISOString(),
    lastResult: result,
  };
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

module.exports = { computeNextReview };
