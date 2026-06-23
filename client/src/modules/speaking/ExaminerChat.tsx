import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { startExaminer, submitExaminerTurn } from '@/lib/api'

type Stage = 'loading' | 'question' | 'recording' | 'processing' | 'done'

export default function ExaminerChat() {
  const [stage, setStage] = useState<Stage>('loading')
  const [sessionId, setSessionId] = useState('')
  const [topic, setTopic] = useState('')
  const [question, setQuestion] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [turnIndex, setTurnIndex] = useState(0)
  const [maxTurns, setMaxTurns] = useState(4)
  const [log, setLog] = useState<{ question: string; answer?: string }[]>([])
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const recorder = useAudioRecorder()
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    startExaminer()
      .then((data) => {
        setSessionId(data.sessionId)
        setTopic(data.topic)
        setQuestion(data.questionText)
        setAudioUrl(data.questionAudioUrl)
        setTurnIndex(data.turnIndex)
        setMaxTurns(data.maxTurns)
        setLog([{ question: data.questionText }])
        setStage('question')
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    audioRef.current?.play().catch(() => {
      /* 浏览器可能阻止自动播放，用户可以手动点播放按钮 */
    })
  }, [audioUrl])

  const beginAnswer = async () => {
    setStage('recording')
    await recorder.start()
  }

  const stopAndSubmit = async () => {
    setStage('processing')
    const blob = await recorder.stop()
    if (!blob) {
      setError('没有录到音频')
      setStage('question')
      return
    }
    try {
      const data = await submitExaminerTurn({ sessionId, audioBlob: blob })
      if (data.done) {
        setResult(data)
        setLog(data.history)
        setStage('done')
      } else {
        setLog((prev) => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], answer: '（已提交，继续下一轮）' }
          return [...next, { question: data.questionText }]
        })
        setQuestion(data.questionText)
        setAudioUrl(data.questionAudioUrl)
        setTurnIndex(data.turnIndex)
        setStage('question')
      }
    } catch (e) {
      setError((e as Error).message)
      setStage('question')
    }
  }

  if (stage === 'done' && result) {
    return (
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>总分 Band {result.band_overall}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['fc', 'lr', 'gra', 'pron'] as const).map((k) => (
                <div key={k}>
                  <div className="text-sm text-muted-foreground">{{ fc: 'FC 流利度', lr: 'LR 词汇', gra: 'GRA 语法', pron: 'PRON 发音' }[k]}</div>
                  <div className="text-2xl font-semibold">{result.scores[k]}</div>
                  <p className="text-xs text-muted-foreground mt-1">{result.comments[k]}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">完整对话</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.history.map((h: { question: string; answer: string }, i: number) => (
              <div key={i} className="text-sm">
                <p className="font-medium">考官：{h.question}</p>
                <p className="text-muted-foreground mt-1">你：{h.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        {result.suggestions?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">改进建议</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {result.suggestions.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">真人考官模式 · Part 3</h1>
        {topic && <Badge variant="outline">话题：{topic}</Badge>}
      </div>

      {stage === 'loading' && <p className="text-muted-foreground">考官准备中…</p>}

      {stage !== 'loading' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              第 {turnIndex + 1} / {maxTurns} 轮
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-medium">{question}</p>
            <audio ref={audioRef} src={audioUrl} controls className="w-full" />

            {stage === 'question' && <Button onClick={beginAnswer}>开始回答</Button>}
            {stage === 'recording' && (
              <div className="flex items-center justify-between">
                <Badge variant="destructive">● 录音中</Badge>
                <Button onClick={stopAndSubmit}>停止并提交</Button>
              </div>
            )}
            {stage === 'processing' && <p className="text-muted-foreground text-sm">考官思考中…</p>}
          </CardContent>
        </Card>
      )}

      {log.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">之前的轮次</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {log.slice(0, -1).map((l, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                Q{i + 1}: {l.question}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {recorder.error && <p className="text-sm text-destructive">{recorder.error}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
