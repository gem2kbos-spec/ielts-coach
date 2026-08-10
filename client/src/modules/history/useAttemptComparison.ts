import { useEffect, useState } from 'react'
import { getHistoryDetail, type AttemptDetail } from '@/lib/api'

// 提交后立刻在结果页就能看到"对比上次"，不用专门跑去练习记录页才看到——
// 拿到attemptId后单独查一次详情(里面已经算好了previous/delta)，静默失败就好，
// 没有比较数据不影响主结果的展示。
export function useAttemptComparison(attemptId: string | undefined) {
  const [comparison, setComparison] = useState<Pick<AttemptDetail, 'previous' | 'delta'> | null>(null)

  useEffect(() => {
    if (!attemptId) return
    getHistoryDetail(attemptId)
      .then((d) => setComparison({ previous: d.previous, delta: d.delta }))
      .catch(() => {})
  }, [attemptId])

  return comparison
}
