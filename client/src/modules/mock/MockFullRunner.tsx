import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getMockSession, advanceMockSession, type MockSession, type MockStage } from '@/lib/api'

const STAGE_LABEL: Record<MockStage, string> = { writing: '写作', speaking: '口语', reading: '阅读', listening: '听力' }
const STAGE_ROUTE: Record<MockStage, string> = {
  writing: '/writing',
  speaking: '/speaking/full',
  reading: '/reading',
  listening: '/listening/mock',
}
const STAGE_HINT: Record<MockStage, string> = {
  writing: '真实雅思写作是Task1+Task2两篇按1:2权重算一个分，这一关请把两篇都做完再点"下一关"，只做一篇也能继续，但报告里会标成"近似值"。',
  speaking: '完整流程会连续走Part1(热身)→Part2(话题卡)→Part3(考官追问)，全部结束后自动生成一个综合分。',
  reading: '自由练习，做完几篇自己觉得够了就回来——这里没有真题那种统一计时的整卷形态。',
  listening: '会进入"全真模拟"组卷页，选4个section连续做完。',
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

  if (error) return <p className="p-8 text-destructive">{error}</p>
  if (!session) return <p className="p-8 text-muted-foreground">加载中…</p>

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
    <div className="max-w-xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-semibold">完整模考进行中</h1>

      <div className="flex gap-2">
        {stages.map((s, i) => (
          <Badge key={s} variant={i === currentStageIndex ? 'default' : i < currentStageIndex ? 'secondary' : 'outline'}>
            {i < currentStageIndex && '✓ '}
            {STAGE_LABEL[s]}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">当前第 {currentStageIndex + 1} 关：{STAGE_LABEL[currentStage]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{STAGE_HINT[currentStage]}</p>
          <p className="text-sm text-muted-foreground">完成后回到这个页面（页面里有"返回模考"链接，或者浏览器后退也行），点"下一关"。</p>
          <Link to={`${STAGE_ROUTE[currentStage]}?mockSession=${id}`}>
            <Button>进入{STAGE_LABEL[currentStage]}</Button>
          </Link>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={next} disabled={advancing}>
        {advancing ? '处理中…' : currentStageIndex + 1 < stages.length ? '下一关' : '完成模考'}
      </Button>
      <p className="text-xs text-muted-foreground">
        没做这一关也可以直接点上面的按钮跳过——系统是按"这一关开始之后有没有产生新的{STAGE_LABEL[currentStage]}记录"来判断的，没做就会被记成跳过。
      </p>

      {results.length > 0 && (
        <p className="text-xs text-muted-foreground">
          已完成：{results.map((r) => `${STAGE_LABEL[r.stage]}${r.attemptIds.length > 0 ? '' : '(跳过)'}`).join('、')}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
