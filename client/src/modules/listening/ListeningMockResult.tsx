import { Link } from 'react-router-dom'
import { Headphones, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TAG_LABEL } from '@/lib/tagLabels'

export type ListeningMockGradedResult = {
  attemptId: string
  totalCorrect: number
  totalQuestions: number
  band: number
  perSection: {
    sectionId: string
    title: string
    section: string | null
    correctCount: number
    total: number
    perQuestion: { number: number; prompt: string; type: string; userAnswer: string | string[]; correctAnswer: string | string[]; explanation: string | null; correct: boolean }[]
  }[]
  errorTags: string[]
}

function fmt(a: string | string[]) {
  return Array.isArray(a) ? a.join(', ') : a || '(未作答)'
}

export default function ListeningMockResult({ result }: { result: ListeningMockGradedResult }) {
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <Link to="/listening" className="text-sm text-muted-foreground hover:underline">
        ← 返回题库
      </Link>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <Headphones className="h-3.5 w-3.5 text-primary" />
              Listening Mock Result
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">全真模拟结果</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                总分 {result.totalCorrect}/{result.totalQuestions}，当前换算约为 Band {result.band}。下面按 Section 展示本次错题情况。
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
              { icon: Trophy, label: '估算分数', value: `Band ${result.band}`, desc: '基于近似换算表得出' },
              { icon: Headphones, label: '总答对数', value: `${result.totalCorrect}/${result.totalQuestions}`, desc: '按 4 个 section 汇总' },
              { icon: Trophy, label: '结果性质', value: '模拟估算', desc: '不同官方年份表格会有小幅浮动' },
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

      <Card className="rounded-[28px] border-border/70 bg-card/85">
        <CardContent className="space-y-1 py-5">
          <p className="text-xs text-muted-foreground">
            Band换算用的是雅思听力通用换算表的近似版本，不同年份官方表格可能有±0.5浮动，仅供参考。
          </p>
        </CardContent>
      </Card>

      {result.perSection.map((sec) => (
        <Card key={sec.sectionId} className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <CardTitle className="text-base">
              {sec.section ? `${sec.section} · ` : ''}{sec.title} — {sec.correctCount}/{sec.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sec.perQuestion.map((q) => (
              <div key={q.number} className="rounded-[22px] border border-border/70 bg-background/55 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={q.correct ? 'default' : 'destructive'} className="rounded-full">{q.correct ? '✓' : '✗'} Q{q.number}</Badge>
                </div>
                <p className="text-sm">{q.prompt}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  你的答案：{fmt(q.userAnswer)} {!q.correct && <>· 正确答案：{fmt(q.correctAnswer)}</>}
                </p>
                {q.explanation && <p className="mt-2 text-xs leading-6 text-muted-foreground">解析：{q.explanation}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
