import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  listReadingPassages,
  deleteReadingPassage,
  listDeletedReadingPassages,
  restoreReadingPassage,
  type ReadingPassageListItem,
  type DeletedPassageItem,
} from '@/lib/api'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'
import StatePanel from '@/components/StatePanel'

type Tab = 'all' | 'done' | 'todo' | 'ai' | 'imported' | 'deleted'

const DIFFICULTY_LABEL: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

export default function ReadingMenu() {
  const [passages, setPassages] = useState<ReadingPassageListItem[] | null>(null)
  const [deleted, setDeleted] = useState<DeletedPassageItem[] | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    listReadingPassages().then(setPassages).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (tab === 'deleted' && deleted === null) {
      listDeletedReadingPassages().then(setDeleted).catch((e) => setError(e.message))
    }
  }, [tab, deleted])

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await deleteReadingPassage(id)
      setPassages((prev) => prev?.filter((p) => p.id !== id) ?? null)
      setDeleted(null)
      setConfirmDelete(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  const handleRestore = async (id: string) => {
    setRestoring(id)
    try {
      await restoreReadingPassage(id)
      setDeleted((prev) => prev?.filter((p) => p.id !== id) ?? null)
      setPassages(null)
      listReadingPassages().then(setPassages).catch(() => {})
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRestoring(null)
    }
  }

  const filtered = (passages || []).filter((p) => {
    if (tab === 'done') return p.completed
    if (tab === 'todo') return !p.completed
    if (tab === 'ai') return p.source === 'ai_generated'
    if (tab === 'imported') return p.source === 'user_import'
    return true
  })

  const activePassages = passages || []
  const completedCount = activePassages.filter((p) => p.completed).length
  const aiCount = activePassages.filter((p) => p.source === 'ai_generated').length

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-5 py-8 sm:px-6 lg:px-8">
      <MockSessionBanner />

      <div className="flex items-center justify-between lg:pr-44">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <div className="flex flex-wrap justify-end gap-2">
          <Link to="/reading/freeread">
            <Button variant="outline" size="sm" className="rounded-full">自由阅读素材</Button>
          </Link>
          <Link to="/reading/import">
            <Button variant="outline" size="sm" className="rounded-full">导入 PDF</Button>
          </Link>
          <Link to="/reading/generate">
            <Button size="sm" className="rounded-full">生成新文章</Button>
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 backdrop-blur">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              IELTS Reading Library
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">阅读题库</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                这里集中管理导入和 AI 生成的阅读文章。支持考试模式、题目高亮、删除与恢复，以及完成后的正确题数回显。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Sparkles, label: '生成新文章', desc: '按主题和要求生成材料与题目' },
                { icon: Trash2, label: '删除与恢复', desc: '不想做的文章先移入已删除' },
                { icon: RotateCcw, label: '历史记录', desc: '回看每篇文章的做题历史' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-background/48 p-4 backdrop-blur-xl">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/55 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: '当前题目', value: String(activePassages.length), desc: '未删除文章总数' },
              { label: '已完成', value: String(completedCount), desc: '做过并交卷的文章' },
              { label: 'AI生成', value: String(aiCount), desc: '当前库内的 AI 文章' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/48 p-4 backdrop-blur-xl">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</div>
                <div className="mt-3 text-2xl font-semibold">{stat.value}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/45 p-1.5 backdrop-blur-xl">
        {([
          ['all', '全部'],
          ['done', '已完成'],
          ['todo', '未完成'],
          ['ai', 'AI生成'],
          ['imported', '真题导入'],
          ['deleted', '已删除'],
        ] as [Tab, string][]).map(([key, label]) => (
          <Badge
            key={key}
            variant={tab === key ? 'default' : 'outline'}
            className="cursor-pointer rounded-xl px-3 py-1.5"
            onClick={() => setTab(key)}
          >
            {label}
          </Badge>
        ))}
      </div>

      {tab === 'deleted' && (
        <>
          {deleted === null && <StatePanel title="正在读取已删除文章" description="系统正在整理被移出题库的阅读文章和它们的历史记录。" tone="loading" backTo="/reading" backLabel="返回阅读题库" />}
          {deleted !== null && deleted.length === 0 && (
            <StatePanel title="还没有已删除文章" description="你删除的阅读文章会先进入这里，之后仍然可以恢复。" tone="empty" backTo="/reading" backLabel="返回阅读题库" />
          )}
          {deleted && deleted.length > 0 && <div className="space-y-3">
            {deleted?.map((p) => (
              <Card key={p.id} className="border-border/70 bg-card/70 opacity-75">
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="font-medium text-muted-foreground line-through">{p.title}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {p.difficulty && <Badge variant="outline" className="rounded-full">{DIFFICULTY_LABEL[p.difficulty] || p.difficulty}</Badge>}
                        <Badge variant="outline" className="rounded-full">{p.source === 'ai_generated' ? 'AI生成' : '真题导入'}</Badge>
                        <span className="text-xs text-muted-foreground">删除于 {formatDate(p.deletedAt)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 rounded-full text-xs"
                      disabled={restoring === p.id}
                      onClick={() => handleRestore(p.id)}
                    >
                      {restoring === p.id ? '恢复中…' : '恢复'}
                    </Button>
                  </div>

                  {p.attempts.length > 0 ? (
                    <div className="space-y-2 border-t border-border/70 pt-3">
                      <p className="text-xs text-muted-foreground">历史做题记录（{p.attempts.length} 次）</p>
                      <div className="flex flex-wrap gap-2">
                        {p.attempts.map((a) => (
                          <Badge key={a.id} variant="secondary" className="rounded-full text-xs">
                            {formatDate(a.createdAt)}
                            {a.correctCount !== null ? `  ${a.correctCount}/${a.total}` : ''}
                            {a.accuracy !== null ? `  ${a.accuracy}%` : ''}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="border-t border-border/70 pt-3 text-xs text-muted-foreground">未做过题</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>}
        </>
      )}

      {tab !== 'deleted' && (
        <>
          {passages === null && <StatePanel title="正在读取阅读题库" description="系统正在载入当前可做的阅读文章和它们的完成状态。" tone="loading" backTo="/" backLabel="返回首页" />}

          {passages !== null && passages.length === 0 && (
            <StatePanel title="阅读题库还是空的" description="点右上角“导入 PDF”拖一份真题进来，或者“生成新文章”让 AI 写一篇。" tone="empty" backTo="/" backLabel="返回首页" />
          )}

          {filtered.length === 0 && passages && passages.length > 0 && (
            <StatePanel title="这个分类下没有文章" description="换个筛选条件，或者去生成/导入新的阅读材料。" tone="empty" backTo="/reading" backLabel="返回阅读题库" />
          )}

          {filtered.length > 0 && <div className="space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="group relative">
                <Link to={`/reading/exam/${p.id}`}>
                  <Card className={p.completed ? 'border-border/70 bg-card/80 opacity-60 hover:opacity-80' : 'border-border/70 bg-card/85 hover:border-primary/40'}>
                    <CardContent className="flex items-center justify-between gap-4 py-4 pr-20">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={p.completed ? 'truncate font-medium text-muted-foreground' : 'truncate font-medium'}>{p.title}</span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {p.difficulty && <Badge variant="outline" className="rounded-full">{DIFFICULTY_LABEL[p.difficulty] || p.difficulty}</Badge>}
                          <Badge variant="outline" className="rounded-full">{p.source === 'ai_generated' ? 'AI生成' : '真题导入'}</Badge>
                          {p.topicTag && <Badge variant="outline" className="rounded-full">{p.topicTag}</Badge>}
                          {!p.completed && <span className="text-xs text-muted-foreground">{p.questionCount} 题</span>}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {p.completed && p.lastCorrectCount !== null
                          ? <Badge variant="secondary" className="rounded-full px-3">{p.lastCorrectCount}/{p.questionCount}</Badge>
                          : <Badge variant="secondary" className="rounded-full px-3">开始做题</Badge>
                        }
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                  {confirmDelete === p.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
                        disabled={deleting}
                        onClick={() => handleDelete(p.id)}
                      >
                        {deleting ? '…' : '确认删除'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setConfirmDelete(null)}
                      >
                        取消
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault()
                        setConfirmDelete(p.id)
                      }}
                    >
                      删除
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>}
        </>
      )}
    </div>
  )
}
