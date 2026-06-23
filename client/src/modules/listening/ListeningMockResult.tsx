import { Link } from 'react-router-dom'
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
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <Link to="/listening" className="text-sm text-muted-foreground hover:underline">
        ← 返回题库
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            总分 {result.totalCorrect}/{result.totalQuestions} · 约 Band {result.band}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Band换算用的是雅思听力通用换算表的近似版本，不同年份官方表格可能有±0.5浮动，仅供参考。
          </p>
          {result.errorTags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {result.errorTags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {TAG_LABEL[tag] || tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {result.perSection.map((sec) => (
        <Card key={sec.sectionId}>
          <CardHeader>
            <CardTitle className="text-base">
              {sec.section ? `${sec.section} · ` : ''}{sec.title} — {sec.correctCount}/{sec.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sec.perQuestion.map((q) => (
              <div key={q.number} className="border-b border-border pb-2 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={q.correct ? 'default' : 'destructive'}>{q.correct ? '✓' : '✗'} Q{q.number}</Badge>
                </div>
                <p className="text-sm">{q.prompt}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  你的答案：{fmt(q.userAnswer)} {!q.correct && <>· 正确答案：{fmt(q.correctAnswer)}</>}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
