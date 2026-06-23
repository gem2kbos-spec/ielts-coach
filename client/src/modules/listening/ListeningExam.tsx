import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getListeningSectionForExam,
  submitListeningSection,
  submitListeningMock,
  type ListeningQuestion,
} from '@/lib/api'
import ListeningResult, { type ListeningGradedResult } from './ListeningResult'
import ListeningMockResult, { type ListeningMockGradedResult } from './ListeningMockResult'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'

type SectionData = Awaited<ReturnType<typeof getListeningSectionForExam>>

const LABEL_SELECT_TYPES = new Set(['multiple_choice', 'matching'])

function formatTime(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ListeningExam() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isMock = !id
  const sectionIds = isMock ? (searchParams.get('ids') || '').split(',').filter(Boolean) : [id!]
  const readingGapEnabled = isMock && searchParams.get('gap') !== '0'

  const [sections, setSections] = useState<SectionData[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Record<number, string | string[]>>>({})
  const [flagged, setFlagged] = useState<Record<string, Set<number>>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [audioState, setAudioState] = useState<'not_started' | 'playing' | 'ended'>('not_started')
  const [practiceMode, setPracticeMode] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [singleResult, setSingleResult] = useState<ListeningGradedResult | null>(null)
  const [mockResult, setMockResult] = useState<ListeningMockGradedResult | null>(null)
  const [sectionStartedAt, setSectionStartedAt] = useState(Date.now())
  const [inGap, setInGap] = useState(false)
  const [gapSecondsLeft, setGapSecondsLeft] = useState(30)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    Promise.all(sectionIds.map((sid) => getListeningSectionForExam(sid)))
      .then((loaded) => {
        setSections(loaded)
        setSecondsLeft(loaded[0]?.defaultDurationSec || 600)
      })
      .catch((e) => setError(e.message))
  }, [])

  const current = sections[currentIdx]

  useEffect(() => {
    if (!current) return
    setImageUrl(current.hasImage ? `/api/listening/sections/${current.id}/map-image` : null)
    setAudioState('not_started')
    setSectionStartedAt(Date.now())
  }, [current?.id])

  useEffect(() => {
    if (!current || singleResult || mockResult || inGap) return
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t)
          goNext()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, singleResult, mockResult, inGap])

  useEffect(() => {
    if (!inGap) return
    if (gapSecondsLeft <= 0) {
      setInGap(false)
      setCurrentIdx((i) => i + 1)
      setSecondsLeft(sections[currentIdx + 1]?.defaultDurationSec || 600)
      return
    }
    const t = setTimeout(() => setGapSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inGap, gapSecondsLeft])

  const setAnswer = (qNumber: number, value: string | string[]) => {
    if (!current) return
    setAnswers((prev) => ({ ...prev, [current.id]: { ...prev[current.id], [qNumber]: value } }))
  }

  const toggleFlag = (qNumber: number) => {
    if (!current) return
    setFlagged((prev) => {
      const set = new Set(prev[current.id] || [])
      if (set.has(qNumber)) set.delete(qNumber)
      else set.add(qNumber)
      return { ...prev, [current.id]: set }
    })
  }

  const goNext = () => {
    if (currentIdx + 1 < sections.length) {
      if (readingGapEnabled) {
        setInGap(true)
        setGapSecondsLeft(30)
      } else {
        setCurrentIdx((i) => i + 1)
        setSecondsLeft(sections[currentIdx + 1].defaultDurationSec || 600)
      }
    } else {
      finalize()
    }
  }

  const finalize = async () => {
    setSubmitting(true)
    setError('')
    try {
      if (!isMock) {
        const sec = sections[0]
        const sectionAnswers = Object.entries(answers[sec.id] || {}).map(([number, userAnswer]) => ({
          number: Number(number),
          userAnswer,
        }))
        const durationSec = Math.round((Date.now() - sectionStartedAt) / 1000)
        const result = await submitListeningSection(sec.id, sectionAnswers, durationSec)
        setSingleResult(result)
      } else {
        const sectionResults = sections.map((sec) => ({
          sectionId: sec.id,
          answers: Object.entries(answers[sec.id] || {}).map(([number, userAnswer]) => ({ number: Number(number), userAnswer })),
          durationSec: Math.round((sections[0].defaultDurationSec || 600) - 0),
        }))
        const totalDuration = sections.reduce((sum, s) => sum + (s.defaultDurationSec || 600), 0)
        const result = await submitListeningMock(sectionResults, totalDuration)
        setMockResult(result)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return <p className="p-8 text-destructive">{error}</p>
  if (singleResult) return <ListeningResult result={singleResult} onRetry={() => navigate(`/listening/exam/${sections[0].id}`)} />
  if (mockResult) return <ListeningMockResult result={mockResult} />
  if (!current) return <p className="p-8 text-muted-foreground">加载中…</p>

  if (inGap) {
    const next = sections[currentIdx + 1]
    return (
      <div className="max-w-md mx-auto p-8 mt-24 text-center space-y-4">
        <Badge>读题时间</Badge>
        <p className="text-4xl font-mono">{gapSecondsLeft}</p>
        <p className="text-sm text-muted-foreground">
          下一节：{next?.section || ''} {next?.title}，准备好后会自动开始
        </p>
      </div>
    )
  }

  const answeredCount = Object.keys(answers[current.id] || {}).length
  const flaggedSet = flagged[current.id] || new Set<number>()

  return (
    <div className="max-w-5xl mx-auto p-6">
      <MockSessionBanner />
      <div className="flex items-center justify-between mb-3">
        <Link to="/listening" className="text-sm text-muted-foreground hover:underline">
          ← 返回题库
        </Link>
        <div className="flex items-center gap-2">
          {isMock &&
            sections.map((s, i) => (
              <Badge key={s.id} variant={i === currentIdx ? 'default' : 'outline'}>
                {s.section || `S${i + 1}`}
              </Badge>
            ))}
          <Badge variant="outline">{answeredCount}/{current.questions.length} 已作答</Badge>
          <Badge className="font-mono">⏱ {formatTime(secondsLeft)}</Badge>
        </div>
      </div>

      <Card className="mb-3">
        <CardContent className="py-3 flex items-center gap-3">
          {!practiceMode ? (
            <>
              {audioState === 'not_started' && (
                <Button
                  size="sm"
                  onClick={() => {
                    setAudioState('playing')
                    audioRef.current?.play()
                  }}
                >
                  ▶ 开始播放
                </Button>
              )}
              {audioState === 'playing' && <Badge variant="secondary">播放中…(严格机考模式，不可拖动/回放)</Badge>}
              {audioState === 'ended' && <Badge variant="outline">已播放完毕</Badge>}
              <audio
                ref={audioRef}
                src={`/api/items/${current.id}/file`}
                onEnded={() => setAudioState('ended')}
                onContextMenu={(e) => e.preventDefault()}
              />
            </>
          ) : (
            <audio ref={audioRef} src={`/api/items/${current.id}/file`} controls className="flex-1" onEnded={() => setAudioState('ended')} />
          )}
          <label className="ml-auto flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={practiceMode} onChange={(e) => setPracticeMode(e.target.checked)} />
            练习模式(可暂停/回放)
          </label>
        </CardContent>
      </Card>

      <Card className="mb-16">
        <CardContent className="pt-6 space-y-4">
          {imageUrl && (
            <img src={imageUrl} alt="地图/示意图参考" className="max-w-full border border-border rounded-md" />
          )}
          {current.questions.map((q) => (
            <QuestionBlock
              key={q.number}
              q={q}
              answer={answers[current.id]?.[q.number]}
              flagged={flaggedSet.has(q.number)}
              onAnswer={(v) => setAnswer(q.number, v)}
              onFlag={() => toggleFlag(q.number)}
            />
          ))}
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <div className="flex gap-1 flex-wrap flex-1">
            {current.questions.map((q) => {
              const isAnswered = answers[current.id]?.[q.number] !== undefined
              const isFlagged = flaggedSet.has(q.number)
              return (
                <a
                  key={q.number}
                  href={`#q-${q.number}`}
                  className={`w-7 h-7 flex items-center justify-center text-xs rounded-md border ${
                    isFlagged ? 'border-yellow-500 ring-1 ring-yellow-500' : 'border-border'
                  } ${isAnswered ? 'bg-primary text-primary-foreground' : 'bg-transparent'}`}
                >
                  {q.number}
                </a>
              )
            })}
          </div>
          <Button onClick={goNext} disabled={submitting}>
            {submitting ? '判分中…' : currentIdx + 1 < sections.length ? '下一节' : '提交'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function QuestionBlock({
  q,
  answer,
  flagged,
  onAnswer,
  onFlag,
}: {
  q: Omit<ListeningQuestion, 'correct_answer' | 'explanation'>
  answer: string | string[] | undefined
  flagged: boolean
  onAnswer: (v: string | string[]) => void
  onFlag: () => void
}) {
  return (
    <div id={`q-${q.number}`} className="border-b border-border pb-3 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">
          {q.number}. {q.prompt}
        </p>
        <button onClick={onFlag} className={`text-xs px-2 py-0.5 rounded-full border ${flagged ? 'border-yellow-500 text-yellow-600' : 'border-border text-muted-foreground'}`}>
          {flagged ? '★ 已标记' : '☆ 标记'}
        </button>
      </div>

      {q.type === 'multiple_select' && (
        <div className="space-y-1">
          {q.options?.map((opt) => {
            const label = opt.match(/^([A-Za-z0-9]+)[.)]/)?.[1] || opt
            const selected = Array.isArray(answer) && answer.includes(label)
            return (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const cur = Array.isArray(answer) ? answer : []
                    const next = e.target.checked ? [...cur, label] : cur.filter((a) => a !== label)
                    onAnswer(next)
                  }}
                />
                {opt}
              </label>
            )
          })}
        </div>
      )}

      {LABEL_SELECT_TYPES.has(q.type) && (
        <div className="space-y-1">
          {q.options?.map((opt) => {
            const label = opt.match(/^([A-Za-z0-9]+)[.)]/)?.[1] || opt
            return (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name={`q${q.number}`} checked={answer === label} onChange={() => onAnswer(label)} />
                {opt}
              </label>
            )
          })}
        </div>
      )}

      {(q.type === 'fill_blank' || q.type === 'map_label') && (
        <input
          value={(answer as string) || ''}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="填写答案…"
          className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm"
        />
      )}
    </div>
  )
}
