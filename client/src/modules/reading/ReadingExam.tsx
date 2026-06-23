import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  getReadingPassageForExam,
  submitReadingPassage,
  addVocab,
  type ReadingQuestion,
} from '@/lib/api'
import ReadingResult, { type GradedResult } from './ReadingResult'

type Highlight = { id: string; start: number; end: number; text: string; note: string; kind: 'user' | 'vocab' }
type Popup = { x: number; y: number; selectedText: string; start: number; end: number } | null

const LABEL_SELECT_TYPES = new Set(['multiple_choice', 'matching_heading', 'matching_information'])
const TEXT_INPUT_TYPES = new Set(['short_answer', 'sentence_completion', 'summary_completion', 'table_completion'])

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
                ? 'bg-blue-200/60 dark:bg-blue-900/40 cursor-help'
                : 'bg-yellow-200/60 dark:bg-yellow-900/40 cursor-help'
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

export default function ReadingExam() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [passage, setPassage] = useState<{ id: string; title: string; passage_text: string; injected_vocab: string[]; questions: Omit<ReadingQuestion, 'correct_answer' | 'answer_confidence'>[] } | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [seconds, setSeconds] = useState(0)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [showVocabHighlight, setShowVocabHighlight] = useState(true)
  const [popup, setPopup] = useState<Popup>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<GradedResult | null>(null)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    getReadingPassageForExam(id).then(setPassage).catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    if (result) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [result])

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
    setPopup({ x: rect.left + rect.width / 2, y: rect.top - 8, selectedText: text, start, end })
  }

  const addHighlight = () => {
    if (!popup) return
    const note = window.prompt('加个笔记（可留空）：') || ''
    setHighlights((prev) => [
      ...prev,
      { id: crypto.randomUUID(), start: popup.start, end: popup.end, text: popup.selectedText, note, kind: 'user' },
    ])
    setPopup(null)
    window.getSelection()?.removeAllRanges()
  }

  const markVocab = async () => {
    if (!popup || !passage) return
    try {
      await addVocab({ word: popup.selectedText, sourceItemId: passage.id })
      setToast(`已加入词汇库：${popup.selectedText}`)
      setTimeout(() => setToast(''), 2000)
    } catch (e) {
      setToast((e as Error).message)
    } finally {
      setPopup(null)
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleSubmit = async () => {
    if (!passage) return
    setSubmitting(true)
    setError('')
    try {
      const payload = passage.questions.map((q) => ({ number: q.number, userAnswer: answers[q.number] || '' }))
      const graded = await submitReadingPassage(passage.id, payload, seconds)
      setResult(graded)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (error) return <p className="p-8 text-destructive">{error}</p>
  if (!passage) return <p className="p-8 text-muted-foreground">加载中…</p>

  if (result) {
    return <ReadingResult result={result} onRetry={() => navigate(`/reading/exam/${passage.id}`)} />
  }

  const answeredCount = Object.keys(answers).length
  const vocabHighlights = showVocabHighlight && passage.injected_vocab.length
    ? findWordOccurrences(passage.passage_text, passage.injected_vocab)
    : []
  const allHighlights = [...highlights, ...vocabHighlights]

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <Link to="/reading" className="text-sm text-muted-foreground hover:underline">
          ← 返回题库
        </Link>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{answeredCount}/{passage.questions.length} 已作答</Badge>
          <Badge variant="default" className="font-mono">⏱ {formatTime(seconds)}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="h-[70vh] overflow-y-auto">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">{passage.title}</h2>
              {passage.injected_vocab.length > 0 && (
                <Button size="sm" variant={showVocabHighlight ? 'default' : 'outline'} onClick={() => setShowVocabHighlight((v) => !v)}>
                  {showVocabHighlight ? '✓ 高亮巩固词' : '高亮巩固词'}
                </Button>
              )}
            </div>
            <div ref={containerRef} onMouseUp={handleMouseUp} className="text-sm leading-relaxed whitespace-pre-wrap select-text">
              {renderWithHighlights(passage.passage_text, allHighlights)}
            </div>
          </CardContent>
        </Card>

        <Card className="h-[70vh] overflow-y-auto">
          <CardContent className="pt-6 space-y-4">
            {passage.questions.map((q) => (
              <div key={q.number} className="border-b border-border pb-3 last:border-0">
                <p className="text-sm font-medium mb-2">
                  {q.number}. {q.prompt}
                </p>
                {q.type === 'true_false_ng' && (
                  <div className="flex gap-2">
                    {q.options?.map((opt) => (
                      <Button
                        key={opt}
                        size="sm"
                        variant={answers[q.number] === opt ? 'default' : 'outline'}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.number]: opt }))}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                )}
                {LABEL_SELECT_TYPES.has(q.type) && (
                  <div className="space-y-1">
                    {q.options?.map((opt) => {
                      const label = opt.match(/^([A-Za-z0-9]+)[.)]/)?.[1] || opt
                      return (
                        <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name={`q${q.number}`}
                            checked={answers[q.number] === label}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.number]: label }))}
                          />
                          {opt}
                        </label>
                      )
                    })}
                  </div>
                )}
                {TEXT_INPUT_TYPES.has(q.type) && (
                  <input
                    value={answers[q.number] || ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.number]: e.target.value }))}
                    placeholder="填写答案…"
                    className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm"
                  />
                )}
              </div>
            ))}
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? '判分中…' : '提交'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {popup && (
        <div
          style={{ position: 'fixed', left: popup.x, top: popup.y, transform: 'translate(-50%, -100%)', zIndex: 50 }}
          className="flex gap-1"
        >
          <Button size="sm" onClick={addHighlight}>
            高亮/加笔记
          </Button>
          <Button size="sm" variant="secondary" onClick={markVocab}>
            标记生词
          </Button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-foreground text-background text-sm px-4 py-2 rounded-md shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
