import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listListeningSections, type ListeningSectionListItem } from '@/lib/api'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'

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

  const ready = SECTIONS.every((s) => grouped(s).length === 0 || picked[s])
  const selectedCount = Object.keys(picked).length

  const start = () => {
    const ids = SECTIONS.map((s) => picked[s]).filter(Boolean)
    const mockParam = mockSession ? `&mockSession=${mockSession}` : ''
    navigate(`/listening/mock/exam?ids=${ids.join(',')}&gap=${readingGap ? 1 : 0}${mockParam}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <MockSessionBanner />
      <Link to="/listening" className="text-sm text-muted-foreground hover:underline">
        ← 返回听力菜单
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">全真模拟组卷</h1>
        <Button variant="outline" size="sm" onClick={randomAssemble}>随机组卷</Button>
      </div>
      <p className="text-sm text-muted-foreground">每个section选一个，凑够4个section后开始。已做过的灰显但仍可选(重复练习)。</p>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={readingGap} onChange={(e) => setReadingGap(e.target.checked)} />
        section之间留30秒读题时间(严格机考模式下关闭则直接无停顿切换)
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {items === null && <p className="text-muted-foreground">加载中…</p>}

      {items !== null &&
        SECTIONS.map((sec) => {
          const candidates = grouped(sec)
          return (
            <Card key={sec}>
              <CardHeader>
                <CardTitle className="text-base">{sec}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {candidates.length === 0 && <p className="text-xs text-muted-foreground">暂无{sec}素材，导入题库后再来</p>}
                {candidates.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1 ${picked[sec] === c.id ? 'bg-primary/10' : ''} ${c.completed ? 'opacity-60' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`mock-${sec}`}
                      checked={picked[sec] === c.id}
                      onChange={() => setPicked((prev) => ({ ...prev, [sec]: c.id }))}
                    />
                    {c.title}
                    {c.completed && <Badge variant="secondary">已完成</Badge>}
                    {c.lastAccuracy !== null && <span className="text-xs text-muted-foreground">上次{c.lastAccuracy}%</span>}
                  </label>
                ))}
              </CardContent>
            </Card>
          )
        })}

      <Button onClick={start} disabled={!ready || selectedCount === 0}>
        开始模考({selectedCount}/4)
      </Button>
    </div>
  )
}
