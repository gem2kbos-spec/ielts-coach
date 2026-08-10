import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AudioLines, RotateCcw, ScanSearch } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TAG_LABEL } from '@/lib/tagLabels'

export type ListeningGradedResult = {
  attemptId: string
  accuracy: number
  correctCount: number
  total: number
  perQuestion: {
    number: number
    prompt: string
    type: string
    userAnswer: string | string[]
    correctAnswer: string | string[]
    explanation: string | null
    correct: boolean
  }[]
  errorTags: string[]
  perQuestionTags: { number: number; tag: string; reason: string }[]
  transcript: string | null
}

function fmt(a: string | string[]) {
  return Array.isArray(a) ? a.join(', ') : a || '(未作答)'
}

function renderTranscriptWithHighlights(transcript: string, answers: (string | string[])[]) {
  const needles = answers.flatMap((a) => (Array.isArray(a) ? a : [a])).filter((s) => s && s.length > 1)
  const sentences = transcript.split(/(?<=[.!?])\s+/)
  return sentences.map((sentence, i) => {
    const hit = needles.some((n) => sentence.toLowerCase().includes(n.toLowerCase()))
    return (
      <span key={i} className={hit ? 'rounded bg-yellow-500/15 px-1 text-yellow-100' : undefined}>
        {sentence}{' '}
      </span>
    )
  })
}

export default function ListeningResult({
  result,
  onRetry,
  onRetryWrong,
}: {
  result: ListeningGradedResult
  onRetry: () => void
  onRetryWrong?: () => void
}) {
  const [showTranscript, setShowTranscript] = useState(false)
  const tagByNumber = new Map(result.perQuestionTags.map((t) => [t.number, t]))
  const wrongCount = result.total - result.correctCount

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/listening" className="text-sm text-muted-foreground hover:underline">
          ← 返回题库
        </Link>
        <div className="flex items-center gap-2">
          {wrongCount > 0 && onRetryWrong && (
            <Button size="sm" className="rounded-2xl px-4" onClick={onRetryWrong}>
              <ScanSearch className="mr-2 h-4 w-4" />
              错题二刷（{wrongCount}）
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-2xl px-4" onClick={onRetry}>
            <RotateCcw className="mr-2 h-4 w-4" />
            再练一次
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <AudioLines className="h-3.5 w-3.5 text-primary" />
              Listening Result
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">听力结果</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                本次正确率 {result.accuracy}%，共答对 {result.correctCount} / {result.total} 题。下面可以直接看逐题对照和听力原文定位。
              </p>
            </div>
            {result.errorTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.errorTags.map((tag) => (
                  <Badge key={tag} variant="outline" className="rounded-full">
                    {TAG_LABEL[tag] || tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: ScanSearch, label: '正确率', value: `${result.accuracy}%`, desc: '本次整体答题表现' },
              { icon: AudioLines, label: '答对数量', value: `${result.correctCount}/${result.total}`, desc: '已按题号逐一判分' },
              { icon: RotateCcw, label: '复盘方式', value: '逐题对照', desc: '可以直接回看错误题和解析' },
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

      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <CardTitle className="text-base">逐题对照</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.perQuestion.map((q) => {
            const tag = tagByNumber.get(q.number)
            return (
              <div key={q.number} className="rounded-[24px] border border-border/70 bg-background/55 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant={q.correct ? 'default' : 'destructive'} className="rounded-full">
                    {q.correct ? '✓' : '✗'} Q{q.number}
                  </Badge>
                  {tag && <Badge variant="outline" className="rounded-full">{TAG_LABEL[tag.tag] || tag.tag}</Badge>}
                </div>
                <p className="text-sm">{q.prompt}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  你的答案：{fmt(q.userAnswer)} {!q.correct && <>· 正确答案：{fmt(q.correctAnswer)}</>}
                </p>
                {q.explanation && <p className="mt-2 text-xs leading-6 text-muted-foreground">解析：{q.explanation}</p>}
                {tag && <p className="mt-1 text-xs leading-6 text-muted-foreground">{tag.reason}</p>}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {result.transcript && (
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">听力原文</CardTitle>
            <Button size="sm" variant="outline" className="rounded-2xl px-4" onClick={() => setShowTranscript((v) => !v)}>
              {showTranscript ? '隐藏' : '显示'}
            </Button>
          </CardHeader>
          {showTranscript && (
            <CardContent>
              <p className="text-sm leading-8 text-muted-foreground">
                {renderTranscriptWithHighlights(result.transcript, result.perQuestion.map((q) => q.correctAnswer))}
              </p>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
