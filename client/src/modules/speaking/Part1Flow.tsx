import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic, Radio, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { getRandomPart1, submitPart1, type SpeakingPart1Item, type SpeakingScoreResult } from '@/lib/api'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'
import Waveform from '@/components/Waveform'
import ScoreRadarChart from '@/components/ScoreRadarChart'
import ComparisonCard from '@/modules/history/ComparisonCard'
import { useAttemptComparison } from '@/modules/history/useAttemptComparison'

const SCORE_LABEL: Record<string, string> = { fc: 'FC 流利度', lr: 'LR 词汇', gra: 'GRA 语法', pron: 'PRON 发音' }

export default function Part1Flow() {
  const [item, setItem] = useState<SpeakingPart1Item | null>(null)
  const [stage, setStage] = useState<'loading' | 'ready' | 'recording' | 'processing' | 'result'>('loading')
  const [result, setResult] = useState<SpeakingScoreResult | null>(null)
  const [error, setError] = useState('')
  const recorder = useAudioRecorder()
  const startedAt = useRef(0)
  const comparison = useAttemptComparison(result?.attemptId)

  const loadNewPrompt = () => {
    setItem(null)
    setResult(null)
    setStage('loading')
    getRandomPart1()
      .then((i) => {
        setItem(i)
        setStage('ready')
      })
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    loadNewPrompt()
  }, [])

  const begin = async () => {
    setStage('recording')
    startedAt.current = Date.now()
    await recorder.start()
  }

  const stopAndSubmit = async () => {
    if (!item) return
    setStage('processing')
    const blob = await recorder.stop()
    if (!blob) {
      setError('没有录到音频')
      setStage('ready')
      return
    }
    const speakSec = Math.round((Date.now() - startedAt.current) / 1000)
    try {
      const data = await submitPart1({ itemId: item.id, speakSec, audioBlob: blob })
      setResult(data)
      setStage('result')
    } catch (e) {
      setError((e as Error).message)
      setStage('ready')
    }
  }

  if (stage === 'result' && result) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
        <MockSessionBanner />
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:underline">
            ← 返回首页
          </Link>
          <Button variant="outline" onClick={loadNewPrompt}>
            换一题再练
          </Button>
        </div>
        {comparison && <ComparisonCard previous={comparison.previous} delta={comparison.delta} />}
        <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Speaking Part 1 Result
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">Band {result.band_overall}</h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  这次是 Part 1 热身轮的整体表现。右侧可以直接看四项评分分布。
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {(['fc', 'lr', 'gra', 'pron'] as const).map((k) => (
                <div key={k} className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{SCORE_LABEL[k]}</div>
                  <div className="mt-3 text-xl font-semibold">{result.scores[k]}</div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{result.comments[k]}</p>
                </div>
              ))}
            </div>
          </CardContent>
          <CardContent className="grid items-center gap-4 pt-0 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-4">
              {(['fc', 'lr', 'gra', 'pron'] as const).map((k) => (
                <div key={k}>
                  <div className="text-sm text-muted-foreground">{SCORE_LABEL[k]}</div>
                  <div className="text-2xl font-semibold">{result.scores[k]}</div>
                  <p className="text-xs text-muted-foreground mt-1">{result.comments[k]}</p>
                </div>
              ))}
            </div>
            <ScoreRadarChart scores={result.scores} labels={{ fc: 'FC', lr: 'LR', gra: 'GRA', pron: 'PRON' }} />
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-base">转写</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{result.transcript}</p>
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
      <MockSessionBanner />
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>
      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <Mic className="h-3.5 w-3.5 text-primary" />
              Speaking Part 1
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">口语 Part 1</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                没有准备时间，直接连续回答当前这一组热身问题。这里把逐题问答简化成一段连续录音，更适合单人训练。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Radio, label: '当前状态', value: stage === 'recording' ? '录音中' : stage === 'processing' ? '处理中' : '待开始', desc: stage === 'recording' ? '正在采集你的回答音频' : stage === 'processing' ? '转写与评分正在生成' : '题目加载后即可开始' },
              { icon: Sparkles, label: '反馈方式', value: 'AI 评分', desc: '返回四项分数、转写和改进建议' },
              { icon: Mic, label: '录音模式', value: '连续回答', desc: '一轮问题对应一次完整录音' },
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
        <CardContent className="pt-6 space-y-3">
          {!item && <p className="text-muted-foreground">加载中…</p>}
          {item && (
            <>
              <p className="font-medium">{item.content.topic}</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {item.content.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </>
          )}
          {stage === 'ready' && <Button className="rounded-2xl px-5" onClick={begin}>开始回答</Button>}
          {stage === 'recording' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="destructive" className="rounded-full">● 录音中</Badge>
                <Button className="rounded-2xl px-5" onClick={stopAndSubmit}>停止并提交</Button>
              </div>
              <Waveform stream={recorder.stream} />
            </div>
          )}
          {stage === 'processing' && <p className="text-sm text-muted-foreground">处理中（转写+AI评分，约30-60秒）…</p>}
          {recorder.error && <p className="text-sm text-destructive">{recorder.error}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
