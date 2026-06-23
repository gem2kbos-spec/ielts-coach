import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { listVocab, addVocab, updateVocab, deleteVocab, type VocabEntry } from '@/lib/api'

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
      await addVocab({ word: newWord.trim() })
      setNewWord('')
      reload()
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
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <div className="flex gap-2">
          <a href="/api/vocab/export/markdown" download>
            <Button variant="outline" size="sm">
              导出 Markdown
            </Button>
          </a>
          <a href="/api/vocab/export/anki" download>
            <Button variant="outline" size="sm">
              导出 Anki
            </Button>
          </a>
        </div>
      </div>

      <h1 className="text-2xl font-semibold">词汇库</h1>

      <Card>
        <CardContent className="py-4 flex gap-2">
          <input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="手动添加一个单词…"
            className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button onClick={handleAdd} disabled={adding}>
            {adding ? '生成中…' : '添加'}
          </Button>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          还没有生词。去{' '}
          <Link to="/reading" className="underline">
            阅读
          </Link>{' '}
          页面标几个，或者上面手动添加。
        </p>
      )}

      <div className="space-y-2">
        {entries.map((e) => (
          <Card key={e.id}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{e.word}</span>
                  <span className="text-sm text-muted-foreground">{e.chinese_gloss}</span>
                  {e.detail?.part_of_speech && <Badge variant="outline">{e.detail.part_of_speech}</Badge>}
                  {e.needs_reinforcement && <Badge variant="destructive">待巩固</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={e.needs_reinforcement ? 'default' : 'outline'}
                    size="sm"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      toggleReinforcement(e)
                    }}
                  >
                    {e.needs_reinforcement ? '✓ 待巩固' : '标为待巩固'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id) }}>
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
      </div>
    </div>
  )
}
