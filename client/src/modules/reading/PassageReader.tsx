import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { listPassages, listVocab, addVocab, type PassageItem, type VocabEntry } from '@/lib/api'

type Popup = { x: number; y: number; word: string; context: string } | null

function buildContext(fullText: string, word: string) {
  const idx = fullText.toLowerCase().indexOf(word.toLowerCase())
  if (idx === -1) return ''
  let start = Math.max(0, idx - 80)
  let end = Math.min(fullText.length, idx + word.length + 80)
  // 往两边挪到最近的空白处，避免把单词从中间切断
  while (start > 0 && !/\s/.test(fullText[start - 1])) start -= 1
  while (end < fullText.length && !/\s/.test(fullText[end])) end += 1
  return fullText.slice(start, end).trim()
}

function renderWithVocabHighlights(text: string, vocab: VocabEntry[]) {
  if (vocab.length === 0) return text
  const words = vocab.map((v) => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length)
  const re = new RegExp(`\\b(${words.join('|')})\\b`, 'gi')
  const parts = text.split(re)
  return parts.map((part, i) => {
    const match = vocab.find((v) => v.word.toLowerCase() === part.toLowerCase())
    if (!match) return <span key={i}>{part}</span>
    return (
      <Tooltip key={i}>
        <TooltipTrigger asChild>
          <span className="underline decoration-dotted decoration-primary cursor-help bg-accent/40">{part}</span>
        </TooltipTrigger>
        <TooltipContent>{match.chinese_gloss || '（还没有释义）'}</TooltipContent>
      </Tooltip>
    )
  })
}

export default function PassageReader() {
  const [passages, setPassages] = useState<PassageItem[] | null>(null)
  const [selected, setSelected] = useState<PassageItem | null>(null)
  const [vocab, setVocab] = useState<VocabEntry[]>([])
  const [popup, setPopup] = useState<Popup>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listPassages().then(setPassages).catch((e) => setToast(e.message))
    listVocab().then(setVocab).catch((e) => setToast(e.message))
  }, [])

  const handleMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !containerRef.current) return setPopup(null)
    const text = sel.toString().trim()
    if (!text || text.split(/\s+/).length > 6) return setPopup(null) // 限制只标单词/短语，不是整段
    const range = sel.getRangeAt(0)
    if (!containerRef.current.contains(range.commonAncestorContainer)) return setPopup(null)
    const rect = range.getBoundingClientRect()
    setPopup({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      word: text,
      context: selected ? buildContext(selected.content.raw_text, text) : '',
    })
  }

  const markAsVocab = async () => {
    if (!popup || !selected) return
    setBusy(true)
    try {
      const entry = await addVocab({ word: popup.word, contextSentence: popup.context, sourceItemId: selected.id })
      setVocab((prev) => [entry, ...prev])
      setToast(`已加入词汇库：${popup.word}`)
      setTimeout(() => setToast(''), 2000)
    } catch (e) {
      setToast((e as Error).message)
    } finally {
      setBusy(false)
      setPopup(null)
      window.getSelection()?.removeAllRanges()
    }
  }

  const rendered = useMemo(
    () => (selected ? renderWithVocabHighlights(selected.content.raw_text, vocab) : null),
    [selected, vocab]
  )

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <Link to="/vocab" className="text-sm text-muted-foreground hover:underline">
          词汇库 →
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">阅读</h1>
      <p className="text-sm text-muted-foreground">
        选中一个不认识的单词或短语（最多6个词），会弹出"标记生词"按钮。已标记过的词会用虚线下划线标出，鼠标悬停能看到中文释义。
      </p>

      {passages && passages.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            还没有可读的文章。去{' '}
            <Link to="/import" className="underline">
              题库导入
            </Link>{' '}
            页面拖一个 txt/pdf 进来。
          </CardContent>
        </Card>
      )}

      {passages && passages.length > 0 && !selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">选一篇文章</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {passages.map((p) => (
              <div key={p.id} className="flex items-center justify-between border border-border rounded-md p-3">
                <span className="text-sm">{p.content.original_filename || p.content.prompt?.slice(0, 60) || p.id}</span>
                <Button size="sm" onClick={() => setSelected(p)}>
                  打开
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {selected && (
        <Card>
          <CardContent className="pt-6">
            <div ref={containerRef} onMouseUp={handleMouseUp} className="text-base leading-relaxed whitespace-pre-wrap select-text">
              {rendered}
            </div>
          </CardContent>
        </Card>
      )}

      {popup && (
        <div
          style={{ position: 'fixed', left: popup.x, top: popup.y, transform: 'translate(-50%, -100%)', zIndex: 50 }}
        >
          <Button size="sm" disabled={busy} onClick={markAsVocab}>
            {busy ? '生成释义中…' : `标记生词："${popup.word}"`}
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
