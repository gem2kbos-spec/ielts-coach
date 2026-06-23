import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { getRandomPart1, submitPart1, type SpeakingPart1Item } from '@/lib/api'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'

const SCORE_LABEL: Record<string, string> = { fc: 'FC 流利度', lr: 'LR 词汇', gra: 'GRA 语法', pron: 'PRON 发音' }

export default function Part1Flow() {
  const [item, setItem] = useState<SpeakingPart1Item | null>(null)
  const [stage, setStage] = useState<'loading' | 'ready' | 'recording' | 'processing' | 'result'>('loading')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const recorder = useAudioRecorder()
  const startedAt = useRef(0)

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
            <CardTitle>总分 Band {result.band_overall}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['fc', 'lr', 'gra', 'pron'] as const).map((k) => (
                <div key={k}>
                  <div className="text-sm text-muted-foreground">{SCORE_LABEL[k]}</div>
                  <div className="text-2xl font-semibold">{result.scores[k]}</div>
                  <p className="text-xs text-muted-foreground mt-1">{result.comments[k]}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">转写</CardTitle>
          </CardHeader>
          <CardContent>
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
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <MockSessionBanner />
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>
      <h1 className="text-2xl font-semibold">口语 Part 1</h1>
      <p className="text-sm text-muted-foreground">
        没有准备时间，一次性连续回答下面所有问题（真实雅思Part1是考官逐题问、你逐题答，这里简化成一段连续录音）。
      </p>

      <Card>
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
          {stage === 'ready' && <Button onClick={begin}>开始回答</Button>}
          {stage === 'recording' && (
            <div className="flex items-center justify-between">
              <Badge variant="destructive">● 录音中</Badge>
              <Button onClick={stopAndSubmit}>停止并提交</Button>
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
