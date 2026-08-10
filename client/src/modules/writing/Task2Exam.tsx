import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWritingTimer } from '@/hooks/useWritingTimer'
import { countWords } from '@/lib/wordCount'
import { getRandomTask2, getWritingItemById, gradeTask2, type WritingItem } from '@/lib/api'
import ReviewPanel, { type GradeResult } from './ReviewPanel'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'
import ComparisonCard from '@/modules/history/ComparisonCard'
import { useAttemptComparison } from '@/modules/history/useAttemptComparison'
import { cn } from '@/lib/utils'
import { useDraftAutosave } from '@/hooks/useDraftAutosave'
import { useFocusMode } from '@/hooks/useFocusMode'
import DraftStatus from '@/components/DraftStatus'

const STANDARD_SECONDS = 40 * 60

export default function Task2Exam() {
  const [searchParams] = useSearchParams()
  const [item, setItem] = useState<WritingItem | null>(null)
  const [essayText, setEssayText] = useState('')
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState<GradeResult | null>(null)
  const [error, setError] = useState('')
  const timer = useWritingTimer(STANDARD_SECONDS)
  const comparison = useAttemptComparison(result?.attemptId)
  const focusMode = useFocusMode()

  const loadNewPrompt = (specificId?: string) => {
    setItem(null)
    setResult(null)
    setEssayText('')
    timer.reset()
    const id = specificId || searchParams.get('generated')
    if (id) {
      getWritingItemById(id).then((i) => setItem(i as WritingItem)).catch((e) => setError(e.message))
    } else {
      getRandomTask2().then(setItem).catch((e) => setError(e.message))
    }
  }

  const draft = useDraftAutosave<string>({
    storageKey: item ? `draft:writing:task2:${item.id}` : 'draft:writing:task2:pending',
    value: essayText,
    onLoad: setEssayText,
    enabled: !!item && !result,
    serialize: (value) => value,
    deserialize: (raw) => raw,
  })

  useEffect(() => {
    loadNewPrompt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const wordCount = countWords(essayText)

  const handleSubmit = async () => {
    if (!item) return
    if (!timer.started) {
      setError('请先点击 Start Timer 再提交。')
      return
    }
    setGrading(true)
    setError('')
    timer.pause()
    try {
      const data = await gradeTask2({
        itemId: item.id,
        essayText,
        durationSec: timer.getElapsed(),
        onTime: !timer.isOvertime,
        overtimeSeconds: timer.overtime,
      })
      draft.clear()
      setResult(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGrading(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-4">
        <MockSessionBanner />
        <div className="flex items-center justify-between mb-4">
          <Link to="/writing" className="text-sm text-muted-foreground hover:underline">
            ← 返回写作菜单
          </Link>
          <Button variant="outline" onClick={() => loadNewPrompt()}>
            换一题再练
          </Button>
        </div>
        {comparison && <ComparisonCard previous={comparison.previous} delta={comparison.delta} />}
        <ReviewPanel result={result} essayText={essayText} />
      </div>
    )
  }

  return (
    <div className={cn('mx-auto max-w-5xl px-5 py-8 sm:px-6 lg:px-8', focusMode.enabled && 'max-w-[1760px] px-4 py-4 sm:px-4')}>
      {!focusMode.enabled && <MockSessionBanner />}

      <div className="mb-5 rounded-[28px] border border-border/70 bg-card/85 p-5 pr-24 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6 sm:pr-32 xl:pr-44">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            {!focusMode.enabled && (
              <Link to="/writing" className="inline-flex text-sm text-muted-foreground hover:underline">
                ← 返回写作菜单
              </Link>
            )}
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                IELTS Writing Task 2
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">写作 Task 2</h1>
              {!focusMode.enabled && (
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                  议论文写作区保持长时间专注模式。开始前不计时，标准 40 分钟结束后继续显示超时计时。
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 lg:justify-end">
            <DraftStatus status={draft.status} />
            {!timer.started ? (
              <Button className="rounded-full px-4" onClick={timer.start}>Start Timer</Button>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/75 px-3 py-2">
                <span className={cn('text-2xl font-mono tabular-nums', timer.colorClass)}>
                  {timer.formatDisplay()}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={timer.paused ? timer.resume : timer.pause}
                  className="rounded-xl px-3 text-xs text-muted-foreground"
                >
                  {timer.paused ? '继续' : '暂停'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={cn('grid gap-4', focusMode.enabled && 'lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start')}>
      <Card className="mb-4 rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.05)] lg:mb-0">
        <CardHeader>
          <CardTitle className="text-base">题目</CardTitle>
        </CardHeader>
        <CardContent>
          {item ? <p className="text-[15px] leading-8">{item.content.prompt}</p> : <p className="text-muted-foreground">加载中…</p>}
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
        <CardContent className="pt-6">
          <textarea
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
            placeholder="在这里写你的文章…"
            className={cn('min-h-[520px] w-full resize-y rounded-2xl border border-border bg-background/55 p-4 text-[15px] leading-8 focus:outline-none focus:ring-2 focus:ring-ring', focusMode.enabled && 'min-h-[70vh] text-[16px] leading-8')}
          />
          <div className="flex items-center justify-between mt-3">
            <Badge variant={wordCount >= 250 ? 'default' : 'secondary'} className="rounded-full px-3 py-1.5">{wordCount} / 250 词</Badge>
            <Button className="rounded-xl px-5" onClick={handleSubmit} disabled={grading || wordCount < 50 || !timer.started}>
              {grading ? '评分中…（约 30-90 秒）' : timer.started ? '提交评分' : 'Start Timer 后提交'}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
