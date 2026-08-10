// 听写模式的逐词对比——经典LCS(最长公共子序列)算法，比单纯按位置比对更稳健：
// 用户漏听/多打一个词时，后面的词不会因为"错位"而全部被判错。
// 返回的diff数组按"原文"逐词标注：matched(听对了)/missing(漏听了)，
// 用户多打的词单独放进extra(他们打了原文里没有的内容)。
function normalizeWord(w) {
  return w.toLowerCase().replace(/[.,!?;:"'""]+$/, '').replace(/^["'""]+/, '');
}

function tokenize(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function computeDictationDiff(transcript, userText) {
  const refWords = tokenize(transcript);
  const userWords = tokenize(userText || '');
  const refNorm = refWords.map(normalizeWord);
  const userNorm = userWords.map(normalizeWord);

  const n = refNorm.length;
  const m = userNorm.length;
  // dp[i][j] = LCS长度，i取自refNorm前i个，j取自userNorm前j个
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (refNorm[i - 1] === userNorm[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯找出匹配上的(i,j)对
  const matchedRefIdx = new Set();
  const matchedUserIdx = new Set();
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (refNorm[i - 1] === userNorm[j - 1]) {
      matchedRefIdx.add(i - 1);
      matchedUserIdx.add(j - 1);
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  const refDiff = refWords.map((word, idx) => ({ word, matched: matchedRefIdx.has(idx) }));
  const extraWords = userWords.filter((_, idx) => !matchedUserIdx.has(idx));
  const correctCount = matchedRefIdx.size;

  return {
    refDiff,
    extraWords,
    correctCount,
    totalWords: n,
    accuracy: n > 0 ? Math.round((correctCount / n) * 1000) / 10 : 0,
  };
}

module.exports = { computeDictationDiff };
