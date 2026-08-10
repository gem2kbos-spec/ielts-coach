import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers3, Mic, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useExamTimer, type ExamPhase } from '@/hooks/useExamTimer'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import {
  getRandomPart1,
  submitPart1,
  getRandomPart2,
  submitPart2,
  startExaminer,
  submitExaminerTurn,
  finishSpeakingFull,
  type SpeakingPart1Item,
  type SpeakingPart2Item,
} from '@/lib/api'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'
import Waveform from '@/components/Waveform'
import { cn } from '@/lib/utils'
import ComparisonCard from '@/modules/history/ComparisonCard'
import { useAttemptComparison } from '@/modules/history/useAttemptComparison'

const PART2_PHASES: ExamPhase[] = [
  { key: 'prep', label: '准备', seconds: 60 },
  { key: 'speak', label: '回答', seconds: 120 },
]

function formatTime(sec: number) {
  const m = Math.floor(Math.max(sec, 0) / 60)
  const s = Math.max(sec, 0) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const SCORE_LABEL: Record<string, string> = { fc: 'FC 流利度', lr: 'LR 词汇', gra: 'GRA 语法', pron: 'PRON 发音' }

type Section = 'part1' | 'part2' | 'part3' | 'done'
type SectionResult = { scores: Record<string, number>; band_overall: number; errorTags?: string[] }

export default function SpeakingFullFlow() {
  const [section, setSection] = useState<Section>('part1')
  const [error, setError] = useState('')

  const [part1Result, setPart1Result] = useState<SectionResult | null>(null)
  const [part2Result, setPart2Result] = useState<SectionResult | null>(null)
  const [part3Result, setPart3Result] = useState<SectionResult | null>(null)
  const [finalAttemptId, setFinalAttemptId] = useState('')
  const [finalBand, setFinalBand] = useState<number | null>(null)
  const comparison = useAttemptComparison(finalAttemptId || undefined)

  useEffect(() => {
    if (section !== 'done' || part1Result === null) return
    if (!part2Result || !part3Result) return
    finishSpeakingFull({ part1: part1Result, part2: part2Result, part3: part3Result })
      .then((r) => {
        setFinalAttemptId(r.attemptId)
        setFinalBand(r.bandOverall)
      })
      .catch((e) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  if (section === 'done') {
    return (
      <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        {comparison && <ComparisonCard previous={comparison.previous} delta={comparison.delta} />}
        <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                Full Speaking Result
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">综合 Band {finalBand ?? '计算中…'}</h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  三段分别评分后取平均，更贴近真实雅思口语最终只给一个综合分的逻辑。
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: Layers3, label: '完成部分', value: '3/3', desc: 'Part 1、2、3 都已完成' },
                { icon: Mic, label: '评分方式', value: '统一汇总', desc: '不是三段并列分数，而是最终综合分' },
                { icon: Trophy, label: '结果状态', value: finalBand == null ? '计算中' : '已生成', desc: '完整口语记录已写入历史' },
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
        {[
          ['Part 1 热身', part1Result],
          ['Part 2 话题卡', part2Result],
          ['Part 3 深入讨论', part3Result],
        ].map(([label, r]) => {
          const result = r as SectionResult | null
          return (
            <Card key={label as string} className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{label as string}</span>
                  <Badge className="rounded-full">Band {result?.band_overall ?? '-'}</Badge>
                </CardTitle>
              </CardHeader>
              {result && (
                <CardContent className="grid grid-cols-4 gap-2 text-sm">
                  {Object.entries(result.scores).map(([k, v]) => (
                    <div key={k}>
                      <div className="text-xs text-muted-foreground">{SCORE_LABEL[k] || k}</div>
                      <div className="font-semibold">{v}</div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )
        })}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {finalAttemptId && <p className="text-xs text-muted-foreground">attempt: {finalAttemptId}</p>}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <MockSessionBanner />
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <div className="flex gap-2">
          {(['part1', 'part2', 'part3'] as const).map((s) => (
            <Badge key={s} variant={s === section ? 'default' : 'outline'} className="rounded-full">
              {{ part1: 'Part1', part2: 'Part2', part3: 'Part3' }[s]}
            </Badge>
          ))}
        </div>
      </div>
      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5 text-primary" />
              Full Speaking Flow
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">完整口语（Part 1 → Part 2 → Part 3）</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                把整场口语练习连成一条完整流程。当前阶段会在顶部高亮，完成后自动推进。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Layers3, label: '流程长度', value: '3 段', desc: '热身、话题卡、深入追问连续完成' },
              { icon: Mic, label: '当前阶段', value: { part1: 'Part 1', part2: 'Part 2', part3: 'Part 3', done: '完成' }[section], desc: '上方标签会同步显示进度' },
              { icon: Trophy, label: '最终产出', value: '综合记录', desc: '全部完成后写入一条完整口语结果' },
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

      {section === 'part1' && (
        <Part1Section
          onDone={(r) => {
            setPart1Result(r)
            setSection('part2')
          }}
          onError={setError}
        />
      )}
      {section === 'part2' && (
        <Part2Section
          onDone={(r, tag) => {
            setPart2Result(r)
            setSection('part3')
            sessionStorage.setItem('speaking-full-part2-tag', tag || '')
          }}
          onError={setError}
        />
      )}
      {section === 'part3' && (
        <Part3Section
          tag={sessionStorage.getItem('speaking-full-part2-tag') || undefined}
          onDone={(r) => {
            setPart3Result(r)
            setSection('done')
          }}
          onError={setError}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function Part1Section({ onDone, onError }: { onDone: (r: SectionResult) => void; onError: (e: string) => void }) {
  const [item, setItem] = useState<SpeakingPart1Item | null>(null)
  const [stage, setStage] = useState<'loading' | 'ready' | 'recording' | 'processing'>('loading')
  const recorder = useAudioRecorder()
  const startedAt = useRef(0)

  useEffect(() => {
    getRandomPart1()
      .then((i) => {
        setItem(i)
        setStage('ready')
      })
      .catch((e) => onError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      onError('没有录到音频')
      setStage('ready')
      return
    }
    const speakSec = Math.round((Date.now() - startedAt.current) / 1000)
    try {
      const data = await submitPart1({ itemId: item.id, speakSec, audioBlob: blob })
      onDone({ scores: data.scores, band_overall: data.band_overall, errorTags: data.errorTags })
    } catch (e) {
      onError((e as Error).message)
      setStage('ready')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Part 1 · 热身问答（一次性回答下面所有问题，没有准备时间）</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
        {stage === 'ready' && <Button onClick={begin}>开始回答</Button>}
        {stage === 'recording' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="destructive">● 录音中</Badge>
              <Button onClick={stopAndSubmit}>停止并提交</Button>
            </div>
            <Waveform stream={recorder.stream} />
          </div>
        )}
        {stage === 'processing' && <p className="text-sm text-muted-foreground">处理中…</p>}
        {recorder.error && <p className="text-sm text-destructive">{recorder.error}</p>}
      </CardContent>
    </Card>
  )
}

function Part2Section({
  onDone,
  onError,
}: {
  onDone: (r: SectionResult, tag?: string) => void
  onError: (e: string) => void
}) {
  const [item, setItem] = useState<SpeakingPart2Item | null>(null)
  const [stage, setStage] = useState<'idle' | 'running' | 'processing'>('idle')
  const timer = useExamTimer(PART2_PHASES)
  const recorder = useAudioRecorder()
  const speakStartedAt = useRef(0)
  const prevPhaseIndex = useRef(0)

  useEffect(() => {
    getRandomPart2().then(setItem).catch((e) => onError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (stage !== 'running') return
    if (prevPhaseIndex.current === 0 && timer.phaseIndex === 1) {
      recorder.start()
      speakStartedAt.current = Date.now()
    }
    prevPhaseIndex.current = timer.phaseIndex
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.phaseIndex, stage])

  useEffect(() => {
    if (stage !== 'running') return
    if (timer.done) finishAndSubmit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.done, stage])

  const begin = () => {
    setStage('running')
    prevPhaseIndex.current = 0
    timer.start()
  }

  const finishAndSubmit = async () => {
    if (!item) return
    setStage('processing')
    const blob = await recorder.stop()
    if (!blob) {
      onError('没有录到音频')
      setStage('idle')
      return
    }
    const speakSec = Math.round((Date.now() - speakStartedAt.current) / 1000)
    try {
      const data = await submitPart2({ itemId: item.id, speakSec, audioBlob: blob })
      onDone({ scores: data.scores, band_overall: data.band_overall, errorTags: data.errorTags }, item.tags?.[0])
    } catch (e) {
      onError((e as Error).message)
      setStage('idle')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Part 2 · 话题卡（1分钟准备 + 2分钟回答）</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!item && <p className="text-muted-foreground">加载中…</p>}
        {item && (
          <>
            <p className="font-medium">{item.content.topic}</p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {item.content.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </>
        )}
        {stage === 'idle' && (
          <Button onClick={begin} disabled={!item}>
            开始
          </Button>
        )}
        {stage === 'running' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  {timer.phase.label}
                  {timer.phaseIndex === 1 && recorder.isRecording && (
                    <Badge variant="destructive" className="ml-2">
                      ● 录音中
                    </Badge>
                  )}
                </div>
                <div className={cn('text-3xl font-mono', timer.remaining < 300 && timer.running && 'text-destructive animate-pulse')}>
                  {formatTime(timer.remaining)}
                </div>
              </div>
              {timer.phaseIndex === 1 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    timer.pause()
                    finishAndSubmit()
                  }}
                >
                  提前结束
                </Button>
              )}
            </div>
            {timer.phaseIndex === 1 && recorder.isRecording && <Waveform stream={recorder.stream} />}
          </div>
        )}
        {stage === 'processing' && <p className="text-sm text-muted-foreground">处理中…</p>}
        {recorder.error && <p className="text-sm text-destructive">{recorder.error}</p>}
      </CardContent>
    </Card>
  )
}

function Part3Section({
  tag,
  onDone,
  onError,
}: {
  tag?: string
  onDone: (r: SectionResult) => void
  onError: (e: string) => void
}) {
  const [stage, setStage] = useState<'loading' | 'question' | 'recording' | 'processing'>('loading')
  const [sessionId, setSessionId] = useState('')
  const [question, setQuestion] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [turnIndex, setTurnIndex] = useState(0)
  const [maxTurns, setMaxTurns] = useState(4)
  const recorder = useAudioRecorder()
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    startExaminer(tag)
      .then((data) => {
        setSessionId(data.sessionId)
        setQuestion(data.questionText)
        setAudioUrl(data.questionAudioUrl)
        setTurnIndex(data.turnIndex)
        setMaxTurns(data.maxTurns)
        setStage('question')
      })
      .catch((e) => onError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    audioRef.current?.play().catch(() => {})
  }, [audioUrl])

  const beginAnswer = async () => {
    setStage('recording')
    await recorder.start()
  }

  const stopAndSubmit = async () => {
    setStage('processing')
    const blob = await recorder.stop()
    if (!blob) {
      onError('没有录到音频')
      setStage('question')
      return
    }
    try {
      const data = await submitExaminerTurn({ sessionId, audioBlob: blob })
      if (data.done) {
        onDone({ scores: data.scores, band_overall: data.band_overall, errorTags: data.errorTags })
      } else {
        setQuestion(data.questionText || data.nextQuestion || '')
        setAudioUrl(data.questionAudioUrl || '')
        setTurnIndex(data.turnIndex ?? turnIndex + 1)
        setStage('question')
      }
    } catch (e) {
      onError((e as Error).message)
      setStage('question')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Part 3 · 深入讨论（考官追问，第 {turnIndex + 1}/{maxTurns} 轮）</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stage === 'loading' && <p className="text-muted-foreground">考官准备中…</p>}
        {stage !== 'loading' && (
          <>
            <p className="font-medium">{question}</p>
            <audio ref={audioRef} src={audioUrl} controls className="w-full" />
            {stage === 'question' && <Button onClick={beginAnswer}>开始回答</Button>}
            {stage === 'recording' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="destructive">● 录音中</Badge>
                  <Button onClick={stopAndSubmit}>停止并提交</Button>
                </div>
                <Waveform stream={recorder.stream} />
              </div>
            )}
            {stage === 'processing' && <p className="text-sm text-muted-foreground">考官思考中…</p>}
          </>
        )}
        {recorder.error && <p className="text-sm text-destructive">{recorder.error}</p>}
      </CardContent>
    </Card>
  )
}
