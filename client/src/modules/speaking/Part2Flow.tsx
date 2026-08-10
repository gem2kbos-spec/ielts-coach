import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, Mic, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useExamTimer, type ExamPhase } from '@/hooks/useExamTimer'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { getRandomPart2, submitPart2, type SpeakingPart2Item, type SpeakingScoreResult } from '@/lib/api'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'
import Waveform from '@/components/Waveform'
import ScoreRadarChart from '@/components/ScoreRadarChart'
import ComparisonCard from '@/modules/history/ComparisonCard'
import { useAttemptComparison } from '@/modules/history/useAttemptComparison'
import { cn } from '@/lib/utils'

const PHASES: ExamPhase[] = [
  { key: 'prep', label: '准备', seconds: 60 },
  { key: 'speak', label: '回答', seconds: 120 },
]

function formatTime(sec: number) {
  const m = Math.floor(Math.max(sec, 0) / 60)
  const s = Math.max(sec, 0) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type Stage = 'idle' | 'running' | 'processing' | 'result'

export default function Part2Flow() {
  const [item, setItem] = useState<SpeakingPart2Item | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [result, setResult] = useState<SpeakingScoreResult | null>(null)
  const [error, setError] = useState('')
  const timer = useExamTimer(PHASES)
  const recorder = useAudioRecorder()
  const speakStartedAt = useRef(0)
  const prevPhaseIndex = useRef(0)
  const comparison = useAttemptComparison(result?.attemptId)

  const loadNewPrompt = () => {
    setItem(null)
    setResult(null)
    setStage('idle')
    timer.reset()
    getRandomPart2().then(setItem).catch((e) => setError(e.message))
  }

  useEffect(() => {
    loadNewPrompt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 进入"回答"阶段时自动开始录音
  useEffect(() => {
    if (stage !== 'running') return
    if (prevPhaseIndex.current === 0 && timer.phaseIndex === 1) {
      recorder.start()
      speakStartedAt.current = Date.now()
    }
    prevPhaseIndex.current = timer.phaseIndex
  }, [timer.phaseIndex, stage]) // eslint-disable-line react-hooks/exhaustive-deps

  // 回答阶段计时结束自动停止录音并提交
  useEffect(() => {
    if (stage !== 'running') return
    if (timer.done) {
      finishAndSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.done, stage])

  const beginExam = () => {
    setStage('running')
    prevPhaseIndex.current = 0
    timer.start()
  }

  const finishAndSubmit = async () => {
    if (!item) return
    setStage('processing')
    const blob = await recorder.stop()
    if (!blob) {
      setError('没有录到音频')
      setStage('idle')
      return
    }
    const speakSec = Math.round((Date.now() - speakStartedAt.current) / 1000)
    try {
      const data = await submitPart2({ itemId: item.id, speakSec, audioBlob: blob })
      setResult(data)
      setStage('result')
    } catch (e) {
      setError((e as Error).message)
      setStage('idle')
    }
  }

  const stopEarly = () => {
    timer.pause()
    finishAndSubmit()
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
                Speaking Part 2 Result
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">Band {result.band_overall}</h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  这次是话题卡轮次的综合表现，包含填充词、转写和四项打分。
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
          <CardContent className="grid md:grid-cols-2 gap-4 items-center pt-0">
            <div className="grid grid-cols-2 gap-4">
              {(['fc', 'lr', 'gra', 'pron'] as const).map((k) => (
                <div key={k}>
                  <div className="text-sm text-muted-foreground">{{ fc: 'FC 流利度', lr: 'LR 词汇', gra: 'GRA 语法', pron: 'PRON 发音' }[k]}</div>
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
            <CardTitle className="text-base">填充词 / 转写</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Badge variant={result.fillerStats.total > 0 ? 'destructive' : 'secondary'}>
                填充词共 {result.fillerStats.total} 次
              </Badge>
              {Object.entries(result.fillerStats.counts).map(([k, v]) => (
                <Badge key={k} variant="outline">
                  {k}: {v as number}
                </Badge>
              ))}
            </div>
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
              Speaking Part 2
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">口语 Part 2</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                先准备 1 分钟，再连续回答 2 分钟。系统会自动在进入回答阶段时开启录音。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Clock3, label: '流程结构', value: '1+2 分钟', desc: '准备 1 分钟，回答 2 分钟' },
              { icon: Sparkles, label: '当前状态', value: stage === 'running' ? timer.phase.label : stage === 'processing' ? '处理中' : '待开始', desc: stage === 'running' ? '倒计时会自动切换阶段' : stage === 'processing' ? '转写和评分生成中' : '题卡载入后即可开始' },
              { icon: Mic, label: '录音方式', value: '自动开启', desc: '进入回答阶段后自动开始采集音频' },
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
        <CardHeader>
          <CardTitle className="text-base">题卡</CardTitle>
        </CardHeader>
        <CardContent>
          {item ? (
            <>
              <p className="font-medium mb-2">{item.content.topic}</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {item.content.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground">加载中…</p>
          )}
        </CardContent>
      </Card>

      {stage === 'idle' && (
        <Button className="rounded-2xl px-5" onClick={beginExam} disabled={!item}>
          开始（1 分钟准备 + 2 分钟回答）
        </Button>
      )}

      {stage === 'running' && (
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <div className="text-sm text-muted-foreground">
                {timer.phase.label}
                {timer.phaseIndex === 1 && recorder.isRecording && (
                  <Badge variant="destructive" className="ml-2 rounded-full">
                    ● 录音中
                  </Badge>
                )}
              </div>
              <div className={cn('text-3xl font-mono', timer.remaining < 300 && timer.running && 'text-destructive animate-pulse')}>
                {formatTime(timer.remaining)}
              </div>
            </div>
            {timer.phaseIndex === 1 && (
              <Button variant="outline" className="rounded-2xl px-5" onClick={stopEarly}>
                提前结束
              </Button>
            )}
          </CardContent>
          {timer.phaseIndex === 1 && recorder.isRecording && (
            <CardContent className="pt-0">
              <Waveform stream={recorder.stream} />
            </CardContent>
          )}
        </Card>
      )}

      {stage === 'processing' && <p className="text-muted-foreground">处理中（转写 + AI 评分，约 30-90 秒）…</p>}

      {recorder.error && <p className="text-sm text-destructive mt-2">{recorder.error}</p>}
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  )
}
