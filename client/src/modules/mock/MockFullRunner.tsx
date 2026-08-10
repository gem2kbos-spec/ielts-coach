import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, CircleCheckBig, Flag, PlayCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getMockSession, advanceMockSession, type MockSession, type MockStage } from '@/lib/api'
import StatePanel from '@/components/StatePanel'

const STAGE_LABEL: Record<MockStage, string> = { writing: '写作', speaking: '口语', reading: '阅读', listening: '听力' }
const STAGE_ROUTE: Record<MockStage, string> = {
  writing: '/writing',
  speaking: '/speaking/full',
  reading: '/reading',
  listening: '/listening/mock',
}
const STAGE_HINT: Record<MockStage, string> = {
  writing: '真实雅思写作是 Task 1 + Task 2 两篇按 1:2 权重算一个分。这一关最好两篇都做完再回来推进。',
  speaking: '完整流程会连续走 Part 1、Part 2、Part 3，结束后自动生成一个综合分。',
  reading: '这里仍是自由练习模式，做完几篇自己觉得够了就回来。当前不是整卷 60 分钟统一计时。',
  listening: '会进入全真模拟组卷页，选 4 个 section 连续完成。',
}

export default function MockFullRunner() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<MockSession | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    if (!id) return
    getMockSession(id).then(setSession).catch((e) => setError(e.message))
  }

  useEffect(load, [id])

  useEffect(() => {
    if (session?.status === 'completed') navigate(`/mock/report/${id}`)
  }, [session, id, navigate])

  if (error) return <StatePanel title="模考流程暂时打不开" description={error} tone="error" backTo="/" backLabel="返回首页" />
  if (!session) return <StatePanel title="正在恢复模考进度" description="系统正在读取这场模考当前做到哪一关。" tone="loading" backTo="/" backLabel="返回首页" />

  const { stages, currentStageIndex, results } = session.progress
  const currentStage = stages[currentStageIndex]

  const next = async () => {
    if (!id) return
    setAdvancing(true)
    setError('')
    try {
      const updated = await advanceMockSession(id)
      setSession(updated)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <PlayCircle className="h-3.5 w-3.5 text-primary" />
              Full Mock In Progress
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">完整模考进行中</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                当前在第 {currentStageIndex + 1} 关。进入对应模块完成练习后，回到这里推进下一关；如果这一关不做，也可以直接跳过。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Flag, label: '当前关卡', value: STAGE_LABEL[currentStage], desc: `第 ${currentStageIndex + 1} / ${stages.length} 关` },
              { icon: CircleCheckBig, label: '已完成关卡', value: String(results.length), desc: results.length > 0 ? '已产生结果或已标记跳过' : '还没有完成的模块' },
              { icon: ArrowRight, label: '下一动作', value: currentStageIndex + 1 < stages.length ? '进入并完成' : '提交模考', desc: currentStageIndex + 1 < stages.length ? '做完这一关后回来继续' : '当前已经是最后一关' },
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

      <div className="grid gap-3 md:grid-cols-4">
        {stages.map((stage, index) => {
          const active = index === currentStageIndex
          const done = index < currentStageIndex
          return (
            <div
              key={stage}
              className={`rounded-2xl border p-4 text-sm transition-colors ${
                active
                  ? 'border-primary/45 bg-primary/10'
                  : done
                    ? 'border-border/70 bg-background/70'
                    : 'border-border/60 bg-background/45'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Stage {index + 1}</span>
                <Badge variant={active ? 'default' : done ? 'secondary' : 'outline'} className="rounded-full">
                  {done ? '完成' : active ? '当前' : '待做'}
                </Badge>
              </div>
              <div className="font-medium">{STAGE_LABEL[stage]}</div>
            </div>
          )
        })}
      </div>

      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <CardTitle className="text-base">当前第 {currentStageIndex + 1} 关：{STAGE_LABEL[currentStage]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-7 text-muted-foreground">{STAGE_HINT[currentStage]}</p>
          <p className="text-sm leading-7 text-muted-foreground">
            完成后回到这个页面，点“下一关”继续。没做这一关也可以直接点下面的按钮跳过，系统会记成跳过状态。
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to={`${STAGE_ROUTE[currentStage]}?mockSession=${id}`}>
              <Button className="rounded-2xl px-5">进入{STAGE_LABEL[currentStage]}</Button>
            </Link>
            <Button variant="outline" className="rounded-2xl px-5" onClick={next} disabled={advancing}>
              {advancing ? '处理中…' : currentStageIndex + 1 < stages.length ? '下一关' : '完成模考'}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-base">已完成记录</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {results.map((r) => (
              <Badge key={r.stage} variant="outline" className="rounded-full px-3 py-1.5">
                {STAGE_LABEL[r.stage]}{r.attemptIds.length > 0 ? '' : '（跳过）'}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
