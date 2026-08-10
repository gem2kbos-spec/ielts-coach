import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AudioLines, FileAudio, ScanText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getListeningSectionForExam, checkDictation, type DictationResult } from '@/lib/api'
import { useDraftAutosave } from '@/hooks/useDraftAutosave'
import DraftStatus from '@/components/DraftStatus'

export default function ListeningDictation() {
  const { id } = useParams<{ id: string }>()
  const [title, setTitle] = useState('')
  const [hasTranscript, setHasTranscript] = useState<boolean | null>(null)
  const [userText, setUserText] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<DictationResult | null>(null)
  const [error, setError] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)
  const draft = useDraftAutosave<string>({
    storageKey: id ? `draft:listening-dictation:${id}` : 'draft:listening-dictation:pending',
    value: userText,
    enabled: !!id && !result,
    onLoad: setUserText,
    serialize: (value) => value,
    deserialize: (raw) => raw,
  })

  useEffect(() => {
    if (!id) return
    getListeningSectionForExam(id)
      .then((s) => {
        setTitle(s.title)
        setHasTranscript(s.hasTranscript)
      })
      .catch((e) => setError(e.message))
  }, [id])

  const submit = async () => {
    if (!id) return
    setChecking(true)
    setError('')
    try {
      const r = await checkDictation(id, userText)
      draft.clear()
      setResult(r)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setChecking(false)
    }
  }

  const retry = () => {
    setResult(null)
    setUserText('')
  }

  if (hasTranscript === false) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
        <Link to="/listening" className="text-sm text-muted-foreground hover:underline">← 返回听力题库</Link>
        <p className="text-sm text-destructive">这个 section 没有听力原文，所以暂时不能做听写练习。</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link to="/listening" className="text-sm text-muted-foreground hover:underline">← 返回听力题库</Link>
        {!result && <DraftStatus status={draft.status} onClear={draft.clear} compact />}
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <AudioLines className="h-3.5 w-3.5 text-primary" />
              Dictation Mode
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">听写模式 {title && `· ${title}`}</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                可随时暂停和回放。系统会按逐词比对来检查，不会因为前面漏了一个词就让后面整段全部错位。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: FileAudio, label: '当前状态', value: result ? '已完成对比' : '待听写', desc: result ? '结果已按逐词差异显示' : '先听音频，再把内容写下来' },
              { icon: ScanText, label: '检查方式', value: '逐词比对', desc: '更接近真实听写纠错的反馈方式' },
              { icon: AudioLines, label: '原文支持', value: hasTranscript === null ? '加载中' : hasTranscript ? '可比对' : '不可用', desc: '只有带 transcript 的素材支持这项训练' },
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

      {id && (
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardContent className="p-6">
            <audio ref={audioRef} src={`/api/items/${id}/file`} controls className="w-full" />
          </CardContent>
        </Card>
      )}

      {!result && (
        <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <CardContent className="space-y-4 p-6">
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="把听到的内容写在这里…"
              className="min-h-[260px] w-full rounded-[24px] border border-border/70 bg-background/70 p-4 text-sm leading-7 outline-none transition-colors focus:border-primary/50"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={submit} disabled={checking || !userText.trim()} className="rounded-2xl px-5">
                {checking ? '对比中…' : '对比原文'}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card className="rounded-[28px] border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle className="text-base">听写正确率 {result.accuracy}%（{result.correctCount}/{result.totalWords} 词）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm leading-8">
                {result.refDiff.map((w, i) => (
                  <span key={i} className={w.matched ? undefined : 'rounded bg-red-500/15 px-1 text-red-300 underline decoration-red-300/70 underline-offset-2'}>
                    {w.word}{' '}
                  </span>
                ))}
              </div>
              {result.extraWords.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">你多打的内容：</p>
                  <div className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                    {result.extraWords.join(' ')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-[28px] border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle className="text-base">你写的内容</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{userText}</p>
            </CardContent>
          </Card>
          <Button variant="outline" className="rounded-2xl px-5" onClick={retry}>再写一次</Button>
        </>
      )}

      {hasTranscript === null && <Badge variant="outline" className="rounded-full">加载中…</Badge>}
    </div>
  )
}
