import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, Clock3, History, RotateCcw, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getExpressionHistory, type ExpressionHistorySession } from '@/lib/api'
import StatePanel from '@/components/StatePanel'
import ExpressionAnalysis from './ExpressionAnalysis'
import { cn } from '@/lib/utils'

const RESULT_COLOR: Record<string, string> = {
  correct: 'bg-emerald-500/20 border-emerald-500 text-emerald-400',
  partial: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
  wrong: 'bg-red-500/20 border-red-500 text-red-400',
}

function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
}

function formatStartedAt(value: string) {
  const d = new Date(value.replace(' ', 'T'))
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export default function ExpressionHistory() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<ExpressionHistorySession[] | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    getExpressionHistory().then(setSessions).catch((e) => setError(e.message))
  }, [])

  const totalAttempts = sessions?.reduce((sum, session) => sum + session.attempts.length, 0) ?? 0
  const totalCorrect = sessions?.reduce((sum, session) => sum + session.attempts.filter((a) => a.result === 'correct').length, 0) ?? 0
  const toggleExpanded = (sessionId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 lg:pr-44">
        <Link to="/writing/expressions" className="text-sm text-muted-foreground hover:underline">
          ← 返回表达训练
        </Link>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
              <History className="h-3.5 w-3.5 text-primary" />
              Expression History
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl">练习记录</CardTitle>
              <CardDescription>按每次练习会话归档，随时回看解析，也可以把整组题重新做一遍。</CardDescription>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: History, label: '练习次数', value: String(sessions?.length ?? 0), desc: '已归档的练习会话' },
              { icon: Sparkles, label: '累计题目', value: String(totalAttempts), desc: '所有记录里的题数' },
              { icon: RotateCcw, label: '总体正确率', value: `${totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0}%`, desc: '基于已保存记录统计' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/48 p-4 backdrop-blur-xl">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/55 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</div>
                  <div className="mt-3 text-2xl font-semibold">{stat.value}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.desc}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {error && <StatePanel title="练习记录暂时打不开" description={error} tone="error" backTo="/writing/expressions" backLabel="返回表达训练" />}
      {sessions === null && <StatePanel title="正在读取练习记录" description="系统正在归档每次表达训练的会话和解析。" tone="loading" backTo="/writing/expressions" backLabel="返回表达训练" />}
      {sessions !== null && sessions.length === 0 && (
        <StatePanel title="还没有练习记录" description="先做几题表达训练，系统才会按会话帮你保存解析和再练一次入口。" tone="empty" backTo="/writing/expressions" backLabel="返回表达训练" />
      )}

      {sessions && sessions.length > 0 && <div className="space-y-4">
        {sessions?.map((session) => {
          const correct = session.attempts.filter((a) => a.result === 'correct').length
          const total = session.attempts.length
          const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
          const isExpanded = expanded.has(session.sessionId)
          return (
            <Card key={session.sessionId} className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <CardContent className="py-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-lg">
                        {formatDate(session.date)}
                      </span>
                      <Badge variant="outline" className="rounded-full">{formatStartedAt(session.startedAt)}</Badge>
                      {session.legacy && <Badge variant="secondary" className="rounded-full">旧记录</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{total} 题</span>
                      <span>{correct}/{total} 正确</span>
                      <span>{accuracy}% 正确率</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      onClick={() => toggleExpanded(session.sessionId)}
                    >
                      {isExpanded ? '收起解析' : '查看解析'}
                      <ChevronDown className={cn('ml-1 h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => navigate(`/writing/expressions/review?session=${session.sessionId}`)}
                    >
                      再练一次
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {session.attempts.map((a, i) => (
                    <div
                      key={a.attemptId}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-medium ${RESULT_COLOR[a.result || ''] || 'border-border text-muted-foreground'}`}
                      title={a.chinese}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                {isExpanded && (
                  <div className="space-y-3 border-t border-border/70 pt-4">
                    {session.attempts.map((attempt, i) => {
                      const isPhrase = attempt.subtype === 'phrase_drill'
                      return (
                        <div key={attempt.attemptId} className="rounded-2xl border border-border/70 bg-background/45 p-4">
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                {String(i + 1).padStart(2, '0')} · {isPhrase ? '词组练习' : '句子翻译'}
                              </div>
                              <p className="text-base font-medium leading-7">{attempt.chinese}</p>
                              {attempt.answer && (
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                  上次作答：<span className="text-foreground">{attempt.answer}</span>
                                </p>
                              )}
                            </div>
                            {attempt.result && (
                              <Badge className="rounded-full" variant={attempt.result === 'correct' ? 'default' : attempt.result === 'partial' ? 'secondary' : 'destructive'}>
                                {attempt.result === 'correct' ? '完全正确' : attempt.result === 'partial' ? '基本正确' : '有误'}
                              </Badge>
                            )}
                          </div>
                          {attempt.analysis ? (
                            <ExpressionAnalysis
                              result={attempt.analysis as Parameters<typeof ExpressionAnalysis>[0]['result']}
                              isPhrase={isPhrase}
                              compact
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">这条记录只保留了结果，没有解析详情。</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>}
    </div>
  )
}
