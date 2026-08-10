import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCheck, History, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { getExpressionHistory, getExpressionHistorySession, type ExpressionHistoryAttempt, type ExpressionHistorySession } from '@/lib/api'
import ExpressionAnalysis from './ExpressionAnalysis'
import StatePanel from '@/components/StatePanel'
import { useDraftAutosave } from '@/hooks/useDraftAutosave'
import { useFocusMode } from '@/hooks/useFocusMode'
import { cn } from '@/lib/utils'
import DraftStatus from '@/components/DraftStatus'

type RowState = {
  attempt: ExpressionHistoryAttempt
  newAnswer: string
  revealed: boolean
}
type ReviewSessionState = {
  legacy?: boolean
  rows: RowState[]
}

export default function ExpressionReview() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || ''
  const date = searchParams.get('date') || ''
  const [session, setSession] = useState<ReviewSessionState | null>(null)
  const [error, setError] = useState('')
  const focusMode = useFocusMode()

  useEffect(() => {
    if (!sessionId && !date) return
    const load: Promise<ExpressionHistorySession | null> = sessionId
      ? getExpressionHistorySession(sessionId)
      : getExpressionHistory().then((sessions) => {
          const session = sessions.find((s) => s.date === date)
          if (!session) return null
          return session
        })
    load
      .then((session) => {
        if (!session) { setSession({ rows: [] }); return }
        setSession({
          legacy: session.legacy,
          rows: session.attempts.map((a) => ({ attempt: a, newAnswer: '', revealed: false })),
        })
      })
      .catch((e) => setError(e.message))
  }, [date, sessionId])

  const setAnswer = (i: number, val: string) => {
    setSession((prev) => prev ? { ...prev, rows: prev.rows.map((r, idx) => idx === i ? { ...r, newAnswer: val } : r) } : prev)
  }

  const revealAll = () => {
    setSession((prev) => prev ? { ...prev, rows: prev.rows.map((r) => ({ ...r, revealed: true })) } : prev)
  }

  const revealOne = (i: number) => {
    setSession((prev) => prev ? { ...prev, rows: prev.rows.map((r, idx) => idx === i ? { ...r, revealed: true } : r) } : prev)
  }

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  const rows = session?.rows || []
  const revealedCount = rows.filter((r) => r.revealed).length
  const draft = useDraftAutosave<Array<{ attemptId: string; newAnswer: string; revealed: boolean }>>({
    storageKey: sessionId ? `draft:expression-review:${sessionId}` : `draft:expression-review:date:${date}`,
    value: rows.map((row) => ({ attemptId: row.attempt.attemptId, newAnswer: row.newAnswer, revealed: row.revealed })),
    enabled: rows.length > 0,
    onLoad: (saved) => {
      setSession((prev) => prev ? {
        ...prev,
        rows: prev.rows.map((row) => {
          const matched = saved.find((entry) => entry.attemptId === row.attempt.attemptId)
          return matched ? { ...row, newAnswer: matched.newAnswer, revealed: matched.revealed } : row
        }),
      } : prev)
    },
  })

  if (error) return <StatePanel title="这组再练记录暂时打不开" description={error} tone="error" backTo="/writing/expressions/history" backLabel="返回练习记录" />
  if (!session) return <StatePanel title="正在读取再练内容" description="系统正在整理这次练习对应的题目和旧解析。" tone="loading" backTo="/writing/expressions/history" backLabel="返回练习记录" />

  return (
    <div className={cn('mx-auto max-w-5xl space-y-5 px-5 py-8 pb-32 sm:px-6 lg:px-8', focusMode.enabled && 'max-w-6xl px-4 pt-4 sm:px-4')}>
      <div className="flex flex-wrap items-center justify-between gap-3 lg:pr-44">
        {!focusMode.enabled ? (
          <Link to="/writing/expressions/history" className="text-sm text-muted-foreground hover:underline">
            ← 返回练习记录
          </Link>
        ) : <div />}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {date ? <span>{formatDate(date)}</span> : null}
          <span>{rows.length} 题</span>
          <span>{revealedCount}/{rows.length} 已批改</span>
          <DraftStatus status={draft.status} />
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
              <History className="h-3.5 w-3.5 text-primary" />
              Expression Replay
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl">再练一次</CardTitle>
              <CardDescription>先把整组题重新写一遍，再按你的节奏查看之前保存的解析。</CardDescription>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: History, label: '题目数量', value: String(rows.length), desc: '本组需要重做的题' },
              { icon: CheckCheck, label: '已批改', value: `${revealedCount}/${rows.length}`, desc: '已经展开旧解析的题' },
              { icon: Sparkles, label: '记录状态', value: session.legacy ? '旧记录' : '完整记录', desc: session.legacy ? '解析为补全版本' : '解析来自原始保存' },
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

      {rows.length === 0 && <StatePanel title="没有找到这组练习" description="这条记录可能已经不存在，或者属于较早未完整归档的历史数据。" tone="empty" backTo="/writing/expressions/history" backLabel="返回练习记录" />}

      {rows.length > 0 && <div className="space-y-4">
        {rows.map((row, i) => {
          const isPhrase = row.attempt.subtype === 'phrase_drill'
          return (
            <Card key={row.attempt.attemptId} className={row.revealed ? 'rounded-[28px] border-primary/25 bg-card/85' : 'rounded-[28px] border-border/70 bg-card/85'}>
              <CardContent className="py-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground text-sm font-semibold">
                      {i + 1}
                    </div>
                    <p className="font-medium text-lg leading-8">{row.attempt.chinese}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
                    <Badge variant="outline" className="rounded-full text-xs">{isPhrase ? '词组' : '句子'}</Badge>
                    {row.attempt.result && (
                      <Badge className="rounded-full" variant={row.attempt.result === 'correct' ? 'default' : row.attempt.result === 'partial' ? 'secondary' : 'destructive'}>
                        {row.attempt.result === 'correct' ? '上次全对' : row.attempt.result === 'partial' ? '上次基本正确' : '上次有误'}
                      </Badge>
                    )}
                  </div>
                </div>

                {!row.revealed ? (
                  <div className="space-y-3">
                    {isPhrase ? (
                      <Input
                        value={row.newAnswer}
                        onChange={(e) => setAnswer(i, e.target.value)}
                        placeholder="写出英文表达…"
                        onKeyDown={(e) => e.key === 'Enter' && revealOne(i)}
                        className={cn('h-12 rounded-2xl text-base', focusMode.enabled && 'h-14 text-[17px]')}
                      />
                    ) : (
                      <Textarea
                        value={row.newAnswer}
                        onChange={(e) => setAnswer(i, e.target.value)}
                        placeholder="写出英文句子…"
                        className={cn('min-h-[110px] rounded-2xl text-base leading-7', focusMode.enabled && 'min-h-[140px] text-[17px] leading-8')}
                      />
                    )}
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => revealOne(i)}>
                      批改（看上次解析）
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {row.newAnswer && (
                      <p className="text-sm text-muted-foreground">你写的：<span className="text-foreground">{row.newAnswer}</span></p>
                    )}
                    <ExpressionAnalysis
                      result={row.attempt.analysis as Parameters<typeof ExpressionAnalysis>[0]['result']}
                      isPhrase={isPhrase}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>}

      {rows.length > 0 && rows.some((r) => !r.revealed) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-card/72 shadow-[0_-12px_40px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
          <div className={cn('max-w-5xl mx-auto px-5 py-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3', focusMode.enabled && 'max-w-6xl px-4 sm:px-4')}>
            <span className="text-sm text-muted-foreground">{rows.length - revealedCount} 题还没看解析</span>
            <div className="flex items-center gap-2">
              <DraftStatus status={draft.status} onClear={draft.clear} compact />
              <Button className="rounded-full px-5" onClick={revealAll}>
                全部批改
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
