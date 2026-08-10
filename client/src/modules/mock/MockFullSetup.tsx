import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, Layers3, PlayCircle, TimerReset } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { startMockSession, getPendingMockSession, cancelMockSession, type MockSession } from '@/lib/api'
import StatePanel from '@/components/StatePanel'

export default function MockFullSetup() {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<MockSession | null | undefined>(undefined)
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt] = useState('')

  useEffect(() => {
    getPendingMockSession().then(setPending).catch(() => setPending(null))
  }, [])

  const start = async () => {
    setStarting(true)
    setError('')
    try {
      const session = await startMockSession(scheduleMode === 'later' && scheduledAt ? new Date(scheduledAt).toISOString() : undefined)
      if (scheduleMode === 'later' && scheduledAt) {
        setPending(session)
      } else {
        navigate(`/mock/run/${session.id}`)
      }
    } catch (e) {
      const err = e as Error & { session?: MockSession }
      setError(err.message)
      if (err.session) setPending(err.session)
    } finally {
      setStarting(false)
    }
  }

  const cancelPending = async () => {
    if (!pending) return
    await cancelMockSession(pending.id)
    setPending(null)
  }

  if (pending === undefined) {
    return <StatePanel title="正在读取模考状态" description="系统正在检查你是否有未完成或已预约的完整模考。" tone="loading" backTo="/" backLabel="返回首页" />
  }

  if (pending) {
    const startedAlready = new Date(pending.scheduled_at).getTime() <= Date.now()
    return (
      <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">← 返回首页</Link>
        <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
                <PlayCircle className="h-3.5 w-3.5 text-primary" />
                Full Mock
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">完整模考</h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  {startedAlready ? '你有一个还没做完的模考，可以直接接着做。' : `你已经安排了一场模考，开始时间是 ${new Date(pending.scheduled_at).toLocaleString()}。`}
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              {[
                { icon: CalendarClock, label: '当前状态', value: startedAlready ? '进行中' : '已预约', desc: startedAlready ? '回到上次进度继续' : '到点后会回到这套流程' },
                { icon: TimerReset, label: '时间节点', value: new Date(pending.scheduled_at).toLocaleString(), desc: '这场模考绑定到这个会话时间' },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/75 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</div>
                    <div className="mt-3 text-lg font-semibold">{stat.value}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.desc}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardContent className="flex flex-wrap gap-3 p-6">
            {startedAlready && <Button className="rounded-2xl px-5" onClick={() => navigate(`/mock/run/${pending.id}`)}>继续这个模考</Button>}
            <Button variant="outline" className="rounded-2xl px-5" onClick={cancelPending}>
              取消{startedAlready ? '' : '这个安排'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">← 返回首页</Link>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <PlayCircle className="h-3.5 w-3.5 text-primary" />
              Full Mock
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">完整模考</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                写作、口语、阅读、听力按顺序连着做。这里更像一场完整演练，而不是单个模块的自由练习。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Layers3, label: '流程结构', value: '4 个模块', desc: '写作 → 口语 → 阅读 → 听力' },
              { icon: TimerReset, label: '开始方式', value: scheduleMode === 'later' ? '预约开始' : '立即开始', desc: '可以现在开做，也可以先排时间' },
              { icon: CalendarClock, label: '当前动作', value: starting ? '处理中' : '待启动', desc: starting ? '正在创建本次模考会话' : '准备好后直接进入第一关' },
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

      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <CardTitle className="text-base">流程说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>开始后会锁定其他模块入口，按顺序解锁四关。每一关用的仍然是平时单独练习的主页面，不会切到另一套陌生界面。</p>
          <ul className="space-y-2">
            <li><strong>写作：</strong>Task 1 和 Task 2 都要做，最终按真实雅思的 1:2 权重合并。</li>
            <li><strong>口语：</strong>完整走 Part 1 → Part 2 → Part 3，结束后给综合分。</li>
            <li><strong>阅读：</strong>当前仍是单篇阅读模式，所以这一关本质上是按你的阅读题库做若干篇，再回到模考流程继续。</li>
            <li><strong>听力：</strong>使用现有的 4 Section 全真模拟结构。</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/70 bg-card/85">
        <CardContent className="space-y-4 p-6">
          <div className="inline-flex rounded-2xl border border-border/70 bg-muted/40 p-1.5">
            <button
              onClick={() => setScheduleMode('now')}
              className={`rounded-xl px-4 py-2 text-sm transition-colors ${scheduleMode === 'now' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              现在开始
            </button>
            <button
              onClick={() => setScheduleMode('later')}
              className={`rounded-xl px-4 py-2 text-sm transition-colors ${scheduleMode === 'later' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              安排到稍后
            </button>
          </div>
          {scheduleMode === 'later' && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-11 rounded-2xl border border-border/70 bg-background/70 px-4 text-sm outline-none"
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button className="rounded-2xl px-5" onClick={start} disabled={starting || (scheduleMode === 'later' && !scheduledAt)}>
              {starting ? '处理中…' : scheduleMode === 'later' ? '安排这个时间' : '开始完整模考'}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
