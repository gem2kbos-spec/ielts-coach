import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Layers3, Shuffle, Timer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listListeningSections, type ListeningSectionListItem } from '@/lib/api'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'
import StatePanel from '@/components/StatePanel'

const SECTIONS = ['S1', 'S2', 'S3', 'S4']

export default function ListeningMockSetup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mockSession = searchParams.get('mockSession')
  const [items, setItems] = useState<ListeningSectionListItem[] | null>(null)
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [readingGap, setReadingGap] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listListeningSections().then(setItems).catch((e) => setError(e.message))
  }, [])

  const grouped = (sec: string) => (items || []).filter((i) => i.section === sec)

  const randomAssemble = () => {
    const next: Record<string, string> = {}
    for (const sec of SECTIONS) {
      const candidates = grouped(sec)
      if (candidates.length === 0) continue
      const undone = candidates.filter((c) => !c.completed)
      const pool = undone.length > 0 ? undone : candidates
      next[sec] = pool[Math.floor(Math.random() * pool.length)].id
    }
    setPicked(next)
  }

  const ready = SECTIONS.every((s) => Boolean(picked[s]))
  const selectedCount = Object.keys(picked).length
  const missingSections = SECTIONS.filter((s) => !picked[s])

  const start = () => {
    const ids = SECTIONS.map((s) => picked[s]).filter(Boolean)
    const mockParam = mockSession ? `&mockSession=${mockSession}` : ''
    navigate(`/listening/mock/exam?ids=${ids.join(',')}&gap=${readingGap ? 1 : 0}${mockParam}`)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <MockSessionBanner />
      <Link to="/listening" className="text-sm text-muted-foreground hover:underline">← 返回听力菜单</Link>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5 text-primary" />
              Listening Mock Builder
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">全真模拟组卷</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                每个 Section 选一套素材，凑成完整的 4 Section 模拟。做过的素材仍可重复选，但会用更淡的状态提示你。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Layers3, label: '组卷结构', value: `${selectedCount}/4`, desc: '每个 Section 需要选一套材料' },
              { icon: Timer, label: '读题间隔', value: readingGap ? '30 秒' : '关闭', desc: '可切成更严格的连续机考模式' },
              { icon: Shuffle, label: '快捷操作', value: '随机组卷', desc: '优先抽还没做过的素材' },
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

      <Card className="rounded-[28px] border-border/70 bg-card/85">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={readingGap} onChange={(e) => setReadingGap(e.target.checked)} />
            Section 之间保留 30 秒读题时间
          </label>
          <Button variant="outline" className="rounded-2xl px-5" size="sm" onClick={randomAssemble}>随机组卷</Button>
        </CardContent>
      </Card>

      {error && items !== null && <p className="text-sm text-destructive">{error}</p>}
      {error && items === null && (
        <StatePanel
          title="组卷列表暂时没打开"
          description={error}
          tone="error"
          backTo="/listening"
          backLabel="返回听力菜单"
        />
      )}
      {!error && items === null && (
        <StatePanel
          title="正在读取可组卷素材"
          description="系统正在按 Section 整理听力材料，准备生成本次全真模拟。"
          tone="loading"
          backTo="/listening"
          backLabel="返回听力菜单"
        />
      )}

      {items !== null &&
        SECTIONS.map((sec) => {
          const candidates = grouped(sec)
          return (
            <Card key={sec} className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <CardTitle className="text-base">{sec}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {candidates.length === 0 && <p className="text-xs text-muted-foreground">暂无 {sec} 素材。全真模拟需要 S1-S4 各一篇，请先导入或生成这个 Section。</p>}
                {candidates.map((c) => (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer flex-col gap-2 rounded-2xl border px-4 py-3 text-sm transition-colors sm:flex-row sm:items-center sm:justify-between ${
                      picked[sec] === c.id
                        ? 'border-primary/45 bg-primary/10'
                        : 'border-border/70 bg-background/55 hover:border-primary/30'
                    } ${c.completed ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`mock-${sec}`}
                        checked={picked[sec] === c.id}
                        onChange={() => setPicked((prev) => ({ ...prev, [sec]: c.id }))}
                      />
                      <span className="font-medium">{c.title}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {c.completed && <Badge variant="secondary" className="rounded-full">已完成</Badge>}
                      {c.lastAccuracy !== null && <Badge variant="outline" className="rounded-full">上次 {c.lastAccuracy}%</Badge>}
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>
          )
        })}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {ready ? '已选齐 S1-S4，可以开始完整听力模拟。' : `还缺 ${missingSections.join('、')}。`}
        </p>
        <Button className="rounded-2xl px-5" onClick={start} disabled={!ready}>
          开始完整模考（{selectedCount}/4）
        </Button>
      </div>
    </div>
  )
}
