import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Headphones } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
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
import ComparisonCard from '@/modules/history/ComparisonCard'
import { useAttemptComparison } from '@/modules/history/useAttemptComparison'
import StatePanel from '@/components/StatePanel'
import { useFocusMode } from '@/hooks/useFocusMode'

type SectionData = Awaited<ReturnType<typeof getListeningSectionForExam>>

const LABEL_SELECT_TYPES = new Set(['multiple_choice', 'matching'])

const TYPE_LABEL: Record<string, string> = {
  fill_blank: 'Completion',
  multiple_choice: 'Multiple choice',
  multiple_select: 'Multiple selection',
  matching: 'Matching',
  map_label: 'Map / plan labelling',
}

function defaultListeningInstructions(q: Omit<ListeningQuestion, 'correct_answer' | 'explanation'>) {
  if (q.type === 'multiple_choice') return 'Choose the correct letter, A, B or C.'
  if (q.type === 'multiple_select') return `Choose ${q.expectedCount || 'the correct'} answers.`
  if (q.type === 'matching') return 'Choose the correct option for each question.'
  if (q.type === 'map_label') return 'Label the map or plan below. Write the correct answer.'
  return q.prompt.toUpperCase().includes('NO MORE THAN')
    ? 'Complete the notes below. Write your answers in the boxes.'
    : 'Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.'
}

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
  const idsParam = searchParams.get('ids') || ''
  const sectionIds = useMemo(() => isMock ? idsParam.split(',').filter(Boolean) : [id!], [id, idsParam, isMock])
  const readingGapEnabled = isMock && searchParams.get('gap') !== '0'
  const retryQuestionNumbers = (searchParams.get('retry') || '')
    .split(',')
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0)

  const [sections, setSections] = useState<SectionData[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Record<number, string | string[]>>>({})
  const [flagged, setFlagged] = useState<Record<string, Set<number>>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [audioState, setAudioState] = useState<'not_started' | 'playing' | 'ended'>('not_started')
  const [practiceMode, setPracticeMode] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioError, setAudioError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [singleResult, setSingleResult] = useState<ListeningGradedResult | null>(null)
  const [mockResult, setMockResult] = useState<ListeningMockGradedResult | null>(null)
  const [sectionStartedAt, setSectionStartedAt] = useState(Date.now())
  const [inGap, setInGap] = useState(false)
  const [gapSecondsLeft, setGapSecondsLeft] = useState(30)
  const audioRef = useRef<HTMLAudioElement>(null)
  const comparison = useAttemptComparison(singleResult?.attemptId || mockResult?.attemptId)
  const focusMode = useFocusMode()

  useEffect(() => {
    Promise.all(sectionIds.map((sid) => getListeningSectionForExam(sid)))
      .then((loaded) => {
        setSections(loaded)
        setSecondsLeft(loaded[0]?.defaultDurationSec || 600)
      })
      .catch((e) => setError(e.message))
  }, [sectionIds])

  const current = sections[currentIdx]
  const visibleQuestions = !isMock && retryQuestionNumbers.length > 0
    ? current?.questions.filter((q) => retryQuestionNumbers.includes(q.number)) || []
    : current?.questions || []

  useEffect(() => {
    if (!current) return
    setAudioState('not_started')
    setAudioError('')
    setSectionStartedAt(Date.now())
    setPlaybackRate(1)
    let cancelled = false
    let nextAudioUrl: string | null = null
    let nextImageUrl: string | null = null

    fetch(`/api/items/${current.id}/file`)
      .then((res) => {
        if (!res.ok) throw new Error('音频文件暂时打不开')
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        nextAudioUrl = URL.createObjectURL(blob)
        setAudioUrl(nextAudioUrl)
      })
      .catch((e) => {
        if (!cancelled) {
          setAudioUrl(null)
          setAudioError((e as Error).message)
        }
      })

    if (current.hasImage) {
      fetch(`/api/listening/sections/${current.id}/map-image`)
        .then((res) => {
          if (!res.ok) throw new Error('map image unavailable')
          return res.blob()
        })
        .then((blob) => {
          if (cancelled) return
          nextImageUrl = URL.createObjectURL(blob)
          setImageUrl(nextImageUrl)
        })
        .catch(() => {
          if (!cancelled) setImageUrl(null)
        })
    } else {
      setImageUrl(null)
    }

    return () => {
      cancelled = true
      if (nextAudioUrl) URL.revokeObjectURL(nextAudioUrl)
      if (nextImageUrl) URL.revokeObjectURL(nextImageUrl)
    }
  }, [current])

  // 严格机考模式不允许变速(跟真实考试一致)，只有练习模式才能调
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = practiceMode ? playbackRate : 1
  }, [playbackRate, practiceMode, current?.id])

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
        const result = await submitListeningSection(sec.id, sectionAnswers, durationSec, retryQuestionNumbers.length > 0 ? retryQuestionNumbers : undefined)
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

  if (error) return <StatePanel title="听力考试暂时打不开" description={error} tone="error" backTo="/listening" backLabel="返回听力题库" />
  if (singleResult) {
    return (
      <div>
        {comparison && (
          <div className="max-w-3xl mx-auto pt-8 px-8">
            <ComparisonCard previous={comparison.previous} delta={comparison.delta} />
          </div>
        )}
        <ListeningResult
          result={singleResult}
          onRetry={() => navigate(`/listening/exam/${sections[0].id}`)}
          onRetryWrong={
            singleResult.perQuestion.some((q) => !q.correct)
              ? () => navigate(`/listening/exam/${sections[0].id}?retry=${singleResult.perQuestion.filter((q) => !q.correct).map((q) => q.number).join(',')}`)
              : undefined
          }
        />
      </div>
    )
  }
  if (mockResult) {
    return (
      <div>
        {comparison && (
          <div className="max-w-3xl mx-auto pt-8 px-8">
            <ComparisonCard previous={comparison.previous} delta={comparison.delta} />
          </div>
        )}
        <ListeningMockResult result={mockResult} />
      </div>
    )
  }
  if (!current) return <StatePanel title="正在准备听力考试" description="系统正在载入题目、音频和当前 section 配置。" tone="loading" backTo="/listening" backLabel="返回听力题库" />

  if (inGap) {
    const next = sections[currentIdx + 1]
    return (
      <div className="mx-auto mt-24 max-w-xl space-y-4 px-5 text-center">
        <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <CardContent className="space-y-4 py-8">
            <Badge className="rounded-full">读题时间</Badge>
            <p className="text-4xl font-mono">{gapSecondsLeft}</p>
            <p className="text-sm text-muted-foreground">
              下一节：{next?.section || ''} {next?.title}，准备好后会自动开始
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const answeredCount = visibleQuestions.filter((q) => (answers[current.id]?.[q.number] !== undefined)).length
  const flaggedSet = flagged[current.id] || new Set<number>()

  const startAudio = async () => {
    if (!audioRef.current) return
    setAudioError('')
    try {
      await audioRef.current.play()
      setAudioState('playing')
    } catch (e) {
      setAudioState('not_started')
      setAudioError(`音频播放被浏览器拦截：${(e as Error).message || '请再点一次播放，或切到练习模式使用播放器控件'}`)
    }
  }

  return (
    <div className={cn('min-h-screen bg-[#eef1f4] pb-20 text-slate-950', focusMode.enabled && 'pb-16')}>
      {!focusMode.enabled && <MockSessionBanner />}

      <div className="sticky top-0 z-30 border-b border-slate-300 bg-[#f7f8fa]/95 shadow-sm backdrop-blur">
        <div className={cn('mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-4 py-2 pr-28 sm:px-6 xl:pr-44', focusMode.enabled && 'max-w-[1820px] px-4 py-1.5')}>
          <div className="flex min-w-0 items-center gap-3">
            {!focusMode.enabled && (
              <Link to="/listening" className="shrink-0 text-xs font-medium text-slate-600 hover:underline">
                ← Back
              </Link>
            )}
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">IELTS Listening</div>
              <h1 className="truncate text-sm font-semibold sm:text-base">
                {current.section ? `${current.section} · ` : ''}{current.title}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isMock &&
              sections.map((s, i) => (
                <span
                  key={s.id}
	                  className={cn(
	                    'hidden h-7 items-center rounded-sm border px-2 text-xs font-semibold sm:inline-flex',
	                    i === currentIdx
	                      ? 'border-slate-900 bg-slate-900 text-white'
	                      : 'border-slate-300 bg-white text-slate-700'
	                  )}
                >
                  {s.section || `S${i + 1}`}
                </span>
              ))}
            <span className="rounded-sm border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium">
              {answeredCount}/{visibleQuestions.length}
            </span>
            <span className={cn('rounded-sm border border-slate-900 bg-slate-900 px-3 py-1 font-mono text-sm font-semibold text-white', secondsLeft < 300 && 'border-red-600 bg-red-600 text-white')}>
              {formatTime(secondsLeft)}
            </span>
          </div>
        </div>
      </div>

      <main className={cn('mx-auto grid max-w-[1560px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)]', focusMode.enabled && 'max-w-[1820px] gap-3 px-3 py-3 sm:px-4 lg:grid-cols-[300px_minmax(0,1fr)]')}>
        <aside className="lg:sticky lg:top-[60px] lg:self-start">
          <div className="border border-slate-300 bg-white shadow-sm">
            <div className="border-b border-slate-300 bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              Audio
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-full border', audioState === 'playing' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-700')}>
                  <Headphones className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{audioState === 'playing' ? 'Audio is playing' : audioState === 'ended' ? 'Audio finished' : 'Ready to play'}</div>
                  <div className="text-xs text-slate-500">{practiceMode ? 'Practice controls enabled' : 'Computer-delivered mode'}</div>
                </div>
              </div>

              {!practiceMode ? (
                <div className="space-y-3">
                  {audioState === 'not_started' && (
                    <Button
                      className="h-10 w-full rounded-sm bg-slate-900 text-white hover:bg-slate-800"
                      size="sm"
                      disabled={!audioUrl}
                      onClick={startAudio}
                    >
                      Start audio
                    </Button>
                  )}
                  {audioState === 'playing' && <div className="border border-emerald-500 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">Playing. The audio cannot be paused in exam mode.</div>}
                  {audioState === 'ended' && <div className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium">Audio playback has ended.</div>}
                  <audio
                    ref={audioRef}
                    src={audioUrl || undefined}
                    onEnded={() => setAudioState('ended')}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <audio ref={audioRef} src={audioUrl || undefined} controls className="w-full" onEnded={() => setAudioState('ended')} />
                  <div className="grid grid-cols-3 gap-1">
                    {[0.8, 1, 1.2].map((rate) => (
                      <Button
                        key={rate}
                        size="sm"
                        className="rounded-sm px-2"
                        variant={playbackRate === rate ? 'default' : 'outline'}
                        onClick={() => setPlaybackRate(rate)}
                      >
                        {rate}x
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
                <input type="checkbox" checked={practiceMode} onChange={(e) => setPracticeMode(e.target.checked)} />
                Practice mode: pause, replay and speed controls
              </label>
              {audioError && <p className="text-xs leading-5 text-red-600">{audioError}</p>}
              {!audioUrl && !audioError && <p className="text-xs text-slate-500">Loading audio...</p>}
            </div>
          </div>

          <div className="mt-4 border border-slate-300 bg-white p-4 text-sm shadow-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Section status</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="border border-slate-200 p-2">
                <div className="text-slate-500">Questions</div>
                <div className="mt-1 text-lg font-semibold">{visibleQuestions.length}</div>
              </div>
              <div className="border border-slate-200 p-2">
                <div className="text-slate-500">Answered</div>
                <div className="mt-1 text-lg font-semibold">{answeredCount}</div>
              </div>
            </div>
            {retryQuestionNumbers.length > 0 && <p className="mt-3 border border-blue-300 bg-blue-50 p-2 text-xs text-blue-800">Wrong-answer retry: {visibleQuestions.length} questions only.</p>}
          </div>
        </aside>

        <section className="min-w-0 border border-slate-300 bg-white shadow-sm">
          <div className="border-b border-slate-300 bg-slate-100 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Question paper</div>
                <h2 className="mt-1 text-lg font-semibold">
                  Questions {visibleQuestions[0]?.number || 1}-{visibleQuestions[visibleQuestions.length - 1]?.number || visibleQuestions.length}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="inline-flex h-5 w-5 items-center justify-center border border-yellow-500 text-yellow-700">★</span>
                Review flag
              </div>
            </div>
          </div>

          <div className={cn('space-y-5 p-5', focusMode.enabled && 'p-4')}>
            {imageUrl && (
              <img src={imageUrl} alt="地图/示意图参考" className="max-w-full border border-slate-300" />
            )}
            {visibleQuestions.map((q, idx) => (
              <QuestionBlock
                key={q.number}
                q={q}
                answer={answers[current.id]?.[q.number]}
                flagged={flaggedSet.has(q.number)}
                showInstruction={idx === 0 || visibleQuestions[idx - 1]?.type !== q.type}
                onAnswer={(v) => setAnswer(q.number, v)}
                onFlag={() => toggleFlag(q.number)}
              />
            ))}
            {visibleQuestions.length === 0 && (
              <p className="border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                这篇听力没有读取到题目，请回到导入页检查题目结构。
              </p>
            )}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-300 bg-[#f7f8fa]/95 shadow-[0_-4px_18px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="mx-auto flex max-w-[1560px] items-center gap-3 px-4 py-2 sm:px-6">
          <div className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block">Navigation</div>
          <div className="flex flex-1 flex-wrap gap-1">
            {visibleQuestions.map((q) => {
              const isAnswered = answers[current.id]?.[q.number] !== undefined
              const isFlagged = flaggedSet.has(q.number)
              return (
                <a
                  key={q.number}
                  href={`#q-${q.number}`}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center border text-xs font-semibold transition-colors',
                    isAnswered
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-700',
                    isFlagged && 'border-yellow-500 bg-yellow-50 text-yellow-800 ring-1 ring-yellow-500'
                  )}
                >
                  {q.number}
                </a>
              )
            })}
          </div>
          <Button className="h-9 rounded-sm bg-slate-900 px-5 text-white hover:bg-slate-800" onClick={goNext} disabled={submitting}>
            {submitting ? 'Marking...' : currentIdx + 1 < sections.length ? 'Next section' : 'Submit'}
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
  showInstruction,
  onAnswer,
  onFlag,
}: {
  q: Omit<ListeningQuestion, 'correct_answer' | 'explanation'>
  answer: string | string[] | undefined
  flagged: boolean
  showInstruction: boolean
  onAnswer: (v: string | string[]) => void
  onFlag: () => void
}) {
  return (
    <div id={`q-${q.number}`} className="scroll-mt-24 border border-slate-300 bg-white">
      {showInstruction && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{TYPE_LABEL[q.type] || q.type}</div>
          <p className="mt-1 text-sm font-medium leading-6">{defaultListeningInstructions(q)}</p>
        </div>
      )}

      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="flex items-start gap-2 text-[15px] font-medium leading-7">
            <span className="mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center border border-slate-400 bg-slate-100 px-1 text-xs font-semibold">{q.number}</span>
            <span>{q.prompt}</span>
          </p>
          <button
            onClick={onFlag}
            className={cn(
              'shrink-0 border px-2 py-1 text-xs font-medium',
              flagged
                ? 'border-yellow-500 bg-yellow-50 text-yellow-800'
                : 'border-slate-300 text-slate-600 hover:border-slate-600'
            )}
          >
            {flagged ? '★ Review' : '☆ Review'}
          </button>
        </div>

        {q.type === 'multiple_select' && (
          <div className="space-y-2">
            {q.options?.map((opt) => {
              const label = opt.match(/^([A-Za-z0-9]+)[.)]/)?.[1] || opt
              const selected = Array.isArray(answer) && answer.includes(label)
              return (
                <label key={opt} className="flex cursor-pointer items-start gap-3 border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 hover:border-slate-400">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const cur = Array.isArray(answer) ? answer : []
                      const next = e.target.checked ? [...cur, label] : cur.filter((a) => a !== label)
                      onAnswer(next)
                    }}
                  />
                  <span>{opt}</span>
                </label>
              )
            })}
          </div>
        )}

        {LABEL_SELECT_TYPES.has(q.type) && (
          <div className="space-y-2">
            {q.options?.map((opt) => {
              const label = opt.match(/^([A-Za-z0-9]+)[.)]/)?.[1] || opt
              return (
                <label key={opt} className="flex cursor-pointer items-start gap-3 border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 hover:border-slate-400">
                  <input className="mt-1" type="radio" name={`q${q.number}`} checked={answer === label} onChange={() => onAnswer(label)} />
                  <span>{opt}</span>
                </label>
              )
            })}
          </div>
        )}

        {(q.type === 'fill_blank' || q.type === 'map_label') && (
          <input
            value={(answer as string) || ''}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Type your answer"
            className="h-10 w-full max-w-md border border-slate-400 bg-white px-3 text-[15px] outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        )}
      </div>
    </div>
  )
}
