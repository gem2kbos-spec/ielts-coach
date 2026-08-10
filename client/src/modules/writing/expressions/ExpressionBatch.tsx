import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import FloatingToast from '@/components/FloatingToast'
import StatePanel from '@/components/StatePanel'
import { cn } from '@/lib/utils'
import { useDraftAutosave } from '@/hooks/useDraftAutosave'
import { useFocusMode } from '@/hooks/useFocusMode'
import DraftStatus from '@/components/DraftStatus'
import { CheckCircle2, ListChecks, Sparkles } from 'lucide-react'
import {
  getExpressionQueue,
  gradeExpression,
  addVocab,
  type ExpressionItem,
  type ExpressionQueueStatus,
  type PhraseGradeResult,
  type SentenceGradeResult,
} from '@/lib/api'
import ExpressionAnalysis from './ExpressionAnalysis'

const BATCH_SIZE = 10

type ItemState = {
  item: ExpressionItem
  answer: string
  grading: boolean
  result: (PhraseGradeResult & SentenceGradeResult) | null
  error: string
}

export default function ExpressionBatch() {
  const [searchParams] = useSearchParams()
  const [batch, setBatch] = useState<ItemState[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [gradingAll, setGradingAll] = useState(false)
  const [gradingProgress, setGradingProgress] = useState<{ done: number; total: number } | null>(null)
  const [vocabPopup, setVocabPopup] = useState<{ x: number; y: number; word: string; context: string; itemId: string } | null>(null)
  const [vocabToast, setVocabToast] = useState('')
  const seenIds = useRef<Set<string>>(new Set())
  const sessionId = useRef(crypto.randomUUID())
  const focusMode = useFocusMode()

  const queueParams = {
    status: (searchParams.get('status') as ExpressionQueueStatus) || 'endless',
    type: (searchParams.get('type') as 'phrase' | 'sentence' | null) || undefined,
    category: searchParams.get('category') || undefined,
    difficulty: searchParams.get('difficulty') || undefined,
    task: searchParams.get('task') || undefined,
    q: searchParams.get('q') || undefined,
  }
  const loadKey = `${queueParams.status}|${queueParams.type || ''}|${queueParams.category || ''}|${queueParams.difficulty || ''}|${queueParams.task || ''}|${queueParams.q || ''}`

  const loadBatch = async () => {
    setLoadError('')
    setBatch(null)
    setGradingAll(false)
    setGradingProgress(null)
    seenIds.current = new Set()
    sessionId.current = crypto.randomUUID()
    try {
      const { items } = await getExpressionQueue({
        ...queueParams,
        excludeIds: [...seenIds.current],
        limit: BATCH_SIZE,
      })
      if (items.length === 0) {
        setLoadError('当前筛选下没有未练过的新题了。可以换分类、切换词组/句子，或者去练习记录里复习旧题。')
        return
      }
      items.forEach((it) => seenIds.current.add(it.id))
      setBatch(items.map((item) => ({ item, answer: '', grading: false, result: null, error: '' })))
    } catch (e) {
      setLoadError((e as Error).message)
    }
  }

  useEffect(() => { loadBatch() }, [loadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const gradedCount = batch?.filter((r) => r.result).length ?? 0
  const answeredCount = batch?.filter((r) => r.answer.trim() && !r.result).length ?? 0
  const allGraded = batch !== null && batch.every((r) => r.result !== null)
  const progressPercent = gradingProgress && gradingProgress.total > 0
    ? Math.round((gradingProgress.done / gradingProgress.total) * 100)
    : 0
  const draft = useDraftAutosave<Array<{ itemId: string; answer: string }>>({
    storageKey: `draft:expression-batch:no-repeat-v2:${loadKey}`,
    value: batch?.map((row) => ({ itemId: row.item.id, answer: row.answer })) || [],
    enabled: !!batch && !allGraded,
    onLoad: (saved) => {
      setBatch((prev) => prev?.map((row) => ({
        ...row,
        answer: saved.find((entry) => entry.itemId === row.item.id)?.answer || row.answer,
      })) ?? prev)
    },
  })

  const setAnswer = (i: number, val: string) => {
    setBatch((prev) => prev?.map((r, idx) => idx === i ? { ...r, answer: val } : r) ?? null)
  }

  const gradeOne = async (i: number, overrideAnswer?: string) => {
    if (!batch) return
    const row = batch[i]
    if (row.result || row.grading) return
    const answer = (overrideAnswer ?? row.answer).trim()
    if (!answer) return

    setBatch((prev) => prev?.map((r, idx) => idx === i ? { ...r, grading: true, error: '' } : r) ?? null)
    try {
      const result = await gradeExpression(row.item.id, answer, sessionId.current)
      setBatch((prev) => prev?.map((r, idx) => idx === i ? { ...r, grading: false, result, answer } : r) ?? null)
    } catch (e) {
      setBatch((prev) => prev?.map((r, idx) => idx === i ? { ...r, grading: false, error: (e as Error).message } : r) ?? null)
    }
  }

  const gradeAll = async () => {
    if (!batch || gradingAll) return
    setGradingAll(true)
    // 只批改有答案且未批改的题
    const ungraded = batch.map((r, i) => ({ row: r, i })).filter(({ row }) => !row.result && !row.grading && row.answer.trim())
    // 标记所有将批改项为 grading:true
    setBatch((prev) => prev?.map((r, idx) =>
      ungraded.some(u => u.i === idx) ? { ...r, grading: true, error: '' } : r
    ) ?? null)
    setGradingProgress({ done: 0, total: ungraded.length })

    let cursor = 0
    const worker = async () => {
      while (cursor < ungraded.length) {
        const current = ungraded[cursor++]
        const { row, i } = current
        try {
          const result = await gradeExpression(row.item.id, row.answer.trim(), sessionId.current)
          setBatch((prev) => prev?.map((r, idx) => idx === i ? { ...r, grading: false, result } : r) ?? null)
        } catch (e) {
          setBatch((prev) => prev?.map((r, idx) => idx === i ? { ...r, grading: false, error: (e as Error).message } : r) ?? null)
        } finally {
          setGradingProgress((prev) => prev ? { ...prev, done: prev.done + 1 } : prev)
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(3, ungraded.length) }, worker))
    setGradingAll(false)
    setGradingProgress(null)
  }

  const handleResultMouseUp = (itemId: string) => () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return setVocabPopup(null)
    const text = sel.toString().trim()
    if (!text || text.split(/\s+/).length > 6) return setVocabPopup(null)
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const container = range.commonAncestorContainer
    const contextEl = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as HTMLElement)
    setVocabPopup({ x: rect.left + rect.width / 2, y: rect.top - 8, word: text, context: contextEl?.textContent?.trim().slice(0, 200) || '', itemId })
  }

  const markAsVocab = async () => {
    if (!vocabPopup) return
    try {
      await addVocab({ word: vocabPopup.word, contextSentence: vocabPopup.context, sourceItemId: vocabPopup.itemId })
      setVocabToast(`已加入词汇库：${vocabPopup.word}`)
      setTimeout(() => setVocabToast(''), 2500)
    } catch (e) {
      setVocabToast((e as Error).message)
    } finally {
      setVocabPopup(null)
      window.getSelection()?.removeAllRanges()
    }
  }

  if (loadError) return (
    <StatePanel
      title="这组定量练习暂时拿不到"
      description={loadError}
      tone="empty"
      backTo="/writing/expressions"
      backLabel="返回表达训练"
    />
  )

  if (!batch) return <StatePanel title="正在准备定量练习" description="系统正在抽取这一轮的 10 道题目。" tone="loading" backTo="/writing/expressions" backLabel="返回表达训练" />

  return (
    <div className={cn('mx-auto max-w-5xl space-y-5 px-5 py-8 pb-32 sm:px-6 lg:px-8', focusMode.enabled && 'max-w-6xl px-4 pt-4 sm:px-4')}>
      <div className="flex flex-wrap items-center justify-between gap-3 lg:pr-44">
        <Link to="/writing/expressions" className="text-sm text-muted-foreground hover:underline">← 返回表达训练</Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <DraftStatus status={draft.status} />
          <Badge variant="outline" className="rounded-full">{gradedCount}/{batch.length} 已批改</Badge>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
              <ListChecks className="h-3.5 w-3.5 text-primary" />
              Expression Batch
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">定量练习</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                一次完成 10 题。可以逐题批改，也可以写完后统一批改，解析区支持划词加入生词库。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: ListChecks, label: '本轮题目', value: String(batch.length), desc: '固定 10 题一组' },
              { icon: CheckCircle2, label: '已批改', value: `${gradedCount}/${batch.length}`, desc: '已展开 AI 解析' },
              { icon: Sparkles, label: '待批改', value: String(answeredCount), desc: '已填写但未批改' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/48 p-4 backdrop-blur-xl">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/55 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</div>
                  <div className="mt-3 text-xl font-semibold">{stat.value}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.desc}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {gradingProgress && (
        <Card className="rounded-[24px] border-border/70 bg-card/85">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between text-sm">
              <span>正在批改本轮定量练习</span>
              <span className="text-muted-foreground">{gradingProgress.done}/{gradingProgress.total}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary transition-[width]" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">剩余 {Math.max(gradingProgress.total - gradingProgress.done, 0)} 题，系统会自动限流并发批改。</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {batch.map((row, i) => {
          const isPhrase = row.item.subtype === 'phrase_drill'
          return (
            <Card key={row.item.id} className={cn('rounded-[26px]', row.result && 'border-primary/20 bg-card/88')}>
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/50 text-sm font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <p className="font-medium text-lg leading-8">{row.item.content.chinese}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 rounded-full text-xs">{isPhrase ? '词组' : '句子'}</Badge>
                </div>

                {!row.result ? (
                  <div className="space-y-2">
                    {isPhrase ? (
                      <Input
                        value={row.answer}
                        onChange={(e) => setAnswer(i, e.target.value)}
                        placeholder="写出英文表达…"
                        onKeyDown={(e) => e.key === 'Enter' && gradeOne(i)}
                        disabled={row.grading}
                        className={cn('h-12 rounded-2xl text-base', focusMode.enabled && 'h-14 text-[17px]')}
                      />
                    ) : (
                      <Textarea
                        value={row.answer}
                        onChange={(e) => setAnswer(i, e.target.value)}
                        placeholder="写出英文句子…"
                        className={cn('min-h-[110px] rounded-2xl text-base leading-7', focusMode.enabled && 'min-h-[140px] text-[17px] leading-8')}
                        disabled={row.grading}
                      />
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => gradeOne(i)}
                        disabled={row.grading || !row.answer.trim()}
                      >
                        {row.grading ? '批改中…' : '批改'}
                      </Button>
                      {row.error && <span className="text-xs text-destructive">{row.error}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 select-text" onMouseUp={handleResultMouseUp(row.item.id)}>
                    {row.answer.trim() && (
                      <p className="text-sm text-muted-foreground">
                        你写的：<span className="text-foreground">{row.answer}</span>
                      </p>
                    )}
                    <ExpressionAnalysis result={row.result} isPhrase={isPhrase} />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {vocabPopup && (
        <div
          style={{ position: 'fixed', left: vocabPopup.x, top: vocabPopup.y, transform: 'translate(-50%, -100%)', zIndex: 50 }}
        >
          <Button size="sm" className="rounded-full shadow-lg" onClick={markAsVocab}>标记生词</Button>
        </div>
      )}

      {vocabToast && (
        <FloatingToast message={vocabToast} tone="success" />
      )}

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-card/72 shadow-[0_-12px_40px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
        <div className={cn('mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3 sm:px-6 lg:px-8', focusMode.enabled && 'max-w-6xl px-4 sm:px-4')}>
          <span className="text-sm text-muted-foreground">
            {allGraded
              ? `全部批改完成，共 ${batch.length} 题`
              : answeredCount > 0
                ? gradingProgress
                  ? `正在批改 ${gradingProgress.done}/${gradingProgress.total}`
                  : `${answeredCount} 题已填写待批改`
                : `${gradedCount}/${batch.length} 已批改`}
          </span>
          <div className="flex gap-2">
            {!allGraded && (
              <Button
                onClick={gradeAll}
                disabled={gradingAll || answeredCount === 0}
                className="rounded-full"
              >
                {gradingAll && gradingProgress ? `批改中 ${gradingProgress.done}/${gradingProgress.total}` : `全部批改（${answeredCount} 题）`}
              </Button>
            )}
            {allGraded && (
              <Button className="rounded-full" onClick={() => { draft.clear(); loadBatch() }}>再来一组 →</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
