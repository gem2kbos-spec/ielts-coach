import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpenText, History, Layers3, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import StatePanel from '@/components/StatePanel'
import {
  listExpressions,
  addCustomExpression,
  getExpressionStats,
  type ExpressionItem,
  type ExpressionQueueStatus,
} from '@/lib/api'
import { cn } from '@/lib/utils'

const PHRASE_CATEGORIES = ['动词词组', '句式', '观点', '让步转折', '数据描述']
const SENTENCE_CATEGORIES = ['议论句', '让步句', '原因结果句', '举例', '数据句']

const STATUS_COLOR: Record<string, string> = {
  new: 'bg-muted-foreground/30',
  learning: 'bg-yellow-500',
  mastered: 'bg-emerald-500',
}

const STATUS_FILTERS: { key: ExpressionQueueStatus | ''; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'practiced', label: '已练习' },
  { key: 'correct', label: '完全正确' },
  { key: 'partial', label: '基本正确' },
  { key: 'wrong', label: '有误' },
]

function CustomAddDialog({ type, onAdded }: { type: 'phrase' | 'sentence'; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [chinese, setChinese] = useState('')
  const [standard, setStandard] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!chinese.trim() || !standard.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await addCustomExpression({ type, chinese: chinese.trim(), standard: standard.trim() })
      setChinese('')
      setStandard('')
      setOpen(false)
      onAdded()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">+ 自己添加</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加自定义{type === 'phrase' ? '词组' : '句子'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">中文</label>
            <Input value={chinese} onChange={(e) => setChinese(e.target.value)} placeholder="输入中文" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">你的英文翻译</label>
            <Input value={standard} onChange={(e) => setStandard(e.target.value)} placeholder="输入对应的英文" />
          </div>
          <p className="text-xs text-muted-foreground">提交后AI会自动补全{type === 'phrase' ? '替换表达、例句、' : ''}分类和难度标签。</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting ? '补全中…' : '提交'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function ExpressionMenu() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'phrase' | 'sentence'>('phrase')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [task, setTask] = useState('')
  const [status, setStatus] = useState<ExpressionQueueStatus | ''>('')
  const [q, setQ] = useState('')
  const [items, setItems] = useState<ExpressionItem[] | null>(null)
  const [stats, setStats] = useState<{ todayCount: number; totalCount: number } | null>(null)
  const [error, setError] = useState('')

  const reload = () => {
    setItems(null)
    listExpressions({ type: mode, category: category || undefined, difficulty: difficulty || undefined, task: task || undefined, q: q || undefined })
      .then(setItems)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, category, difficulty, task, q])

  useEffect(() => {
    getExpressionStats().then(setStats).catch(() => {})
  }, [])

  const categories = mode === 'phrase' ? PHRASE_CATEGORIES : SENTENCE_CATEGORIES

  const buildParams = (s: ExpressionQueueStatus) => {
    const params = new URLSearchParams({ status: s, type: mode })
    if (category) params.set('category', category)
    if (difficulty) params.set('difficulty', difficulty)
    if (task) params.set('task', task)
    if (q) params.set('q', q)
    return params
  }

  const goPractice = (s: ExpressionQueueStatus) => {
    navigate(`/writing/expressions/drill?${buildParams(s).toString()}`)
  }

  const goBatch = () => {
    navigate(`/writing/expressions/batch?${buildParams('endless').toString()}`)
  }

  // 按当前 status 过滤列表（client-side，与 /queue 端点的筛选逻辑一致）
  const filteredItems = items?.filter((item) => {
    if (!status) return true
    if (status === 'practiced') return item.reviewStatus !== 'new'
    if (status === 'correct') return item.lastResult === 'correct'
    if (status === 'partial') return item.lastResult === 'partial'
    if (status === 'wrong') return item.lastResult === 'wrong'
    return true
  }) ?? null

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between lg:pr-44">
        <Link to="/writing" className="text-sm text-muted-foreground hover:underline">
          ← 返回写作菜单
        </Link>
        {stats && (
          <span className="text-xs text-muted-foreground">
            今日已练习 {stats.todayCount} · 总共已练习 {stats.totalCount}
          </span>
        )}
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-5 p-6 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Expression Training
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">表达训练</h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  先筛题，再复习。无尽、定量、历史复练都从这里进入。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/writing/expressions/history">
                <Button variant="outline" size="sm" className="rounded-full">练习记录</Button>
              </Link>
              <Button variant="outline" size="sm" className="rounded-full" onClick={goBatch}>定量练习（10题）</Button>
              <Button size="sm" className="rounded-full" onClick={() => goPractice('endless')}>无尽模式 →</Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Layers3, label: '当前列表', value: String(filteredItems?.length ?? 0), desc: '当前筛选条件下的题目' },
              { icon: BookOpenText, label: '模式', value: mode === 'phrase' ? '词组练习' : '句子翻译', desc: '当前主训练分组' },
              { icon: History, label: '练习记录', value: stats ? String(stats.totalCount) : '-', desc: '累计已练习条目' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/48 p-4 backdrop-blur-xl">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/55 text-primary">
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

      <div className="flex flex-col gap-3 rounded-[24px] border border-border/70 bg-card/55 p-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-2xl border border-border/70 bg-muted/35 p-1.5 gap-1">
          {(['phrase', 'sentence'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setCategory('') }}
              className={cn(
                'px-5 py-2 text-sm font-medium rounded-xl transition-colors',
                mode === m
                  ? 'bg-card/80 text-foreground shadow-[0_8px_20px_rgba(15,23,42,0.08)]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {m === 'phrase' ? '词组练习' : '句子翻译'}
            </button>
          ))}
        </div>
        <CustomAddDialog type={mode} onAdded={reload} />
      </div>

      <div className="space-y-3 rounded-[24px] border border-border/70 bg-card/45 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant={category === '' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setCategory('')}>
            全部分类
          </Badge>
          {categories.map((c) => (
            <Badge key={c} variant={category === c ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setCategory(c)}>
              {c}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {['', 'medium', 'hard'].map((d) => (
            <Badge key={d} variant={difficulty === d ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setDifficulty(d)}>
              {d === '' ? '全部难度' : d === 'medium' ? '中等' : '困难'}
            </Badge>
          ))}
          {['', 'Task1', 'Task2'].map((t) => (
            <Badge key={t} variant={task === t ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setTask(t)}>
              {t === '' ? '全部Task' : t}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {STATUS_FILTERS.map((s) => (
            <Badge
              key={s.key}
              variant={status === s.key ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatus(s.key as ExpressionQueueStatus | '')}
            >
              {s.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索中文或英文…" />
      </div>

      {status && filteredItems && (
        <Button className="w-full rounded-xl" onClick={() => goPractice(status as ExpressionQueueStatus)}>
          开始复习（{filteredItems.length} 题）→
        </Button>
      )}

      {error && items !== null && <p className="text-sm text-destructive">{error}</p>}
      {error && items === null && (
        <StatePanel
          title="表达题库暂时没打开"
          description={error}
          tone="error"
          backTo="/writing"
          backLabel="返回写作菜单"
        />
      )}
      {!error && items === null && (
        <StatePanel
          title="正在读取表达题库"
          description="系统正在整理词组、句子、练习状态和历史表现。"
          tone="loading"
          backTo="/writing"
          backLabel="返回写作菜单"
        />
      )}
      {filteredItems !== null && filteredItems.length === 0 && (
        <StatePanel
          title="没有符合条件的题目"
          description="换个分类、难度或练习状态，或者自己补一条新的表达进来。"
          tone="empty"
          backTo="/writing/expressions"
          backLabel="返回表达训练"
        />
      )}

      <div className="space-y-2">
        {filteredItems?.map((item) => (
          <Link key={item.id} to={`/writing/expressions/drill?id=${item.id}`}>
            <Card interactive className="rounded-2xl border-border/70 bg-card/85">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('w-2.5 h-2.5 rounded-full', STATUS_COLOR[item.reviewStatus])} />
                  <span className="truncate">{item.content.chinese}</span>
                  <Badge variant="outline" className="text-xs rounded-full">{item.content.category}</Badge>
                </div>
                <Badge variant="secondary" className="rounded-full">Band {item.content.band_target}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
