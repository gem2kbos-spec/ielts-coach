import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, FileText, PenSquare, Sparkles, TimerReset } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'

export default function WritingMenu() {
  const [searchParams] = useSearchParams()
  const mockSession = searchParams.get('mockSession')
  const suffix = mockSession ? `?mockSession=${mockSession}` : ''

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 py-8 sm:px-6 lg:px-8">
      <MockSessionBanner />

      <div className="flex items-center justify-between lg:pr-44">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        {!mockSession && (
          <Link to="/writing/generate">
            <Button size="sm" className="rounded-full px-4">生成新题目</Button>
          </Link>
        )}
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 backdrop-blur">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
              <PenSquare className="h-3.5 w-3.5 text-primary" />
              IELTS Writing Practice
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">写作训练</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                生成题目、开始计时、正式作答、提交批改，再回看表达训练和历史记录。Task 1 与 Task 2 现在都按统一考试计时逻辑运行。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: TimerReset, label: '统一计时', desc: '点击 Start Timer 后才开始倒计时' },
                { icon: Sparkles, label: '按要求生成', desc: '题型、难度、主题都可自定义' },
                { icon: FileText, label: '表达沉淀', desc: '练习记录、复练与解析回看' },
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

          <div className="rounded-2xl border border-border/70 bg-background/48 p-5 backdrop-blur-xl">
            <div className="text-sm font-semibold">考试结构</div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-border/70 bg-card/55 p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Task 1</span>
                  <Badge variant="secondary">20 min</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">150 字起，图表/表格描述，权重 1。</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-card/55 p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Task 2</span>
                  <Badge variant="secondary">40 min</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">250 字起，议论文与讨论题，权重 2。</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className={`grid gap-4 ${mockSession ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        {[
          {
            to: `/writing/task1${suffix}`,
            title: 'Task 1',
            desc: '描述柱状图、折线图、饼图或表格数据，适合做短时节奏训练。',
            meta: ['20 分钟', '150 字起', '图表描述'],
          },
          {
            to: `/writing/task2${suffix}`,
            title: 'Task 2',
            desc: '议论文、双边讨论、利弊分析都走正式考试模式，支持超时继续写。',
            meta: ['40 分钟', '250 字起', '权重更高'],
          },
          ...(!mockSession
            ? [
                {
                  to: '/writing/expressions',
                  title: '表达训练',
                  desc: '词组练习、句子翻译、无尽练习、定量训练、历史复练放在同一入口。',
                  meta: ['短句表达', '练习记录', '再练一次'],
                },
              ]
            : []),
        ].map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="h-full border-border/70 bg-card/85 hover:border-primary/40">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription className="text-sm leading-7">{item.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {item.meta.map((tag) => (
                    <Badge key={tag} variant="outline" className="rounded-full">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
