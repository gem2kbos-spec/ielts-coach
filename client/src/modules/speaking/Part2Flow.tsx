import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useExamTimer, type ExamPhase } from '@/hooks/useExamTimer'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { getRandomPart2, submitPart2, type SpeakingPart2Item } from '@/lib/api'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'

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
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const timer = useExamTimer(PHASES)
  const recorder = useAudioRecorder()
  const speakStartedAt = useRef(0)
  const prevPhaseIndex = useRef(0)

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
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <MockSessionBanner />
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:underline">
            ← 返回首页
          </Link>
          <Button variant="outline" onClick={loadNewPrompt}>
            换一题再练
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span>总分 Band {result.band_overall}</span>
            </CardTitle>
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
    <div className="max-w-2xl mx-auto p-8">
      <MockSessionBanner />
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>
      <h1 className="text-2xl font-semibold mt-4 mb-4">口语 Part 2</h1>

      <Card className="mb-4">
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
        <Button onClick={beginExam} disabled={!item}>
          开始（1 分钟准备 + 2 分钟回答）
        </Button>
      )}

      {stage === 'running' && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <div className="text-sm text-muted-foreground">
                {timer.phase.label}
                {timer.phaseIndex === 1 && recorder.isRecording && (
                  <Badge variant="destructive" className="ml-2">
                    ● 录音中
                  </Badge>
                )}
              </div>
              <div className="text-3xl font-mono">{formatTime(timer.remaining)}</div>
            </div>
            {timer.phaseIndex === 1 && (
              <Button variant="outline" onClick={stopEarly}>
                提前结束
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {stage === 'processing' && <p className="text-muted-foreground">处理中（转写 + AI 评分，约 30-90 秒）…</p>}

      {recorder.error && <p className="text-sm text-destructive mt-2">{recorder.error}</p>}
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  )
}
