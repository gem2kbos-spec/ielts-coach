import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { listVocab, addVocab, updateVocab, deleteVocab, type VocabEntry } from '@/lib/api'
import StatePanel from '@/components/StatePanel'
import { BookMarked, Download, Sparkles } from 'lucide-react'

export default function VocabLibrary() {
  const [entries, setEntries] = useState<VocabEntry[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newWord, setNewWord] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const reload = () => listVocab().then(setEntries).catch((e) => setError(e.message))
  useEffect(() => {
    reload()
  }, [])

  const handleAdd = async () => {
    if (!newWord.trim()) return
    setAdding(true)
    setError('')
    try {
      const entry = await addVocab({ word: newWord.trim() })
      if (entry.alreadyExists) {
        setError(`"${entry.word}" 已在词库中`)
      } else {
        setNewWord('')
        setEntries((prev) => [entry, ...prev])
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteVocab(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const toggleReinforcement = async (e: VocabEntry) => {
    try {
      const updated = await updateVocab(e.id, { needs_reinforcement: !e.needs_reinforcement })
      setEntries((prev) => prev.map((x) => (x.id === e.id ? updated : x)))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between lg:pr-44">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <div className="flex gap-2">
          <a href="/api/vocab/export/markdown" download>
            <Button variant="outline" size="sm" className="rounded-full">
              <Download className="h-3.5 w-3.5" />
              导出 Markdown
            </Button>
          </a>
          <a href="/api/vocab/export/anki" download>
            <Button variant="outline" size="sm" className="rounded-full">
              <Download className="h-3.5 w-3.5" />
              导出 Anki
            </Button>
          </a>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
              <BookMarked className="h-3.5 w-3.5 text-primary" />
              Vocabulary
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">词汇库</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                从阅读、听力和手动添加沉淀生词。标记待巩固后，后续生成题目会优先复现。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-border/70 bg-background/48 p-4 backdrop-blur-xl">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/55 text-primary">
                <BookMarked className="h-4.5 w-4.5" />
              </div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">词条</div>
              <div className="mt-3 text-2xl font-semibold">{entries.length}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">当前词汇库总数</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/48 p-4 backdrop-blur-xl">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/55 text-primary">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">待巩固</div>
              <div className="mt-3 text-2xl font-semibold">{entries.filter((e) => e.needs_reinforcement).length}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">需要优先复现的词</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[24px]">
        <CardContent className="flex gap-2 py-4">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="手动添加一个单词…"
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={adding} className="rounded-full px-5">
            {adding ? '生成中…' : '添加'}
          </Button>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {entries.length === 0 && (
        <StatePanel
          title="词汇库还是空的"
          description="去阅读或听力里标几个词，或者直接在上面手动添加，词汇库就会开始积累。"
          tone="empty"
          backTo="/reading"
          backLabel="去阅读题库"
        />
      )}

      {entries.length > 0 && <div className="space-y-2">
        {entries.map((e) => (
          <Card key={e.id} interactive>
            <CardContent className="py-3">
              <div className="flex cursor-pointer items-center justify-between gap-4" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-medium">{e.word}</span>
                  <span className="text-sm text-muted-foreground">{e.chinese_gloss}</span>
                  {e.detail?.part_of_speech && <Badge variant="outline">{e.detail.part_of_speech}</Badge>}
                  {e.source?.label && <Badge variant="secondary" className="text-xs">来自·{e.source.label}</Badge>}
                  {e.needs_reinforcement && <Badge variant="destructive">待巩固</Badge>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant={e.needs_reinforcement ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      toggleReinforcement(e)
                    }}
                  >
                    {e.needs_reinforcement ? '✓ 待巩固' : '标为待巩固'}
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-full" onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id) }}>
                    删除
                  </Button>
                </div>
              </div>
              {expanded === e.id && (
                <div className="mt-3 space-y-2 text-sm text-muted-foreground border-t border-border pt-3">
                  {e.context_sentence && <p>原句：{e.context_sentence}</p>}
                  {e.detail?.explanation && <p>{e.detail.explanation}</p>}
                  {e.detail?.examples?.length ? (
                    <ul className="list-disc pl-5">
                      {e.detail.examples.map((ex, i) => (
                        <li key={i}>{ex}</li>
                      ))}
                    </ul>
                  ) : null}
                  {e.detail?.collocations?.length ? (
                    <div className="flex gap-1 flex-wrap">
                      {e.detail.collocations.map((c, i) => (
                        <Badge key={i} variant="secondary">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>}
    </div>
  )
}
