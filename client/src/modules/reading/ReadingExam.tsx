import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import FloatingToast from '@/components/FloatingToast'
import {
  getReadingPassageForExam,
  submitReadingPassage,
  addVocab,
  type ReadingQuestion,
} from '@/lib/api'
import ReadingResult, { type GradedResult } from './ReadingResult'
import ComparisonCard from '@/modules/history/ComparisonCard'
import { useAttemptComparison } from '@/modules/history/useAttemptComparison'
import { useWritingTimer } from '@/hooks/useWritingTimer'
import StatePanel from '@/components/StatePanel'
import { useFocusMode } from '@/hooks/useFocusMode'
import { useDraftAutosave } from '@/hooks/useDraftAutosave'
import DraftStatus from '@/components/DraftStatus'

type Highlight = { id: string; start: number; end: number; text: string; note: string; kind: 'user' | 'vocab' }
type QuestionHighlight = {
  id: string
  start: number
  end: number
  text: string
  scope: 'prompt' | 'option'
  optionIndex?: number
}
type Popup =
  | { mode: 'passage'; x: number; y: number; selectedText: string; start: number; end: number }
  | {
      mode: 'question'
      x: number
      y: number
      selectedText: string
      questionNumber: number
      start: number
      end: number
      scope: 'prompt' | 'option'
      optionIndex?: number
    }
  | null

const LABEL_SELECT_TYPES = new Set(['multiple_choice', 'matching_heading', 'matching_information'])
const TEXT_INPUT_TYPES = new Set(['short_answer', 'sentence_completion', 'summary_completion', 'table_completion'])

function defaultReadingInstructions(type: ReadingQuestion['type']) {
  switch (type) {
    case 'true_false_ng':
      return 'Do the following statements agree with the information given in the reading passage? Write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.'
    case 'multiple_choice':
      return 'Choose the correct letter, A, B, C or D.'
    case 'short_answer':
      return 'Answer the questions below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage for each answer.'
    case 'sentence_completion':
      return 'Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.'
    case 'summary_completion':
      return 'Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.'
    case 'matching_heading':
      return 'Choose the correct heading for each paragraph from the list of headings below.'
    case 'matching_information':
      return 'Which paragraph contains the following information? Write the correct letter, A, B, C, D or E.'
    case 'table_completion':
      return 'Complete the notes/table below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage for each answer.'
    default:
      return 'Answer the questions below.'
  }
}

function questionInstructions(q: Pick<ReadingQuestion, 'type' | 'instructions'>) {
  return q.instructions?.trim() || defaultReadingInstructions(q.type)
}

function questionRangeLabel(questions: Array<Pick<ReadingQuestion, 'number'>>) {
  if (questions.length === 0) return ''
  const first = questions[0].number
  const last = questions[questions.length - 1].number
  return first === last ? `Question ${first}` : `Questions ${first}-${last}`
}

function findWordOccurrences(text: string, words: string[]): Highlight[] {
  const found: Highlight[] = []
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${escaped}\\b`, 'gi')
    let match
    while ((match = re.exec(text))) {
      found.push({ id: `vocab-${match.index}`, start: match.index, end: match.index + word.length, text: match[0], note: '待巩固词', kind: 'vocab' })
    }
  }
  return found
}

// 计算选区在容器纯文本中的字符偏移（用于按 offset 渲染高亮，而不是按字符串匹配——
// 同一个词/短语在文章里可能出现多次，必须靠位置区分）
function getOffset(container: HTMLElement, node: Node, nodeOffset: number) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === node) return offset + nodeOffset;
    offset += current.textContent?.length || 0;
    current = walker.nextNode();
  }
  return offset;
}

function renderWithHighlights(text: string, highlights: Highlight[]) {
  if (highlights.length === 0) return text
  // 用户高亮优先于植入词高亮(同一段重叠时只画一层，避免互相打断)
  const sorted = [...highlights].sort((a, b) => a.start - b.start || (a.kind === 'user' ? -1 : 1))
  const nodes: React.ReactNode[] = []
  let cursor = 0
  sorted.forEach((h, i) => {
    if (h.start < cursor) return // 跳过与已渲染区域重叠的
    if (h.start > cursor) nodes.push(<span key={`t${i}`}>{text.slice(cursor, h.start)}</span>)
    nodes.push(
      <Tooltip key={`h${i}`}>
        <TooltipTrigger asChild>
          <span
            className={
              h.kind === 'vocab'
                ? 'cursor-help rounded-[2px] bg-yellow-300/55 text-foreground ring-1 ring-yellow-500/35 dark:bg-yellow-300/80 dark:text-slate-950 dark:ring-yellow-200/80'
                : 'cursor-help rounded-[2px] bg-yellow-300/75 text-foreground ring-1 ring-yellow-500/45 dark:bg-yellow-300 dark:text-slate-950 dark:ring-yellow-100'
            }
          >
            {text.slice(h.start, h.end)}
          </span>
        </TooltipTrigger>
        <TooltipContent>{h.note || '（无笔记）'}</TooltipContent>
      </Tooltip>
    )
    cursor = Math.max(cursor, h.end)
  })
  if (cursor < text.length) nodes.push(<span key="last">{text.slice(cursor)}</span>)
  return nodes
}

function renderRangeHighlights(text: string, highlights: Array<{ id: string; start: number; end: number }>): ReactNode {
  if (highlights.length === 0) return text
  const sorted = [...highlights].sort((a, b) => a.start - b.start)
  const nodes: ReactNode[] = []
  let cursor = 0
  sorted.forEach((h, i) => {
    if (h.start < cursor) return
    if (h.start > cursor) nodes.push(<span key={`plain-${h.id}-${i}`}>{text.slice(cursor, h.start)}</span>)
    nodes.push(
      <span key={`mark-${h.id}-${i}`} className="rounded-[2px] bg-yellow-300/75 text-foreground ring-1 ring-yellow-500/45 dark:bg-yellow-300 dark:text-slate-950 dark:ring-yellow-100">
        {text.slice(h.start, h.end)}
      </span>
    )
    cursor = h.end
  })
  if (cursor < text.length) nodes.push(<span key="plain-last">{text.slice(cursor)}</span>)
  return nodes
}

export default function ReadingExam() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [passage, setPassage] = useState<{ id: string; title: string; passage_text: string; injected_vocab: string[]; questions: Omit<ReadingQuestion, 'correct_answer' | 'answer_confidence'>[] } | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [strikethrough, setStrikethrough] = useState<Set<string>>(new Set())
  const timer = useWritingTimer(20 * 60) // IELTS 单篇阅读标准时间 20 分钟
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [questionHighlights, setQuestionHighlights] = useState<Record<number, QuestionHighlight[]>>({})
  const [showVocabHighlight, setShowVocabHighlight] = useState(true)
  const [popup, setPopup] = useState<Popup>(null)
  const [noteInput, setNoteInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<GradedResult | null>(null)
  const [showFullResult, setShowFullResult] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const comparison = useAttemptComparison(result?.attemptId)
  const focusMode = useFocusMode()
  const containerRef = useRef<HTMLDivElement>(null)
  const questionRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const retryQuestionNumbers = useMemo(
    () => (searchParams.get('retry') || '')
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n > 0),
    [searchParams],
  )
  const retryKey = retryQuestionNumbers.join(',') || 'all'
  const draft = useDraftAutosave({
    storageKey: id ? `draft:reading-exam:${id}:${retryKey}` : 'draft:reading-exam:pending',
    value: {
      answers,
      strikethrough: [...strikethrough],
      highlights,
      questionHighlights,
      showVocabHighlight,
    },
    enabled: !!passage && !result,
    onLoad: (saved: {
      answers: Record<number, string>
      strikethrough: string[]
      highlights: Highlight[]
      questionHighlights: Record<number, QuestionHighlight[]>
      showVocabHighlight: boolean
    }) => {
      setAnswers(saved.answers || {})
      setStrikethrough(new Set(saved.strikethrough || []))
      setHighlights(saved.highlights || [])
      setQuestionHighlights(saved.questionHighlights || {})
      setShowVocabHighlight(saved.showVocabHighlight ?? true)
    },
  })

  useEffect(() => {
    if (!id) return
    getReadingPassageForExam(id).then(setPassage).catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    if (!passage || currentQuestion !== null) return
    const first = retryQuestionNumbers.length > 0
      ? passage.questions.find((q) => retryQuestionNumbers.includes(q.number))
      : passage.questions[0]
    if (first) setCurrentQuestion(first.number)
  }, [currentQuestion, passage, retryQuestionNumbers])

  const handleMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !containerRef.current) return setPopup(null)
    const text = sel.toString().trim()
    if (!text) return setPopup(null)
    const range = sel.getRangeAt(0)
    if (!containerRef.current.contains(range.commonAncestorContainer)) return setPopup(null)
    const start = getOffset(containerRef.current, range.startContainer, range.startOffset)
    const end = getOffset(containerRef.current, range.endContainer, range.endOffset)
    const rect = range.getBoundingClientRect()
    setPopup({ mode: 'passage', x: rect.left + rect.width / 2, y: rect.top - 8, selectedText: text, start, end })
  }

  const handleQuestionMouseUp = (questionNumber: number) => {
    if (result) return
    const sel = window.getSelection()
    const questionEl = questionRefs.current.get(questionNumber)
    if (!sel || sel.isCollapsed || !questionEl) return
    const text = sel.toString().trim()
    if (!text) return
    const range = sel.getRangeAt(0)
    if (!questionEl.contains(range.commonAncestorContainer)) return
    const anchor =
      (range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as HTMLElement))?.closest('[data-highlight-scope]') as HTMLElement | null
    if (!anchor || !questionEl.contains(anchor)) return
    const scope = anchor.dataset.highlightScope === 'option' ? 'option' : 'prompt'
    const optionIndex = scope === 'option' ? Number(anchor.dataset.optionIndex) : undefined
    const start = getOffset(anchor, range.startContainer, range.startOffset)
    const end = getOffset(anchor, range.endContainer, range.endOffset)
    const rect = range.getBoundingClientRect()
    setPopup({
      mode: 'question',
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      selectedText: text,
      questionNumber,
      start,
      end,
      scope,
      optionIndex: Number.isFinite(optionIndex) ? optionIndex : undefined,
    })
  }

  const addHighlight = () => {
    if (!popup) return
    if (popup.mode === 'passage') {
      setHighlights((prev) => [
        ...prev,
        { id: crypto.randomUUID(), start: popup.start, end: popup.end, text: popup.selectedText, note: noteInput, kind: 'user' },
      ])
    } else {
      setQuestionHighlights((prev) => {
        const existing = prev[popup.questionNumber] || []
        if (existing.some((h) => h.scope === popup.scope && h.optionIndex === popup.optionIndex && h.start === popup.start && h.end === popup.end)) {
          return prev
        }
        return {
          ...prev,
          [popup.questionNumber]: [
            ...existing,
            {
              id: crypto.randomUUID(),
              start: popup.start,
              end: popup.end,
              text: popup.selectedText,
              scope: popup.scope,
              optionIndex: popup.optionIndex,
            },
          ],
        }
      })
    }
    setNoteInput('')
    setPopup(null)
    window.getSelection()?.removeAllRanges()
  }

  const markVocab = async () => {
    if (!popup || popup.mode !== 'passage' || !passage) return
    const word = popup.selectedText
    setPopup(null)
    window.getSelection()?.removeAllRanges()
    try {
      const entry = await addVocab({ word, sourceItemId: passage.id })
      setToast(entry.alreadyExists ? `"${word}" 已在词库中` : `已加入词汇库：${word}`)
      setTimeout(() => setToast(''), 2500)
    } catch (e) {
      setToast((e as Error).message)
    }
  }

  const toggleStrikethrough = (key: string) => {
    setStrikethrough((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!passage) return
    if (!timer.started) {
      setToast('请先点击 Start Timer 再提交。')
      setTimeout(() => setToast(''), 2500)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = visibleQuestions.map((q) => ({ number: q.number, userAnswer: answers[q.number] || '' }))
      const graded = await submitReadingPassage(
        passage.id,
        payload,
        timer.getElapsed(),
        !timer.isOvertime,
        timer.overtime,
        visibleQuestions.map((q) => q.number),
      )
      draft.clear()
      setResult(graded)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const scrollToQuestion = (num: number) => {
    setCurrentQuestion(num)
    questionRefs.current.get(num)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (error) {
    return (
      <StatePanel
        title="这篇阅读暂时没打开"
        description={error}
        tone="error"
        backTo="/reading"
        backLabel="返回阅读题库"
      />
    )
  }
  if (!passage) {
    return (
      <StatePanel
        title="正在载入阅读做题界面"
        description="系统正在整理文章正文、题目、计时器和上次作答状态。"
        tone="loading"
        backTo="/reading"
        backLabel="返回阅读题库"
      />
    )
  }

  if (result && showFullResult) {
    return (
      <div>
        {comparison && (
          <div className="max-w-3xl mx-auto pt-8 px-8">
            <ComparisonCard previous={comparison.previous} delta={comparison.delta} />
          </div>
        )}
        <ReadingResult
          result={result}
          onRetry={() => navigate(`/reading/exam/${passage.id}`)}
          onRetryWrong={
            result.perQuestion.some((q) => !q.correct)
              ? () => navigate(`/reading/exam/${passage.id}?retry=${result.perQuestion.filter((q) => !q.correct).map((q) => q.number).join(',')}`)
              : undefined
          }
        />
      </div>
    )
  }

  // result 已出但还未跳到详细分析页时，把每题的对错结果存成 Map 方便查
  const resultMap = result ? new Map(result.perQuestion.map((pq) => [pq.number, pq])) : null
  const retryQuestions = retryQuestionNumbers.length > 0
    ? passage.questions.filter((q) => retryQuestionNumbers.includes(q.number))
    : []
  const visibleQuestions = retryQuestionNumbers.length > 0 && retryQuestions.length > 0
    ? retryQuestions
    : passage.questions
  const answeredCount = visibleQuestions.filter((q) => (answers[q.number] || '').trim()).length
  const unansweredCount = Math.max(visibleQuestions.length - answeredCount, 0)
  const progressPercent = visibleQuestions.length > 0 ? Math.round((answeredCount / visibleQuestions.length) * 100) : 0
  const vocabHighlights = showVocabHighlight && passage.injected_vocab.length
    ? findWordOccurrences(passage.passage_text, passage.injected_vocab)
    : []
  const allHighlights = [...highlights, ...vocabHighlights]
  const handleExamKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (result) return
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    const currentIndex = currentQuestion ? visibleQuestions.findIndex((q) => q.number === currentQuestion) : 0
    const current = visibleQuestions[currentIndex >= 0 ? currentIndex : 0]
    if (!current) return

    if (event.key === 'ArrowRight') {
      const next = visibleQuestions[Math.min((currentIndex >= 0 ? currentIndex : 0) + 1, visibleQuestions.length - 1)]
      if (next) {
        event.preventDefault()
        scrollToQuestion(next.number)
      }
      return
    }
    if (event.key === 'ArrowLeft') {
      const prev = visibleQuestions[Math.max((currentIndex >= 0 ? currentIndex : 0) - 1, 0)]
      if (prev) {
        event.preventDefault()
        scrollToQuestion(prev.number)
      }
      return
    }

    const key = event.key.toUpperCase()
    if (current.type === 'true_false_ng') {
      const mapped = key === 'T' ? 'TRUE' : key === 'F' ? 'FALSE' : key === 'N' ? 'NOT GIVEN' : ''
      if (mapped) {
        event.preventDefault()
        setAnswers((prev) => ({ ...prev, [current.number]: mapped }))
      }
      return
    }
    if (LABEL_SELECT_TYPES.has(current.type) && /^[A-Z0-9]$/.test(key)) {
      const option = current.options?.find((opt) => (opt.match(/^([A-Za-z0-9]+)[.)]/)?.[1] || opt).toUpperCase() === key)
      if (option) {
        event.preventDefault()
        const label = option.match(/^([A-Za-z0-9]+)[.)]/)?.[1] || option
        setAnswers((prev) => ({ ...prev, [current.number]: label }))
      }
    }
  }

  return (
    <div
      className={cn('min-h-screen bg-background px-4 pb-20 pt-4 sm:px-6 xl:px-8', focusMode.enabled && 'px-3 pt-3 sm:px-4')}
      onKeyDown={handleExamKeyDown}
    >
      <div className={cn('mx-auto mb-4 max-w-[1680px] rounded-[22px] border border-border/70 bg-card/82 p-4 pr-24 shadow-[0_14px_34px_rgba(15,23,42,0.045)] backdrop-blur sm:pr-32 xl:pr-44', focusMode.enabled && 'mb-3 max-w-[1820px] p-3 sm:p-4')}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className={cn('space-y-2', focusMode.enabled && 'space-y-1.5')}>
            {!focusMode.enabled && (
              <Link to="/reading" className="inline-flex text-sm text-muted-foreground hover:underline">
                ← 返回题库
              </Link>
            )}
            <div>
              <div className={cn('mb-1.5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground', focusMode.enabled && 'mb-1 px-2.5 py-0.5')}>
                Reading Passage
              </div>
              <h1 className={cn('text-xl font-semibold tracking-tight sm:text-2xl', focusMode.enabled && 'text-2xl sm:text-[28px]')}>{passage.title}</h1>
              {retryQuestionNumbers.length > 0 && (
                <p className="mt-2 text-sm leading-7 text-primary">
                  当前为错题二刷，仅重做 {visibleQuestions.length} 题。
                </p>
              )}
            </div>
          </div>

          <div className={cn('flex flex-wrap items-center justify-start gap-2 lg:justify-end', focusMode.enabled && 'gap-1.5')}>
            <DraftStatus status={draft.status} onClear={draft.clear} compact />
            <Badge variant="outline" className="rounded-full px-3 py-1.5 text-sm">
              {answeredCount}/{visibleQuestions.length} 已作答
            </Badge>
            {!result && (
              !timer.started ? (
                <Button size="sm" className="rounded-full px-4" onClick={timer.start}>Start Timer</Button>
              ) : (
                <div className={cn('flex items-center gap-2 rounded-2xl border border-border/70 bg-background/75 px-3 py-2', focusMode.enabled && 'px-2.5 py-1.5')}>
                  <span className={cn('text-2xl font-mono font-semibold tabular-nums', timer.colorClass)}>{timer.formatDisplay()}</span>
                  <Button size="sm" variant="ghost" className="rounded-xl px-3" onClick={timer.paused ? timer.resume : timer.pause}>
                    {timer.paused ? '继续' : '暂停'}
                  </Button>
                </div>
              )
            )}
            {result && (
              <Badge variant="outline" className="rounded-full px-3 py-1.5 font-mono">
                {result.correctCount}/{result.total} 正确 · {result.accuracy}%
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className={cn('relative mx-auto grid max-w-[1680px] gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(440px,0.85fr)]', focusMode.enabled && 'max-w-[1820px] gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(460px,0.82fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(520px,0.8fr)]')}>
        <div className="pointer-events-none absolute left-[54%] top-0 bottom-0 hidden w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,var(--gradient-to),transparent)] opacity-40 lg:block" />
        <Card className="min-h-[40vh] rounded-[22px] border-border/70 bg-card/88 shadow-[0_14px_34px_rgba(15,23,42,0.045)] lg:h-[calc(100vh-12rem)] lg:overflow-y-auto">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-tight">{passage.title}</h2>
              {passage.injected_vocab.length > 0 && (
                <Button size="sm" className="rounded-full px-4" variant={showVocabHighlight ? 'default' : 'outline'} onClick={() => setShowVocabHighlight((v) => !v)}>
                  {showVocabHighlight ? '✓ 高亮巩固词' : '高亮巩固词'}
                </Button>
              )}
            </div>
            <div ref={containerRef} onMouseUp={handleMouseUp} className={cn('whitespace-pre-wrap select-text text-[16px] leading-7 text-foreground/95 xl:text-[17px] xl:leading-8', focusMode.enabled && 'text-[17px] leading-8 xl:text-[18px] xl:leading-9')}>
              {renderWithHighlights(passage.passage_text, allHighlights)}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[40vh] rounded-[22px] border-border/70 bg-card/88 shadow-[0_14px_34px_rgba(15,23,42,0.045)] lg:h-[calc(100vh-12rem)] lg:overflow-y-auto">
          <CardContent className="space-y-3 p-5">
            <div className="sticky top-0 z-10 -mx-5 -mt-5 border-b border-border/70 bg-card/88 px-5 py-3 backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Questions {visibleQuestions[0]?.number}-{visibleQuestions[visibleQuestions.length - 1]?.number}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {currentQuestion ? `Current ${currentQuestion}` : 'Ready'} · {unansweredCount} unanswered
                  </div>
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {answeredCount}/{visibleQuestions.length}
                </Badge>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
            {visibleQuestions.map((q, index) => {
              const pq = resultMap?.get(q.number)
              const qHighlights = questionHighlights[q.number] || []
              const promptHighlights = qHighlights.filter((h) => h.scope === 'prompt')
              const instructions = questionInstructions(q)
              const prev = visibleQuestions[index - 1]
              const startsGroup = !prev || prev.type !== q.type || questionInstructions(prev) !== instructions
              let groupEndIndex = index
              while (
                groupEndIndex + 1 < visibleQuestions.length &&
                visibleQuestions[groupEndIndex + 1].type === q.type &&
                questionInstructions(visibleQuestions[groupEndIndex + 1]) === instructions
              ) {
                groupEndIndex += 1
              }
              const groupQuestions = visibleQuestions.slice(index, groupEndIndex + 1)
              return (
                <div key={q.number} className="space-y-2">
                  {startsGroup && (
                    <div className="rounded-xl border border-border/70 bg-background/72 px-3.5 py-3">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {questionRangeLabel(groupQuestions)}
                      </div>
                      <p className="text-sm leading-6 text-foreground/90">{instructions}</p>
                    </div>
                  )}
                  <div
                    ref={(el) => { if (el) questionRefs.current.set(q.number, el) }}
                    onFocusCapture={() => setCurrentQuestion(q.number)}
                    onClick={() => setCurrentQuestion(q.number)}
                    onMouseUp={() => handleQuestionMouseUp(q.number)}
                    className={cn(
                      'scroll-mt-4 rounded-xl border border-border/70 bg-background/55 p-3.5',
                      focusMode.enabled && 'p-4',
                      currentQuestion === q.number && !pq && 'border-primary/60 bg-primary/6 shadow-[0_0_0_1px_rgba(59,130,246,0.10)] dark:border-yellow-300/75 dark:bg-yellow-300/8 dark:shadow-[0_0_0_1px_rgba(253,224,71,0.24)]',
                      pq && (pq.correct ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/45 bg-red-500/5')
                    )}
                  >
                    <p className={cn('mb-2.5 flex items-start gap-2 select-text text-[16px] font-medium leading-7', focusMode.enabled && 'text-[17px] leading-8')}>
                      <span data-highlight-scope="prompt">
                        {q.number}. {renderRangeHighlights(q.prompt, promptHighlights)}
                      </span>
                      {pq && (
                        <span className={pq.correct ? 'text-green-400 text-xs font-semibold shrink-0' : 'text-red-400 text-xs font-semibold shrink-0'}>
                          {pq.correct ? '✓ 正确' : `✗ 正确答案：${pq.correctAnswer}`}
                        </span>
                      )}
                    </p>
                    {q.type === 'true_false_ng' && (
                      <div className="flex flex-wrap gap-2">
                        {q.options?.map((opt, optionIndex) => {
                          const stKey = `${q.number}-${opt}`
                          const struck = !result && strikethrough.has(stKey)
                          const selected = answers[q.number] === opt
                          const optionHighlights = qHighlights.filter((h) => h.scope === 'option' && h.optionIndex === optionIndex)
                          return (
                            <Button
                              key={opt}
                              disabled={!!result}
                              variant={selected ? 'default' : 'outline'}
                              className={cn(
                                'min-h-9 rounded-lg px-3 text-sm',
                                selected && 'shadow-sm dark:bg-yellow-300 dark:text-slate-950 dark:hover:bg-yellow-200',
                                focusMode.enabled && 'min-h-10 text-[15px]',
                                struck && 'opacity-40 line-through'
                              )}
                              onClick={() => !result && setAnswers((prev) => ({ ...prev, [q.number]: opt }))}
                              onContextMenu={(e) => { e.preventDefault(); if (!result) toggleStrikethrough(stKey) }}
                            >
                              <span data-highlight-scope="option" data-option-index={String(optionIndex)}>
                                {renderRangeHighlights(opt, optionHighlights)}
                              </span>
                            </Button>
                          )
                        })}
                      </div>
                    )}
                    {LABEL_SELECT_TYPES.has(q.type) && (
                      <div className="space-y-1">
                        {q.options?.map((opt, optionIndex) => {
                          const label = opt.match(/^([A-Za-z0-9]+)[.)]/)?.[1] || opt
                          const stKey = `${q.number}-${opt}`
                          const struck = !result && strikethrough.has(stKey)
                          const selected = answers[q.number] === label
                          const optionHighlights = qHighlights.filter((h) => h.scope === 'option' && h.optionIndex === optionIndex)
                          return (
                            <label
                              key={opt}
                              className={cn(
                                'flex cursor-pointer items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 text-[15px] leading-6 select-text transition-colors hover:border-border/80 hover:bg-background/45',
                                selected && 'border-primary/55 bg-primary/8 dark:border-yellow-300/70 dark:bg-yellow-300/10',
                                focusMode.enabled && 'text-[16px] leading-7',
                                struck && 'opacity-40 line-through'
                              )}
                              onContextMenu={(e) => { e.preventDefault(); if (!result) toggleStrikethrough(stKey) }}
                            >
                              <input
                                type="radio"
                                name={`q${q.number}`}
                                disabled={!!result}
                                checked={selected}
                                onChange={() => !result && setAnswers((prev) => ({ ...prev, [q.number]: label }))}
                                className="mt-1 accent-primary dark:accent-yellow-300"
                              />
                              <span data-highlight-scope="option" data-option-index={String(optionIndex)}>
                                {renderRangeHighlights(opt, optionHighlights)}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                    {TEXT_INPUT_TYPES.has(q.type) && (
                      <input
                        value={answers[q.number] || ''}
                        readOnly={!!result}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.number]: e.target.value }))}
                        placeholder="填写答案…"
                        className={cn('w-full rounded-lg border border-border bg-transparent px-3 py-2 text-[15px]', focusMode.enabled && 'py-2.5 text-[16px]')}
                      />
                    )}
                  </div>
                </div>
              )
            })}
            <div className="sticky bottom-0 z-10 -mx-5 -mb-5 border-t border-border/70 bg-card/88 px-5 py-3 backdrop-blur-2xl">
              {!result && (
                <Button onClick={handleSubmit} disabled={submitting || !timer.started} className="h-10 w-full rounded-xl text-sm">
                  {submitting ? '判分中…' : timer.started ? (unansweredCount > 0 ? `提交 (${unansweredCount} 未答)` : '提交') : 'Start Timer 后提交'}
                </Button>
              )}
              {result && (
                <Button onClick={() => setShowFullResult(true)} className="h-10 w-full rounded-xl text-sm">
                  查看详细分析 →
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部题号导航条 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1680px] items-center gap-3 px-6 py-2.5">
          <span className="text-sm text-muted-foreground shrink-0">Questions</span>
          <div className="flex gap-1.5 flex-wrap">
            {visibleQuestions.map((q) => {
              const pq = resultMap?.get(q.number)
              const answered = !!answers[q.number]
              const active = currentQuestion === q.number
              return (
                <button
                  key={q.number}
                  onClick={() => scrollToQuestion(q.number)}
                  className={cn(
                    'h-8 w-8 rounded-xl border text-sm font-medium transition-colors',
                    pq
                      ? pq.correct
                        ? 'bg-green-500/20 border-green-500 text-green-400 font-semibold'
                        : 'bg-red-500/20 border-red-500 text-red-400 font-semibold'
                      : active
                        ? 'bg-foreground text-background border-foreground shadow-sm'
                      : answered
                        ? 'bg-primary/15 border-primary/60 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {q.number}
                </button>
              )
            })}
          </div>
          <div className="ml-auto hidden min-w-[160px] items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span>{answeredCount}/{visibleQuestions.length}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {popup && (
        <div
          style={{ position: 'fixed', left: popup.x, top: popup.y, transform: 'translate(-50%, -100%)', zIndex: 50 }}
          className="flex flex-col gap-1 rounded-2xl border border-yellow-300/55 bg-card/92 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.20)] backdrop-blur-2xl dark:border-yellow-200/70 dark:bg-slate-950/90"
        >
          {popup.mode === 'passage' && (
            <input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHighlight()}
              placeholder="笔记（可留空，Enter 确认）"
              autoFocus
              className="w-44 rounded-xl border border-border bg-background/70 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-300"
            />
          )}
          <div className="flex gap-1">
            <Button size="sm" className="rounded-xl bg-yellow-300 text-slate-950 hover:bg-yellow-200" onClick={addHighlight}>{popup.mode === 'question' ? '标注' : '高亮'}</Button>
            {popup.mode === 'passage' && <Button size="sm" variant="secondary" onClick={markVocab}>标记生词</Button>}
          </div>
        </div>
      )}

      {toast && (
        <FloatingToast message={toast} />
      )}
    </div>
  )
}
