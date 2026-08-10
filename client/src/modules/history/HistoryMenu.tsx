import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, FileClock, LibraryBig } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { listHistory, type HistoryListItem } from '@/lib/api'
import { TAG_LABEL } from '@/lib/tagLabels'
import StatePanel from '@/components/StatePanel'

const MODULE_TABS: { key: string | undefined; label: string }[] = [
  { key: undefined, label: '全部' },
  { key: 'writing', label: '写作' },
  { key: 'speaking', label: '口语' },
  { key: 'reading', label: '阅读' },
  { key: 'listening', label: '听力' },
  { key: 'writing_expression', label: '表达训练' },
]

export default function HistoryMenu() {
  const [moduleFilter, setModuleFilter] = useState<string | undefined>(undefined)
  const [items, setItems] = useState<HistoryListItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState('')
  const limit = 20

  useEffect(() => {
    setItems(null)
    listHistory({ module: moduleFilter, limit, offset })
      .then((r) => {
        setItems(r.items)
        setTotal(r.total)
      })
      .catch((e) => setError(e.message))
  }, [moduleFilter, offset])

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <FileClock className="h-3.5 w-3.5 text-primary" />
              Practice History
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">练习记录</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                把各模块的历史练习集中在一个地方查看。这里更适合回头看“我做过什么”和“哪次最值得复盘”。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: LibraryBig, label: '总记录数', value: String(total), desc: '当前筛选条件下的总条数' },
              { icon: Clock3, label: '当前页', value: `${Math.floor(offset / limit) + 1}`, desc: `每页 ${limit} 条` },
              { icon: FileClock, label: '当前分类', value: MODULE_TABS.find((t) => t.key === moduleFilter)?.label || '全部', desc: '用于快速聚焦某个模块' },
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

      <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-muted/40 p-1.5 pr-16 sm:pr-20">
        {MODULE_TABS.map((t) => (
          <Badge
            key={t.label}
            variant={moduleFilter === t.key ? 'default' : 'outline'}
            className="cursor-pointer rounded-xl px-3 py-1.5"
            onClick={() => {
              setModuleFilter(t.key)
              setOffset(0)
            }}
          >
            {t.label}
          </Badge>
        ))}
      </div>

      {error && items !== null && <p className="text-sm text-destructive">{error}</p>}
      {error && items === null && (
        <StatePanel
          title="练习记录暂时没打开"
          description={error}
          tone="error"
          backTo="/"
          backLabel="返回首页"
        />
      )}
      {!error && items === null && (
        <StatePanel
          title="正在读取练习记录"
          description="系统正在整理各模块的历史成绩、标签和分页列表。"
          tone="loading"
          backTo="/"
          backLabel="返回首页"
        />
      )}
      {items !== null && items.length === 0 && (
        <StatePanel
          title="这个分类下还没有练习记录"
          description="先去做一轮练习，之后这里会自动按模块归档。"
          tone="empty"
          backTo="/"
          backLabel="返回首页"
        />
      )}

      <div className="space-y-3">
        {items?.map((it) => (
          <Link key={it.id} to={`/history/${it.id}`}>
            <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)] hover:border-primary/40">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">{it.label.label}</Badge>
                    {it.title && <span className="truncate text-sm font-medium">{it.title}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{it.created_at}</span>
                    {it.errorTags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-full text-xs">
                        {TAG_LABEL[tag] || tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="shrink-0">
                  {it.summary.kind === 'band' && <Badge className="rounded-full">Band {it.summary.value}</Badge>}
                  {it.summary.kind === 'accuracy' && <Badge variant="outline" className="rounded-full">正确率 {it.summary.value}%</Badge>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between text-sm">
          <button
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="text-muted-foreground disabled:opacity-30 hover:underline"
          >
            ← 上一页
          </button>
          <span className="text-muted-foreground">
            {offset + 1}-{Math.min(offset + limit, total)} / {total}
          </span>
          <button
            disabled={offset + limit >= total}
            onClick={() => setOffset((o) => o + limit)}
            className="text-muted-foreground disabled:opacity-30 hover:underline"
          >
            下一页 →
          </button>
        </div>
      )}
    </div>
  )
}
