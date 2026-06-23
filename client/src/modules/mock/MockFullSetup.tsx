import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { startMockSession, getPendingMockSession, cancelMockSession, type MockSession } from '@/lib/api'

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
    return <p className="p-8 text-muted-foreground">加载中…</p>
  }

  if (pending) {
    const startedAlready = new Date(pending.scheduled_at).getTime() <= Date.now()
    return (
      <div className="max-w-xl mx-auto p-8 space-y-4">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <h1 className="text-2xl font-semibold">完整模考</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {startedAlready ? '你有一个进行中的模考' : `已安排在 ${new Date(pending.scheduled_at).toLocaleString()} 开始`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {startedAlready
                ? '继续上次没做完的，或者取消重新开始一个新的。'
                : '到这个时间点之前，其他模块不会被锁定；到点之后回这个页面，会自动接上。'}
            </p>
            <div className="flex gap-2">
              {startedAlready && <Button onClick={() => navigate(`/mock/run/${pending.id}`)}>继续这个模考</Button>}
              <Button variant="outline" onClick={cancelPending}>
                取消{startedAlready ? '' : '这个安排'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-8 space-y-4">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>
      <h1 className="text-2xl font-semibold">完整模考</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">写作 → 口语 → 阅读 → 听力，依次进行</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>开始后会立刻锁定其他模块入口，按顺序解锁四关，每一关用的就是你平时单独练习的那个页面，不是另外做的一套：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>写作</strong>：Task1(图表描述)+Task2(议论文)都要做，按1:2权重合并成一个band，跟真实雅思算分方式一致；只做一篇也能继续，报告里会标"近似值"。</li>
            <li><strong>口语</strong>：完整流程Part1(热身)→Part2(话题卡)→Part3(考官追问)连续进行，结束后自动给一个综合band。</li>
            <li>
              <strong>阅读</strong>：这里要老实说一个简化——系统目前阅读模块是"自由练习单篇文章"，没有真题那种"3篇40题、统一60分钟"的整体形态。这一关是在阅读题库里自己选着做，做完几篇自己觉得够了就回来，band是按正确率粗略换算的估计值，不是精确值。
            </li>
            <li><strong>听力</strong>：用的是听力模块本来就有的"全真模拟(4 Sections)"，跟真题结构一致。</li>
          </ul>
          <p>每一关做完后，回到这个流程页面点"下一关"继续。某一关没有素材(比如还没导入阅读/听力题)可以直接跳过，最后报告里会标出"跳过"。</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2">
            <Button variant={scheduleMode === 'now' ? 'default' : 'outline'} size="sm" onClick={() => setScheduleMode('now')}>
              现在开始
            </Button>
            <Button variant={scheduleMode === 'later' ? 'default' : 'outline'} size="sm" onClick={() => setScheduleMode('later')}>
              安排到稍后
            </Button>
          </div>
          {scheduleMode === 'later' && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
            />
          )}
        </CardContent>
      </Card>

      <Button onClick={start} disabled={starting || (scheduleMode === 'later' && !scheduledAt)}>
        {starting ? '处理中…' : scheduleMode === 'later' ? '安排这个时间' : '开始完整模考'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
