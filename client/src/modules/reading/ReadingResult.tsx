import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Target, Tags } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TAG_LABEL } from '@/lib/tagLabels'

export type GradedResult = {
  attemptId: string
  accuracy: number
  correctCount: number
  total: number
  perQuestion: { number: number; prompt: string; type: string; userAnswer: string; correctAnswer: string; explanation: string | null; correct: boolean }[]
  errorTags: string[]
  perQuestionTags: { number: number; tag: string; reason: string }[]
}

export default function ReadingResult({
  result,
  onRetry,
  onRetryWrong,
}: {
  result: GradedResult
  onRetry: () => void
  onRetryWrong?: () => void
}) {
  const tagByNumber = new Map(result.perQuestionTags.map((t) => [t.number, t]))
  const wrongCount = result.total - result.correctCount

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Link to="/reading" className="text-sm text-muted-foreground hover:underline">
          ← 返回题库
        </Link>
        <div className="flex items-center gap-2">
          {wrongCount > 0 && onRetryWrong && (
            <Button variant="default" size="sm" className="rounded-full px-4" onClick={onRetryWrong}>
              错题二刷（{wrongCount}）
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-full px-4" onClick={onRetry}>
            再练一次
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Reading Review
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">阅读结果</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                这次作答的整体情况、错因标签和逐题对照都集中在这里，方便直接进入下一轮复盘。
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
              { icon: Target, label: '正确率', value: `${result.accuracy}%`, desc: `${result.correctCount}/${result.total} 答对` },
              { icon: CheckCircle2, label: '正确题数', value: String(result.correctCount), desc: '这次答对的题目' },
              { icon: Tags, label: '待复盘', value: String(wrongCount), desc: '建议优先回看这些题' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</div>
                  <div className="mt-3 text-2xl font-semibold">{stat.value}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.desc}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
        <CardHeader>
          <CardTitle className="text-base">逐题对照</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.perQuestion.map((q) => {
            const tag = tagByNumber.get(q.number)
            return (
              <div
                key={q.number}
                className={q.correct
                  ? 'rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4'
                  : 'rounded-2xl border border-red-500/28 bg-red-500/5 p-4'
                }
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant={q.correct ? 'default' : 'destructive'} className="rounded-full">
                    {q.correct ? '✓ 正确' : '✗ 错误'} Q{q.number}
                  </Badge>
                  {tag && <Badge variant="outline" className="rounded-full">{TAG_LABEL[tag.tag] || tag.tag}</Badge>}
                </div>
                <p className="text-sm leading-7">{q.prompt}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  你的答案：{q.userAnswer || '(未作答)'} {!q.correct && <>· 正确答案：{q.correctAnswer}</>}
                </p>
                {q.explanation && <p className="mt-2 text-sm leading-7 text-muted-foreground">解析：{q.explanation}</p>}
                {tag && <p className="mt-2 text-xs leading-6 text-muted-foreground">{tag.reason}</p>}
                {!q.correct && (
                  <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary">
                    <span>优先复盘这题</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
