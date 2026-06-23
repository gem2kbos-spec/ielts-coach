import { Link } from 'react-router-dom'
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

export default function ReadingResult({ result, onRetry }: { result: GradedResult; onRetry: () => void }) {
  const tagByNumber = new Map(result.perQuestionTags.map((t) => [t.number, t]))

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/reading" className="text-sm text-muted-foreground hover:underline">
          ← 返回题库
        </Link>
        <Button variant="outline" size="sm" onClick={onRetry}>
          再练一次
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            正确率 {result.accuracy}%（{result.correctCount}/{result.total}）
          </CardTitle>
        </CardHeader>
        {result.errorTags.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {result.errorTags.map((tag) => (
              <Badge key={tag} variant="outline">
                {TAG_LABEL[tag] || tag}
              </Badge>
            ))}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">逐题对照</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.perQuestion.map((q) => {
            const tag = tagByNumber.get(q.number)
            return (
              <div key={q.number} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={q.correct ? 'default' : 'destructive'}>{q.correct ? '✓' : '✗'} Q{q.number}</Badge>
                  {tag && <Badge variant="outline">{TAG_LABEL[tag.tag] || tag.tag}</Badge>}
                </div>
                <p className="text-sm">{q.prompt}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  你的答案：{q.userAnswer || '(未作答)'} {!q.correct && <>· 正确答案：{q.correctAnswer}</>}
                </p>
                {q.explanation && <p className="text-xs text-muted-foreground mt-1">解析：{q.explanation}</p>}
                {tag && <p className="text-xs text-muted-foreground mt-1">{tag.reason}</p>}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
