import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AudioLines, Gauge, Repeat2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { listShadowItems, compareShadow, type ShadowItem, type ShadowCompareResult } from '@/lib/api'

type Stage = 'pick' | 'recording' | 'processing' | 'result'

function diffBadge(label: string, diff: number, unit: string) {
  const sign = diff > 0 ? '+' : ''
  return (
    <Badge variant={Math.abs(diff) <= 1 ? 'secondary' : 'outline'}>
      {label} {sign}
      {diff}
      {unit}
    </Badge>
  )
}

export default function ShadowReading() {
  const [items, setItems] = useState<ShadowItem[] | null>(null)
  const [selected, setSelected] = useState<ShadowItem | null>(null)
  const [stage, setStage] = useState<Stage>('pick')
  const [result, setResult] = useState<ShadowCompareResult | null>(null)
  const [error, setError] = useState('')
  const recorder = useAudioRecorder()

  useEffect(() => {
    listShadowItems().then(setItems).catch((e) => setError(e.message))
  }, [])

  const startRecording = async () => {
    setStage('recording')
    await recorder.start()
  }

  const stopAndSubmit = async () => {
    if (!selected) return
    setStage('processing')
    const blob = await recorder.stop()
    if (!blob) {
      setError('没有录到音频')
      setStage('pick')
      return
    }
    try {
      const data = await compareShadow({ referenceItemId: selected.id, audioBlob: blob })
      setResult(data)
      setStage('result')
    } catch (e) {
      setError((e as Error).message)
      setStage('pick')
    }
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
              <AudioLines className="h-3.5 w-3.5 text-primary" />
              Shadow Reading
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">影子跟读</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                选一段范例音频，跟着录一遍。系统会对比语速、时长和停顿次数，适合做节奏训练。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Repeat2, label: '训练方式', value: '对比跟读', desc: '先听范例，再录自己的版本' },
              { icon: Gauge, label: '反馈维度', value: '3 项', desc: '语速、总时长、停顿次数' },
              { icon: AudioLines, label: '当前状态', value: stage === 'recording' ? '录音中' : stage === 'processing' ? '处理中' : stage === 'result' ? '已完成' : '待选择', desc: '完成后可立即继续下一轮' },
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

      {items && items.length === 0 && (
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              还没有跟读素材。去{' '}
              <Link to="/import" className="underline">
                题库导入
              </Link>{' '}
              页面拖一个 mp3/wav 范例音频进来（module 选 speaking，subtype 选 imported_audio）。
            </p>
          </CardContent>
        </Card>
      )}

      {items && items.length > 0 && stage === 'pick' && (
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-base">选一段范例音频</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/55 p-3">
                <span className="text-sm">{it.content.original_filename}</span>
                <Button size="sm" className="rounded-2xl px-4" variant={selected?.id === it.id ? 'default' : 'outline'} onClick={() => setSelected(it)}>
                  选这段
                </Button>
              </div>
            ))}
            {selected && (
              <>
                <audio src={`/api/items/${selected.id}/file`} controls className="w-full" />
                <Button className="rounded-2xl px-5" onClick={startRecording}>跟着录一遍</Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {stage === 'recording' && (
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardContent className="py-6 flex items-center justify-between">
            <Badge variant="destructive" className="rounded-full">● 录音中</Badge>
            <Button className="rounded-2xl px-5" onClick={stopAndSubmit}>停止并对比</Button>
          </CardContent>
        </Card>
      )}

      {stage === 'processing' && <p className="text-muted-foreground">处理中…</p>}

      {stage === 'result' && result && (
        <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <CardTitle className="text-base">对比结果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">范例</div>
                <p className="text-sm">语速 {result.reference.wpm} WPM</p>
                <p className="text-sm">时长 {result.reference.durationSec}s</p>
                <p className="text-sm">停顿 {result.reference.pauseCount} 次</p>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">你的跟读</div>
                <p className="text-sm">语速 {result.user.wpm} WPM</p>
                <p className="text-sm">时长 {result.user.durationSec}s</p>
                <p className="text-sm">停顿 {result.user.pauseCount} 次</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {diffBadge('语速差', result.diff.wpmDiff, ' WPM')}
              {diffBadge('时长差', result.diff.durationDiffSec, 's')}
              {diffBadge('停顿差', result.diff.pauseDiff, ' 次')}
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setStage('pick')
                setResult(null)
              }}
            >
              再练一次
            </Button>
          </CardContent>
        </Card>
      )}

      {recorder.error && <p className="text-sm text-destructive">{recorder.error}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
