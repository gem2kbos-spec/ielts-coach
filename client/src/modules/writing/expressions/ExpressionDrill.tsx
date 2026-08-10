import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpenText, Clock3, ListChecks, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import FloatingToast from '@/components/FloatingToast'
import {
  listExpressions,
  getExpressionQueue,
  gradeExpression,
  addVocab,
  type ExpressionItem,
  type ExpressionQueueStatus,
  type PhraseGradeResult,
  type SentenceGradeResult,
} from '@/lib/api'
import ExpressionAnalysis from './ExpressionAnalysis'
import StatePanel from '@/components/StatePanel'
import { useDraftAutosave } from '@/hooks/useDraftAutosave'
import DraftStatus from '@/components/DraftStatus'

type VocabPopup = { x: number; y: number; word: string; context: string } | null
type SessionEntry = { item: ExpressionItem; answer: string; result: PhraseGradeResult & SentenceGradeResult }

const RESULT_LABEL: Record<string, { label: string; className: string }> = {
  correct: { label: '完全正确', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  partial: { label: '基本正确', className: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' },
  wrong: { label: '有误', className: 'bg-destructive/15 text-destructive' },
}

const STATUS_LABEL: Record<ExpressionQueueStatus, string> = {
  practiced: '已练习专项',
  correct: '完全正确专项',
  partial: '基本正确专项',
  wrong: '有误专项',
  endless: '无尽模式',
}

const BATCH_SIZE = 20
const REFILL_THRESHOLD = 3

export default function ExpressionDrill() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') as ExpressionQueueStatus | null
  const singleId = searchParams.get('id')
  const queueParams = {
    type: (searchParams.get('type') as 'phrase' | 'sentence' | null) || undefined,
    category: searchParams.get('category') || undefined,
    difficulty: searchParams.get('difficulty') || undefined,
    task: searchParams.get('task') || undefined,
    q: searchParams.get('q') || undefined,
  }
  const loadKey = `${status || ''}|${singleId || ''}|${queueParams.type || ''}|${queueParams.category || ''}|${queueParams.difficulty || ''}|${queueParams.task || ''}|${queueParams.q || ''}`

  const [queue, setQueue] = useState<ExpressionItem[] | null>(null)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState<(PhraseGradeResult & SentenceGradeResult) | null>(null)
  const [error, setError] = useState('')
  const [exhausted, setExhausted] = useState(false)
  const [vocabPopup, setVocabPopup] = useState<VocabPopup>(null)
  const [vocabToast, setVocabToast] = useState('')
  const [sessionLog, setSessionLog] = useState<SessionEntry[]>([])
  const [showLog, setShowLog] = useState(false)
  const [expandedLog, setExpandedLog] = useState<Set<number>>(new Set())
  const seenIds = useRef<Set<string>>(new Set())
  const fetchingMore = useRef(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const sessionId = useRef(crypto.randomUUID())
  const draft = useDraftAutosave({
    storageKey: `draft:expression-drill:no-repeat-v2:${loadKey}`,
    value: { queue: queue || [], index, answer, result, sessionLog, exhausted },
    enabled: !!queue && queue.length > 0,
    onLoad: (saved: {
      queue: ExpressionItem[]
      index: number
      answer: string
      result: (PhraseGradeResult & SentenceGradeResult) | null
      sessionLog: SessionEntry[]
      exhausted: boolean
    }) => {
      if (!saved || !Array.isArray(saved.queue) || saved.queue.length === 0) return
      setQueue(saved.queue)
      setIndex(saved.index || 0)
      setAnswer(saved.answer || '')
      setResult(saved.result || null)
      setSessionLog(saved.sessionLog || [])
      setExhausted(Boolean(saved.exhausted))
      seenIds.current = new Set(saved.queue.map((item) => item.id))
    },
  })

  const fetchMore = async () => {
    if (!status || fetchingMore.current) return
    fetchingMore.current = true
    try {
      const { items } = await getExpressionQueue({
        status,
        ...queueParams,
        excludeIds: [...seenIds.current],
        limit: BATCH_SIZE,
      })
      if (items.length === 0) {
        setExhausted(true)
      } else {
        items.forEach((i) => seenIds.current.add(i.id))
        setQueue((prev) => [...(prev || []), ...items])
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      fetchingMore.current = false
    }
  }

  useEffect(() => {
    let cancelled = false
    setQueue(null)
    setIndex(0)
    setAnswer('')
    setResult(null)
    setError('')
    setExhausted(false)
    setSessionLog([])
    setShowLog(false)
    setExpandedLog(new Set())
    seenIds.current = new Set()
    sessionId.current = crypto.randomUUID()

    const run = async () => {
      if (status) {
        fetchingMore.current = false
        try {
          const { items } = await getExpressionQueue({
            status,
            ...queueParams,
            excludeIds: [],
            limit: BATCH_SIZE,
          })
          if (cancelled) return
          if (items.length === 0) {
            setQueue([])
            setExhausted(true)
          } else {
            items.forEach((i) => seenIds.current.add(i.id))
            setQueue(items)
            setExhausted(false)
          }
        } catch (e) {
          if (!cancelled) setError((e as Error).message)
        }
      } else if (singleId) {
        try {
          const all = await listExpressions({})
          if (cancelled) return
          const item = all.find((i) => i.id === singleId)
          setQueue(item ? [item] : [])
        } catch (e) {
          if (!cancelled) setError((e as Error).message)
        }
      }
    }

    run()
    return () => { cancelled = true }
    // loadKey intentionally captures status, singleId and queue filters as one stable reset key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey])

  useEffect(() => {
    if (status && queue && index >= queue.length - REFILL_THRESHOLD && !exhausted) {
      fetchMore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, queue])

  const current = queue?.[index]
  const isPhrase = current?.subtype === 'phrase_drill'

  const submit = async () => {
    if (!current || !answer.trim()) return
    setGrading(true)
    setError('')
    try {
      const data = await gradeExpression(current.id, answer.trim(), sessionId.current)
      setResult(data)
      setSessionLog((prev) => [...prev, { item: current, answer: answer.trim(), result: data }])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGrading(false)
    }
  }

  const next = () => {
    setAnswer('')
    setResult(null)
    setIndex((i) => i + 1)
    setVocabPopup(null)
  }

  const handleResultMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !resultRef.current) return setVocabPopup(null)
    const text = sel.toString().trim()
    if (!text || text.split(/\s+/).length > 6) return setVocabPopup(null)
    const range = sel.getRangeAt(0)
    if (!resultRef.current.contains(range.commonAncestorContainer)) return setVocabPopup(null)
    const rect = range.getBoundingClientRect()
    const container = range.commonAncestorContainer
    const contextEl = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as HTMLElement)
    setVocabPopup({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      word: text,
      context: contextEl?.textContent?.trim().slice(0, 200) || '',
    })
  }

  const markAsVocab = async () => {
    if (!vocabPopup || !current) return
    try {
      await addVocab({ word: vocabPopup.word, contextSentence: vocabPopup.context, sourceItemId: current.id })
      setVocabToast(`已加入词汇库：${vocabPopup.word}`)
      setTimeout(() => setVocabToast(''), 2000)
    } catch (e) {
      setVocabToast((e as Error).message)
    } finally {
      setVocabPopup(null)
      window.getSelection()?.removeAllRanges()
    }
  }

  const toggleLogExpand = (i: number) => {
    setExpandedLog((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const renderLogModal = () => (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-[28px] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h2 className="font-semibold">本次记录（{sessionLog.length} 题）</h2>
          <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setShowLog(false)}>关闭</Button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {sessionLog.map((entry, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-background/50">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => toggleLogExpand(i)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className={`shrink-0 rounded-full ${RESULT_LABEL[entry.result.result]?.className}`}>
                    {RESULT_LABEL[entry.result.result]?.label}
                  </Badge>
                  <span className="text-sm truncate">{entry.item.content.chinese}</span>
                </div>
                <span className="text-xs text-muted-foreground ml-2">{expandedLog.has(i) ? '▲' : '▼'}</span>
              </button>
              {expandedLog.has(i) && (
                <div className="space-y-2 border-t border-border px-4 pb-4 pt-3 text-sm">
                  <p className="text-muted-foreground">你的答案：<span className="text-foreground">{entry.answer}</span></p>
                  <ExpressionAnalysis result={entry.result} isPhrase={entry.item.subtype === 'phrase_drill'} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (error) {
    return (
      <StatePanel
        title="这轮表达练习暂时没打开"
        description={error}
        tone="error"
        backTo="/writing/expressions"
        backLabel="返回表达训练"
      />
    )
  }
  if (!queue) {
    return (
      <StatePanel
        title="正在准备本轮表达练习"
        description="系统正在抽题、载入练习条件，并同步本次训练记录。"
        tone="loading"
        backTo="/writing/expressions"
        backLabel="返回表达训练"
      />
    )
  }

  if (queue.length === 0) {
    return (
      <StatePanel
        title={status === 'endless' ? '当前筛选下没有未练过的新题' : status ? '当前筛选条件下没有匹配题目' : '暂时没有题目可练习'}
        description={status === 'endless' ? '你已经看过这些题的解析了。可以换分类、切换词组/句子，或者去练习记录里复习旧题。' : status ? '换个筛选条件，或者先做几题再回来复习。' : '可以去表达训练页切换分类、添加自定义表达，或者直接开始无尽模式。'}
        tone="empty"
        backTo="/writing/expressions"
        backLabel="返回表达训练"
      />
    )
  }

  if (index >= queue.length) {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-4">
        <Link to="/writing/expressions" className="text-sm text-muted-foreground hover:underline">
          ← 返回表达训练
        </Link>
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardContent className="py-8 text-center space-y-2">
            <div className="text-2xl font-bold text-primary [text-shadow:var(--glow-primary-strong)]">完成！</div>
            <p className="text-sm text-muted-foreground">
              本次{status ? STATUS_LABEL[status] : ''}练习了 {queue.length} 题，目前没有更多未解析过的新题了。
            </p>
            {sessionLog.length > 0 && (
              <Button variant="outline" className="rounded-full" onClick={() => setShowLog(true)}>
                查看本次记录（{sessionLog.length} 题）
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 完成屏也要渲染 modal，否则点击上面的按钮无效 */}
        {showLog && renderLogModal()}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Link to="/writing/expressions" className="text-sm text-muted-foreground hover:underline">
          ← 返回表达训练
        </Link>
        <div className="flex items-center gap-2">
          <DraftStatus status={draft.status} onClear={draft.clear} compact />
          {status && <Badge variant="outline" className="rounded-full">{STATUS_LABEL[status]}</Badge>}
          <Badge variant="outline" className="rounded-full">第 {index + 1} 题</Badge>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Expression Drill
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{isPhrase ? '词组练习' : '句子翻译'}</h1>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                单题模式下先写答案，再看解析。解析里的词也可以继续提取到生词库。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Clock3, label: '当前进度', value: `${index + 1}`, desc: `本轮共 ${queue.length} 题` },
              { icon: ListChecks, label: '已记录', value: String(sessionLog.length), desc: '本次已保存解析' },
              { icon: BookOpenText, label: '分类', value: current!.content.category, desc: isPhrase ? '词组表达专项' : '句子表达专项' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
        <CardHeader>
          <CardTitle className="text-base">{isPhrase ? '词组' : '句子'}翻译 · {current!.content.category}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background/65 p-5">
            <p className="text-2xl font-medium leading-10">{current!.content.chinese}</p>
          </div>

          {!result && (
            <>
              {isPhrase ? (
                <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="写出对应的英文表达…" className="h-12 rounded-2xl" onKeyDown={(e) => e.key === 'Enter' && submit()} />
              ) : (
                <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="写出对应的英文句子…" className="min-h-[140px] rounded-2xl" />
              )}
              <div className="flex gap-2">
                <Button className="rounded-xl px-5" onClick={submit} disabled={grading || !answer.trim()}>
                  {grading ? '判分中…' : '提交'}
                </Button>
                <Button variant="outline" className="rounded-xl px-5" onClick={next}>
                  跳过
                </Button>
              </div>
            </>
          )}

          {result && (
            <div className="space-y-4 select-text" ref={resultRef} onMouseUp={handleResultMouseUp}>
              <ExpressionAnalysis result={result} isPhrase={isPhrase} />
              <Button onClick={next} className="h-11 w-full rounded-xl text-base">
                下一题
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 本次记录浮动按钮 */}
      {sessionLog.length > 0 && !showLog && (
        <button
          onClick={() => setShowLog(true)}
          className="fixed bottom-6 left-6 rounded-full border border-border bg-card/92 px-4 py-2 text-sm shadow-lg backdrop-blur hover:border-primary transition-colors"
        >
          本次记录 ({sessionLog.length})
        </button>
      )}

      {showLog && renderLogModal()}

      {vocabPopup && (
        <div
          style={{ position: 'fixed', left: vocabPopup.x, top: vocabPopup.y, transform: 'translate(-50%, -100%)', zIndex: 50 }}
        >
          <Button size="sm" className="rounded-xl" onClick={markAsVocab}>
            标记生词
          </Button>
        </div>
      )}

      {vocabToast && (
        <FloatingToast message={vocabToast} tone="success" />
      )}
    </div>
  )
}
