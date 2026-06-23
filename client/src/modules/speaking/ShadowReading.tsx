import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { listShadowItems, compareShadow, type ShadowItem } from '@/lib/api'

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
  const [result, setResult] = useState<any>(null)
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
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>
      <h1 className="text-2xl font-semibold">影子跟读</h1>

      {items && items.length === 0 && (
        <Card>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">选一段范例音频</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between border border-border rounded-md p-3">
                <span className="text-sm">{it.content.original_filename}</span>
                <Button size="sm" variant={selected?.id === it.id ? 'default' : 'outline'} onClick={() => setSelected(it)}>
                  选这段
                </Button>
              </div>
            ))}
            {selected && (
              <>
                <audio src={`/api/items/${selected.id}/file`} controls className="w-full" />
                <Button onClick={startRecording}>跟着录一遍</Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {stage === 'recording' && (
        <Card>
          <CardContent className="py-6 flex items-center justify-between">
            <Badge variant="destructive">● 录音中</Badge>
            <Button onClick={stopAndSubmit}>停止并对比</Button>
          </CardContent>
        </Card>
      )}

      {stage === 'processing' && <p className="text-muted-foreground">处理中…</p>}

      {stage === 'result' && result && (
        <Card>
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
