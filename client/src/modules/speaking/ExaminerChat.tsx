import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, MessageSquareMore, Mic } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Waveform from '@/components/Waveform'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { startExaminer, submitExaminerTurn, type ExaminerTurnResult } from '@/lib/api'

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
  const [result, setResult] = useState<ExaminerTurnResult | null>(null)
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
        const nextQuestion = data.questionText || data.nextQuestion || ''
        setLog((prev) => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], answer: '（已提交，继续下一轮）' }
          return [...next, { question: nextQuestion }]
        })
        setQuestion(nextQuestion)
        setAudioUrl(data.questionAudioUrl || '')
        setTurnIndex(data.turnIndex ?? turnIndex + 1)
        setStage('question')
      }
    } catch (e) {
      setError((e as Error).message)
      setStage('question')
    }
  }

  if (stage === 'done' && result) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
                <Bot className="h-3.5 w-3.5 text-primary" />
                Examiner Mode Result
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">总分 Band {result.band_overall}</h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  这是当前一整轮考官追问模式的综合分。下面可以继续看完整对话和建议。
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {(['fc', 'lr', 'gra', 'pron'] as const).map((k) => (
                <div key={k} className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{{ fc: 'FC 流利度', lr: 'LR 词汇', gra: 'GRA 语法', pron: 'PRON 发音' }[k]}</div>
                  <div className="mt-3 text-xl font-semibold">{result.scores[k]}</div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{result.comments[k]}</p>
                </div>
              ))}
            </div>
          </CardContent>
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
        <Card className="rounded-[28px] border-border/70 bg-card/85">
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
          <Card className="rounded-[28px] border-border/70 bg-card/85">
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
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>
      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <Bot className="h-3.5 w-3.5 text-primary" />
              Examiner Mode
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">真人考官模式 · Part 3</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                系统会像考官一样一轮轮追问。每次先播放问题，再录你的回答，直到这一轮对话结束。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: MessageSquareMore, label: '当前轮次', value: `${turnIndex + 1}/${maxTurns}`, desc: '每提交一次回答就推进到下一轮' },
              { icon: Mic, label: '当前状态', value: stage === 'recording' ? '录音中' : stage === 'processing' ? '考官思考中' : stage === 'loading' ? '准备中' : '待回答', desc: '问题音频会自动尝试播放' },
              { icon: Bot, label: '当前话题', value: topic || '加载中', desc: '这一轮追问围绕同一个主题展开' },
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

      {stage === 'loading' && <p className="text-muted-foreground">考官准备中…</p>}

      {stage !== 'loading' && (
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-base">
              第 {turnIndex + 1} / {maxTurns} 轮
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-medium">{question}</p>
            <audio ref={audioRef} src={audioUrl} controls className="w-full" />

            {stage === 'question' && <Button className="rounded-2xl px-5" onClick={beginAnswer}>开始回答</Button>}
            {stage === 'recording' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="destructive" className="rounded-full">● 录音中</Badge>
                  <Button className="rounded-2xl px-5" onClick={stopAndSubmit}>停止并提交</Button>
                </div>
                <Waveform stream={recorder.stream} />
              </div>
            )}
            {stage === 'processing' && <p className="text-muted-foreground text-sm">考官思考中…</p>}
          </CardContent>
        </Card>
      )}

      {log.length > 1 && (
        <Card className="rounded-[28px] border-border/70 bg-card/85">
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
