import { useState } from 'react'
import { Link } from 'react-router-dom'
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

// 把答案所在的句子高亮——简单的子串匹配，没有语义理解，纯粹方便对照
function renderTranscriptWithHighlights(transcript: string, answers: (string | string[])[]) {
  const needles = answers.flatMap((a) => (Array.isArray(a) ? a : [a])).filter((s) => s && s.length > 1)
  const sentences = transcript.split(/(?<=[.!?])\s+/)
  return sentences.map((sentence, i) => {
    const hit = needles.some((n) => sentence.toLowerCase().includes(n.toLowerCase()))
    return (
      <span key={i} className={hit ? 'bg-yellow-200/60 dark:bg-yellow-900/40' : undefined}>
        {sentence}{' '}
      </span>
    )
  })
}

export default function ListeningResult({ result, onRetry }: { result: ListeningGradedResult; onRetry: () => void }) {
  const [showTranscript, setShowTranscript] = useState(false)
  const tagByNumber = new Map(result.perQuestionTags.map((t) => [t.number, t]))

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/listening" className="text-sm text-muted-foreground hover:underline">
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
                  你的答案：{fmt(q.userAnswer)} {!q.correct && <>· 正确答案：{fmt(q.correctAnswer)}</>}
                </p>
                {q.explanation && <p className="text-xs text-muted-foreground mt-1">解析：{q.explanation}</p>}
                {tag && <p className="text-xs text-muted-foreground mt-1">{tag.reason}</p>}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {result.transcript && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">听力原文</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowTranscript((v) => !v)}>
              {showTranscript ? '隐藏' : '显示'}
            </Button>
          </CardHeader>
          {showTranscript && (
            <CardContent>
              <p className="text-sm leading-relaxed">
                {renderTranscriptWithHighlights(result.transcript, result.perQuestion.map((q) => q.correctAnswer))}
              </p>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
